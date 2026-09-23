const prisma = require('../utils/db');
const { requireProjectAccess, requireNoteAccess, isManager, publicUserSelect } = require('../utils/access');
const { badRequest, forbidden, notFound, conflict } = require('../utils/errors');
const { notify, workspaceManagerIds } = require('../utils/notify');
const collab = require('../realtime/collab');

const AUTO_TAGS = ['api', 'auth', 'schema', 'backend', 'frontend', 'bug', 'feature', 'deployment'];

// yState is internal collaborative-editing data; never send it to clients.
const noteFields = {
  id: true,
  title: true,
  content: true,
  status: true,
  tags: true,
  rejectionReason: true,
  projectId: true,
  authorId: true,
  approverId: true,
  milestoneId: true,
  createdAt: true,
  updatedAt: true,
};

const autoTags = (title, content) => {
  const text = `${title} ${content || ''}`.toLowerCase();
  return AUTO_TAGS.filter((t) => text.includes(t)).join(',');
};

// Creates the next version number for a note. Retries if two saves race for the same number.
async function createVersion(noteId, data) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const latest = await prisma.noteVersion.findFirst({ where: { noteId }, orderBy: { version: 'desc' } });
    try {
      return await prisma.noteVersion.create({ data: { noteId, version: (latest?.version || 0) + 1, ...data } });
    } catch (err) {
      if (err.code !== 'P2002') throw err;
    }
  }
  throw conflict('Could not save a new version because of concurrent edits. Please try again.');
}

const logEdit = (noteId, userId, action, details) =>
  prisma.noteEditLog.create({ data: { noteId, userId, action, details: details ? JSON.stringify(details) : null } });

exports.createNote = async (req, res) => {
  const { title, content = '', projectId } = req.body;
  await requireProjectAccess(req.user.id, projectId);

  const note = await prisma.note.create({
    data: { title, content, projectId, authorId: req.user.id, status: 'Draft', tags: autoTags(title, content) },
    select: noteFields,
  });
  res.status(201).json(note);
};

exports.getProjectNotes = async (req, res) => {
  const { project } = await requireProjectAccess(req.user.id, req.params.projectId);
  const notes = await prisma.note.findMany({
    where: { projectId: project.id },
    select: { ...noteFields, author: { select: publicUserSelect }, approver: { select: publicUserSelect } },
    orderBy: { updatedAt: 'desc' },
  });
  res.json(notes);
};

exports.getNoteById = async (req, res) => {
  await requireNoteAccess(req.user.id, req.params.id);
  const note = await prisma.note.findUnique({
    where: { id: req.params.id },
    select: {
      ...noteFields,
      author: { select: { id: true, name: true } },
      tasks: true,
      linksOut: { include: { target: { select: { id: true, title: true, projectId: true, status: true } } } },
    },
  });
  res.json(note);
};

// Status workflow:
//  - author or manager: Draft <-> Pending Review ("submit for approval" / "withdraw")
//  - managers only: Approved / Rejected
exports.updateNoteStatus = async (req, res) => {
  const { note, project, role } = await requireNoteAccess(req.user.id, req.params.id);
  const { status, rejectionReason } = req.body;
  const isAuthor = note.authorId === req.user.id;

  if (['Approved', 'Rejected'].includes(status)) {
    if (!isManager(role)) throw forbidden('Only Admins and Team Leads can approve or reject notes.');
    if (status === 'Rejected' && !rejectionReason) throw badRequest('A rejection reason is required.');
  } else if (!isAuthor && !isManager(role)) {
    throw forbidden('Only the author or a Team Lead/Admin can change this note’s status.');
  }

  if (status === 'Rejected') {
    // Keep a snapshot of exactly what was rejected.
    await createVersion(note.id, {
      title: note.title,
      tags: note.tags,
      content: note.content,
      rejectionReason,
      authorId: note.authorId,
    });
  }

  const updated = await prisma.note.update({
    where: { id: note.id },
    data: {
      status,
      approverId: status === 'Approved' ? req.user.id : status === 'Rejected' ? req.user.id : null,
      rejectionReason: status === 'Rejected' ? rejectionReason : null,
    },
    select: noteFields,
  });
  await logEdit(note.id, req.user.id, 'status_changed', { from: note.status, to: status, reason: rejectionReason || undefined });

  const link = `/notes/${note.id}`;
  if (status === 'Pending Review' && note.status !== 'Pending Review') {
    await notify(await workspaceManagerIds(project.workspaceId), {
      workspaceId: project.workspaceId,
      title: 'Note awaiting approval',
      message: `"${note.title}" in ${project.name} was submitted for review.`,
      link,
      excludeUserId: req.user.id,
    });
  } else if (status === 'Approved' || status === 'Rejected') {
    await notify([note.authorId], {
      workspaceId: project.workspaceId,
      title: status === 'Approved' ? 'Note approved' : 'Note rejected',
      message:
        status === 'Approved'
          ? `"${note.title}" was approved by ${req.user.name || req.user.email}.`
          : `"${note.title}" was rejected: ${rejectionReason}`,
      link,
      excludeUserId: req.user.id,
    });
  }

  res.json(updated);
};

