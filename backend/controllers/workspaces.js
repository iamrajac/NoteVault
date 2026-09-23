const prisma = require('../utils/db');
const { requireWorkspaceMember, visibleProjectsWhere, publicUserSelect } = require('../utils/access');
const { sessionUser } = require('./auth');
const { badRequest, notFound } = require('../utils/errors');
const { notify } = require('../utils/notify');

exports.createWorkspace = async (req, res) => {
  const workspace = await prisma.workspace.create({
    data: { name: req.body.name, colorTheme: 'blue', members: { create: { userId: req.user.id, role: 'Admin' } } },
  });
  res.status(201).json({ workspace, user: await sessionUser(req.user.id) });
};

exports.deleteWorkspace = async (req, res) => {
  await requireWorkspaceMember(req.user.id, req.params.workspaceId, ['Admin']);
  await prisma.workspace.delete({ where: { id: req.params.workspaceId } });
  res.json({ user: await sessionUser(req.user.id) });
};

exports.updateWorkspace = async (req, res) => {
  const { workspaceId } = req.params;
  await requireWorkspaceMember(req.user.id, workspaceId, ['Admin']);
  const updated = await prisma.workspace.update({ where: { id: workspaceId }, data: { name: req.body.name } });
  res.json(updated);
};

exports.getWorkspaceMembers = async (req, res) => {
  const { workspaceId } = req.params;
  await requireWorkspaceMember(req.user.id, workspaceId);
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: publicUserSelect } },
  });
  res.json(members);
};

// Random starting positions; the graph page lays nodes out from there.
const jitter = (center) => center + (Math.random() * 400 - 200);

exports.getKnowledgeGraph = async (req, res) => {
  const { workspaceId } = req.params;
  const role = await requireWorkspaceMember(req.user.id, workspaceId);
  const projectWhere = visibleProjectsWhere(req.user.id, workspaceId, role);

  const [projects, notes, tasks] = await Promise.all([
    prisma.project.findMany({ where: projectWhere, select: { id: true, name: true } }),
    prisma.note.findMany({ where: { project: projectWhere }, select: { id: true, title: true, projectId: true } }),
    prisma.task.findMany({ where: { project: projectWhere }, select: { id: true, name: true, projectId: true } }),
  ]);

  const noteIds = new Set(notes.map((n) => n.id));
  const noteLinks = await prisma.noteLink.findMany({ where: { sourceId: { in: [...noteIds] } } });

  const nodes = [
    ...projects.map((p) => ({ id: `proj_${p.id}`, group: 'project', label: p.name, x: jitter(400), y: jitter(300), color: '#3B82F6' })),
    ...notes.map((n) => ({ id: `note_${n.id}`, group: 'note', label: n.title, x: jitter(400), y: jitter(300), color: '#10B981' })),
    ...tasks.map((t) => ({ id: `task_${t.id}`, group: 'task', label: t.name, x: jitter(400), y: jitter(300), color: '#F59E0B' })),
  ];
  const links = [
    ...notes.map((n) => ({ source: `proj_${n.projectId}`, target: `note_${n.id}` })),
    ...noteLinks.filter((l) => noteIds.has(l.targetId)).map((l) => ({ source: `note_${l.sourceId}`, target: `note_${l.targetId}` })),
    ...tasks.map((t) => ({ source: `proj_${t.projectId}`, target: `task_${t.id}` })),
  ];

  res.json({ nodes, links });
};

