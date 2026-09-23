// Real-time collaborative note editing.
//
// Each open note has one authoritative Yjs document on the server. Clients send Yjs updates (small binary diffs);
// Yjs merges concurrent edits without conflicts, so two people typing at once never overwrite each other.
// The merged text is saved to Note.content (plus the Yjs state in Note.yState) shortly after edits stop.
const Y = require('yjs');
const prisma = require('../utils/db');
const { userFromToken } = require('../middleware/auth');
const { requireNoteAccess } = require('../utils/access');

const SAVE_DEBOUNCE_MS = 2000;
const SAVE_MAX_WAIT_MS = 10000;
const TEXT_KEY = 'content';

let io = null;
const rooms = new Map(); // noteId -> { doc, loading, saveTimer, firstDirtyAt }

const roomName = (noteId) => `note:${noteId}`;

async function loadRoom(noteId) {
  let room = rooms.get(noteId);
  if (room) {
    await room.loading;
    return room;
  }

  const doc = new Y.Doc();
  room = { doc, saveTimer: null, firstDirtyAt: null, loading: null };
  rooms.set(noteId, room);

  room.loading = (async () => {
    const note = await prisma.note.findUnique({ where: { id: noteId }, select: { content: true, yState: true } });
    if (!note) throw new Error('Note not found');
    if (note.yState) {
      Y.applyUpdate(doc, new Uint8Array(note.yState), 'load');
      // Guard against yState drifting from content (e.g. content changed by a migration or manual DB edit).
      if (doc.getText(TEXT_KEY).toString() !== note.content) replaceText(doc, note.content, 'load');
    } else {
      doc.getText(TEXT_KEY).insert(0, note.content || '');
    }
  })();

  // Relay every change to everyone in the room except the client that sent it.
  doc.on('update', (update, origin) => {
    if (origin === 'load' || !io) return;
    const target = io.to(roomName(noteId));
    (typeof origin === 'string' && origin !== 'server' ? target.except(origin) : target).emit('note-update', { noteId, update });
    scheduleSave(noteId);
  });

  try {
    await room.loading;
  } catch (err) {
    rooms.delete(noteId);
    throw err;
  }
  return room;
}

function replaceText(doc, content, origin) {
  const text = doc.getText(TEXT_KEY);
  doc.transact(() => {
    text.delete(0, text.length);
    text.insert(0, content);
  }, origin);
}

function scheduleSave(noteId) {
  const room = rooms.get(noteId);
  if (!room) return;
  const now = Date.now();
  room.firstDirtyAt = room.firstDirtyAt ?? now;
  clearTimeout(room.saveTimer);
  const wait = Math.max(0, Math.min(SAVE_DEBOUNCE_MS, room.firstDirtyAt + SAVE_MAX_WAIT_MS - now));
  room.saveTimer = setTimeout(() => saveRoom(noteId).catch((e) => console.error('[collab] save failed:', e.message)), wait);
}

async function saveRoom(noteId) {
  const room = rooms.get(noteId);
  if (!room || room.firstDirtyAt === null) return;
  clearTimeout(room.saveTimer);
  room.saveTimer = null;
  room.firstDirtyAt = null;
  try {
    await prisma.note.update({
      where: { id: noteId },
      data: { content: room.doc.getText(TEXT_KEY).toString(), yState: Buffer.from(Y.encodeStateAsUpdate(room.doc)) },
    });
  } catch (err) {
    if (err.code === 'P2025') {
      // Note was deleted while open.
      closeRoom(noteId);
      return;
    }
    throw err;
  }
}

function closeRoom(noteId) {
  const room = rooms.get(noteId);
  if (!room) return;
  clearTimeout(room.saveTimer);
  room.doc.destroy();
  rooms.delete(noteId);
}

function emitActiveUsers(noteId) {
  const count = io.sockets.adapter.rooms.get(roomName(noteId))?.size || 0;
  io.to(roomName(noteId)).emit('active-users', count);
  return count;
}

async function leave(socket, noteId) {
  socket.leave(roomName(noteId));
  socket.data.notes.delete(noteId);
  if (emitActiveUsers(noteId) === 0) {
    await saveRoom(noteId).catch((e) => console.error('[collab] save on close failed:', e.message));
    closeRoom(noteId);
  }
}

// Called by the REST API when a note's content is replaced (manual save of different text, version restore).
async function replaceContent(noteId, content) {
  const room = rooms.get(noteId);
  if (room) {
    await room.loading;
    if (room.doc.getText(TEXT_KEY).toString() !== content) replaceText(room.doc, content, 'server');
    await saveRoom(noteId);
  } else {
    // Nobody has it open: drop the stale Yjs state so the next session starts from the new content.
    await prisma.note.update({ where: { id: noteId }, data: { yState: null } });
  }
}

function attach(server) {
  io = server;

  io.use(async (socket, next) => {
    try {
      const user = await userFromToken(socket.handshake.auth?.token);
      if (!user) return next(new Error('unauthorized'));
      socket.data.user = user;
      socket.data.notes = new Set();
      next();
    } catch (err) {
      next(err);
    }
  });

  io.on('connection', (socket) => {
    socket.on('join-note', async (noteId, ack = () => {}) => {
      try {
        if (typeof noteId !== 'string') throw new Error('Invalid note id');
        await requireNoteAccess(socket.data.user.id, noteId);
        const room = await loadRoom(noteId);
        socket.join(roomName(noteId));
        socket.data.notes.add(noteId);
        ack({ ok: true, state: Y.encodeStateAsUpdate(room.doc) });
        emitActiveUsers(noteId);
      } catch (err) {
        ack({ ok: false, error: err.status === 404 || err.message === 'Note not found' ? 'Note not found' : 'Could not open note' });
      }
    });

    socket.on('note-update', async ({ noteId, update } = {}) => {
      if (!socket.data.notes.has(noteId) || !update) return;
      const room = rooms.get(noteId);
      if (!room) return;
      try {
        Y.applyUpdate(room.doc, new Uint8Array(update), socket.id);
      } catch (err) {
        console.error('[collab] rejected malformed update:', err.message);
      }
    });

    socket.on('leave-note', (noteId) => {
      if (socket.data.notes.has(noteId)) leave(socket, noteId);
    });

    socket.on('disconnect', () => {
      for (const noteId of [...socket.data.notes]) leave(socket, noteId);
    });
  });
}

// Called after a note is deleted: tell everyone who has it open, then drop the in-memory document.
function noteDeleted(noteId) {
  if (io) {
    io.to(roomName(noteId)).emit('note-deleted', { noteId });
    io.in(roomName(noteId)).socketsLeave(roomName(noteId));
  }
  closeRoom(noteId);
}

// Save everything on shutdown.
async function flushAll() {
  await Promise.all([...rooms.keys()].map((id) => saveRoom(id).catch(() => {})));
}

module.exports = { attach, replaceContent, noteDeleted, flushAll };