// Manual save: updates title/tags/content and records a version snapshot of the content.
exports.updateNote = async (req, res) => {
  const { note } = await requireNoteAccess(req.user.id, req.params.id);
  const { title, content, tags, saveToVersion, versionNumber } = req.body;

  const data = {};
  if (title !== undefined) data.title = title;
  if (tags !== undefined) data.tags = tags;
  if (content !== undefined) data.content = content;

  if (content !== undefined) {
    const snapshot = {
      title: title ?? note.title,
      tags: tags ?? note.tags,
      content,
      authorId: req.user.id,
    };
    const latest = await prisma.noteVersion.findFirst({ where: { noteId: note.id }, orderBy: { version: 'desc' } });

    if (saveToVersion && versionNumber) {
      const existing = await prisma.noteVersion.findUnique({ where: { noteId_version: { noteId: note.id, version: versionNumber } } });
      if (!existing) throw notFound(`Version ${versionNumber} does not exist`);
      await prisma.noteVersion.update({ where: { id: existing.id }, data: snapshot });
    } else if (!latest || latest.content !== content || latest.title !== snapshot.title) {
      // Live edits are autosaved to the note continuously, so compare with the last version rather than the note.
      await createVersion(note.id, snapshot);
    }

    await logEdit(note.id, req.user.id, 'updated', { saveToVersion: Boolean(saveToVersion), versionNumber: versionNumber ?? undefined });
  }

  const updated = await prisma.note.update({ where: { id: note.id }, data, select: noteFields });
  if (content !== undefined) await collab.replaceContent(note.id, content);
  res.json(updated);
};

exports.linkNote = async (req, res) => {
  const { note, project } = await requireNoteAccess(req.user.id, req.params.id);
  const { targetId } = req.body;
  if (targetId === note.id) throw badRequest('A note cannot link to itself.');

  const { project: targetProject } = await requireNoteAccess(req.user.id, targetId);
  if (targetProject.workspaceId !== project.workspaceId) throw badRequest('Notes can only be linked within the same workspace.');

  try {
    const link = await prisma.noteLink.create({
      data: { sourceId: note.id, targetId },
      include: { target: { select: { id: true, title: true, projectId: true, status: true } } },
    });
    await logEdit(note.id, req.user.id, 'linked', { targetId });
    res.status(201).json(link);
  } catch (err) {
    if (err.code === 'P2002') throw conflict('These notes are already linked.');
    throw err;
  }
};

exports.getNoteVersions = async (req, res) => {
  const { note } = await requireNoteAccess(req.user.id, req.params.id);
  const versions = await prisma.noteVersion.findMany({
    where: { noteId: note.id },
    orderBy: { version: 'desc' },
    include: { author: { select: publicUserSelect } },
  });
  res.json(versions);
};

exports.getNoteVersion = async (req, res) => {
  const { note } = await requireNoteAccess(req.user.id, req.params.id);
  const version = await prisma.noteVersion.findFirst({
    where: { noteId: note.id, id: req.params.versionId },
    include: { author: { select: publicUserSelect } },
  });
  if (!version) throw notFound('Version not found');
  res.json(version);
};

exports.restoreNoteVersion = async (req, res) => {
  const { note } = await requireNoteAccess(req.user.id, req.params.id);
  const version = await prisma.noteVersion.findFirst({ where: { noteId: note.id, id: req.params.versionId } });
  if (!version) throw notFound('Version not found');

  // Snapshot the current state first so the restore can itself be undone.
  await createVersion(note.id, { title: note.title, tags: note.tags, content: note.content, authorId: req.user.id });

  const restored = await prisma.note.update({
    where: { id: note.id },
    data: {
      title: version.title ?? note.title,
      tags: version.tags ?? note.tags,
      content: version.content,
      status: 'Draft',
      rejectionReason: null,
      approverId: null,
    },
    select: noteFields,
  });
  await logEdit(note.id, req.user.id, 'restored', { restoredFromVersion: version.version });
  await collab.replaceContent(note.id, version.content);

  res.json(restored);
};

exports.getNoteEditLogs = async (req, res) => {
  const { note } = await requireNoteAccess(req.user.id, req.params.id);
  const logs = await prisma.noteEditLog.findMany({
    where: { noteId: note.id },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: publicUserSelect } },
  });
  res.json(logs);
};

// The author or a manager can delete a note. Anyone editing it live is told it's gone.
exports.deleteNote = async (req, res) => {
  const { note, role } = await requireNoteAccess(req.user.id, req.params.id);
  if (note.authorId !== req.user.id && !isManager(role)) {
    throw forbidden('Only the author or a Team Lead/Admin can delete this note.');
  }
  await prisma.note.delete({ where: { id: note.id } });
  collab.noteDeleted(note.id);
  res.status(204).end();
};