exports.getChangelog = async (req, res) => {
  const { workspaceId } = req.params;
  const role = await requireWorkspaceMember(req.user.id, workspaceId);
  const projectWhere = visibleProjectsWhere(req.user.id, workspaceId, role);

  const [notes, tasks, annotations] = await Promise.all([
    prisma.note.findMany({
      where: { project: projectWhere },
      select: { id: true, title: true, status: true, updatedAt: true, author: { select: { name: true } }, project: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 15,
    }),
    prisma.task.findMany({
      where: { project: projectWhere },
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true,
        project: { select: { name: true } },
        assignees: { select: { user: { select: { name: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 15,
    }),
    prisma.changelogAnnotation.findMany({ where: { workspaceId }, orderBy: { createdAt: 'asc' } }),
  ]);

  const events = [
    ...notes.map((n) => {
      const author = n.author?.name || 'Workspace Member';
      return {
        id: `note-${n.id}`,
        type: 'Document',
        title: n.title,
        action: n.status === 'Approved' ? 'approved the document' : n.status === 'Draft' ? 'drafted the document' : 'updated the document',
        project: n.project.name,
        author,
        authorImage: author.charAt(0),
        date: n.updatedAt.toISOString(),
        timestamp: n.updatedAt.getTime(),
      };
    }),
    ...tasks.map((t) => {
      const author = t.assignees[0]?.user.name || 'Workspace Member';
      return {
        id: `task-${t.id}`,
        type: 'Task',
        title: t.name,
        action: t.status === 'Done' ? 'completed the task' : `moved task to ${t.status}`,
        project: t.project.name,
        author,
        authorImage: author.charAt(0),
        date: t.updatedAt.toISOString(),
        timestamp: t.updatedAt.getTime(),
      };
    }),
  ].sort((a, b) => b.timestamp - a.timestamp);

  res.json(events.slice(0, 30).map((e) => ({ ...e, annotations: annotations.filter((a) => a.targetId === e.id) })));
};

exports.addChangelogAnnotation = async (req, res) => {
  const { workspaceId } = req.params;
  await requireWorkspaceMember(req.user.id, workspaceId);
  const { targetId, text } = req.body;
  const annotation = await prisma.changelogAnnotation.create({
    data: { targetId, workspaceId, text, authorId: req.user.id, authorName: req.user.name || req.user.email },
  });
  res.status(201).json(annotation);
};

exports.globalSearch = async (req, res) => {
  const { workspaceId } = req.params;
  const role = await requireWorkspaceMember(req.user.id, workspaceId);
  const q = req.validatedQuery.q;
  if (!q) return res.json({ notes: [], tasks: [], milestones: [] });

  const project = visibleProjectsWhere(req.user.id, workspaceId, role);
  const [notes, tasks, milestones] = await Promise.all([
    prisma.note.findMany({
      where: { project, OR: [{ title: { contains: q } }, { content: { contains: q } }, { tags: { contains: q } }] },
      select: { id: true, title: true, status: true, tags: true, projectId: true },
      take: 10,
    }),
    prisma.task.findMany({ where: { project, OR: [{ name: { contains: q } }, { description: { contains: q } }] }, take: 10 }),
    prisma.milestone.findMany({ where: { project, OR: [{ name: { contains: q } }, { description: { contains: q } }] }, take: 10 }),
  ]);

  res.json({ notes, tasks, milestones });
};

async function findMember(workspaceId, userId) {
  const member = await prisma.workspaceMember.findUnique({ where: { userId_workspaceId: { userId, workspaceId } } });
  if (!member) throw notFound('That person is not a member of this workspace.');
  return member;
}

// A workspace must always keep at least one Admin.
async function assertNotLastAdmin(workspaceId, member, message) {
  if (member.role !== 'Admin') return;
  const admins = await prisma.workspaceMember.count({ where: { workspaceId, role: 'Admin' } });
  if (admins <= 1) throw badRequest(message);
}

exports.updateMemberRole = async (req, res) => {
  const { workspaceId, userId } = req.params;
  await requireWorkspaceMember(req.user.id, workspaceId, ['Admin']);
  const member = await findMember(workspaceId, userId);
  const { role } = req.body;

  if (role !== 'Admin') await assertNotLastAdmin(workspaceId, member, 'A workspace needs at least one Admin. Make someone else Admin first.');
  const updated = await prisma.workspaceMember.update({
    where: { id: member.id },
    data: { role },
    include: { user: { select: publicUserSelect } },
  });

  if (member.role !== role) {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } });
    await notify([userId], {
      workspaceId,
      title: 'Your role changed',
      message: `You are now ${role} in ${workspace.name}.`,
      link: '/dashboard',
      excludeUserId: req.user.id,
    });
  }
  res.json(updated);
};

// Admins remove anyone; any member can remove themselves (leave).
exports.removeMember = async (req, res) => {
  const { workspaceId, userId } = req.params;
  const leaving = userId === req.user.id;
  await requireWorkspaceMember(req.user.id, workspaceId, leaving ? undefined : ['Admin']);
  const member = await findMember(workspaceId, userId);
  await assertNotLastAdmin(
    workspaceId,
    member,
    leaving ? 'You are the only Admin. Make someone else Admin before leaving, or delete the workspace.' : 'You cannot remove the only Admin.'
  );

  // Also drop their project memberships and task assignments in this workspace.
  await prisma.$transaction([
    prisma.taskAssignee.deleteMany({ where: { userId, task: { project: { workspaceId } } } }),
    prisma.projectMember.deleteMany({ where: { userId, project: { workspaceId } } }),
    prisma.workspaceMember.delete({ where: { id: member.id } }),
  ]);

  res.json(leaving ? { user: await sessionUser(req.user.id) } : { success: true });
};
