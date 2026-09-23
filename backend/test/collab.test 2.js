const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const Y = require('yjs');
const { io: connect } = require('socket.io-client');
const { setupTestApp } = require('./helpers');

let api;
let teardown;
let server;
let url;

before(async () => {
  ({ api, teardown } = await setupTestApp());
  const { Server } = require('socket.io');
  const collab = require('../realtime/collab');
  server = http.createServer(api.app);
  collab.attach(new Server(server));
  await new Promise((resolve) => server.listen(0, resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await teardown();
});

const waitFor = async (check, timeout = 5000) => {
  const start = Date.now();
  while (!(await check())) {
    if (Date.now() - start > timeout) throw new Error('timed out waiting for condition');
    await new Promise((r) => setTimeout(r, 50));
  }
};

// A minimal client that mirrors what the note editor page does.
async function openNote(token, noteId) {
  const socket = connect(url, { auth: { token }, transports: ['websocket'], forceNew: true });
  const doc = new Y.Doc();
  doc.on('update', (update, origin) => {
    if (origin !== 'remote') socket.emit('note-update', { noteId, update });
  });
  socket.on('note-update', ({ update }) => Y.applyUpdate(doc, new Uint8Array(update), 'remote'));
  const ack = await new Promise((resolve, reject) => {
    socket.on('connect_error', reject);
    socket.on('connect', () => socket.emit('join-note', noteId, resolve));
  });
  if (ack.ok) Y.applyUpdate(doc, new Uint8Array(ack.state), 'remote');
  return { socket, doc, ack, text: () => doc.getText('content').toString() };
}

test('concurrent edits from two users merge without losing text and are saved', async () => {
  const owner = await api.register('collab-owner');
  const project = (await owner.post('/api/projects').send({ name: 'Live', workspaceId: owner.workspaceId })).body;
  const note = (await owner.post('/api/notes').send({ title: 'Shared', content: 'Hello world', projectId: project.id })).body;

  const { token } = (await owner.post(`/api/projects/${project.id}/invite-link`)).body;
  const teammate = await api.register('collab-teammate');
  await teammate.post('/api/auth/accept-invite').send({ token }).expect(200);

  const a = await openNote(owner.token, note.id);
  const b = await openNote(teammate.token, note.id);
  assert.equal(a.text(), 'Hello world');
  assert.equal(b.text(), 'Hello world');

  // Both type at the same moment: A at the start, B at the end.
  a.doc.getText('content').insert(0, 'AAA ');
  b.doc.getText('content').insert(b.text().length, ' BBB');

  await waitFor(() => a.text() === b.text() && a.text().includes('AAA') && a.text().includes('BBB'));
  assert.equal(a.text(), 'AAA Hello world BBB');

  a.socket.disconnect();
  b.socket.disconnect();
  await waitFor(async () => (await api.prisma.note.findUnique({ where: { id: note.id } })).content === 'AAA Hello world BBB');

  // Reopening restores the merged state.
  const c = await openNote(owner.token, note.id);
  assert.equal(c.text(), 'AAA Hello world BBB');
  c.socket.disconnect();
});

test('restoring a version updates people who have the note open', async () => {
  const owner = await api.register('collab-restore');
  const project = (await owner.post('/api/projects').send({ name: 'R', workspaceId: owner.workspaceId })).body;
  const note = (await owner.post('/api/notes').send({ title: 'N', content: 'first', projectId: project.id })).body;
  await owner.patch(`/api/notes/${note.id}`).send({ content: 'first' }).expect(200);
  const [v1] = (await owner.get(`/api/notes/${note.id}/versions`)).body;

  const a = await openNote(owner.token, note.id);
  a.doc.getText('content').insert(5, ' edited');
  await waitFor(async () => (await api.prisma.note.findUnique({ where: { id: note.id } })).content === 'first edited');

  await owner.post(`/api/notes/${note.id}/versions/${v1.id}/restore`).expect(200);
  await waitFor(() => a.text() === 'first');
  a.socket.disconnect();
});

test('sockets need a valid token and access to the note', async () => {
  const owner = await api.register('collab-private');
  const outsider = await api.register('collab-outsider');
  const project = (await owner.post('/api/projects').send({ name: 'P', workspaceId: owner.workspaceId })).body;
  const note = (await owner.post('/api/notes').send({ title: 'Private', content: 'secret', projectId: project.id })).body;

  await assert.rejects(openNote('bad-token', note.id), /unauthorized/);

  const spy = await openNote(outsider.token, note.id);
  assert.equal(spy.ack.ok, false);
  assert.equal(spy.text(), '');
  spy.socket.emit('note-update', { noteId: note.id, update: Y.encodeStateAsUpdate(new Y.Doc()) });
  spy.socket.disconnect();

  assert.equal((await api.prisma.note.findUnique({ where: { id: note.id } })).content, 'secret');
});
