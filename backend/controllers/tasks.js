const prisma = require('../utils/db');
const { requireProjectAccess, requireTaskAccess, isManager, publicUserSelect } = require('../utils/access');
const { badRequest, forbidden } = require('../utils/errors');
const { notify, workspaceManagerIds } = require('../utils/notify');

const PRIORITY_WEIGHT = { Critical: 4, High: 3, Medium: 2, Low: 1 };

const taskInclude = { assignees: { include: { user: { select: publicUserSelect } } } };

// Picks the project member with the lowest open workload (difficulty x priority of unfinished tasks).
async function leastLoadedMember(projectId) {
  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: {
        select: {
          id: true,
          tasks: { where: { task: { projectId, status: { not: 'Done' } } }, include: { task: true } },
        },
      },
    },
  });

  let best = null;
  let bestScore = Infinity;
  for (const member of members) {
    const score = member.user.tasks.reduce(
      (sum, a) => sum + (a.task.difficulty || 1) * (PRIORITY_WEIGHT[a.task.priority] || 2),
      0
    );
    if (score < bestScore) {
      bestScore = score;
      best = member.userId;
    }
  }
  return best;
}

// Any workspace member can be assigned; they're added to the project so they can see the task.
async function ensureAssignable(project, userId) {
  const inWorkspace = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId: project.workspaceId } },
  });
  if (!inWorkspace) throw badRequest('The assignee must be a member of this workspace.');
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: project.id, userId } },
    create: { projectId: project.id, userId },
    update: {},
  });
  return userId;
}

// Admins and Team Leads create tasks.
exports.createTask = async (req, res) => {
  const { projectId, name, description, priority, difficulty, dueDate, noteId, assigneeId } = req.body;
  const { project } = await requireProjectAccess(req.user.id, projectId, { managerOnly: true });

  if (noteId) {
    const note = await prisma.note.findUnique({ where: { id: noteId }, select: { projectId: true } });
    if (!note || note.projectId !== projectId) throw badRequest('That note does not belong to this project.');
  }

  let targetAssigneeId = null;
  if (assigneeId === 'auto') {
    targetAssigneeId = await leastLoadedMember(projectId);
  } else if (assigneeId) {
    targetAssigneeId = await ensureAssignable(project, assigneeId);
  }

  const task = await prisma.task.create({
    data: {
      name,
      description,
      priority: priority || 'Medium',
      difficulty: difficulty || 1,
      dueDate: dueDate ?? null,
      projectId,
      noteId: noteId || null,
      assignees: targetAssigneeId ? { create: { userId: targetAssigneeId } } : undefined,
    },
    include: taskInclude,
  });

  if (targetAssigneeId) {
    await notify([targetAssigneeId], {
      workspaceId: project.workspaceId,
      title: 'New task assigned',
      message: `You were assigned "${task.name}" in ${project.name}.`,
      link: '/tasks',
      excludeUserId: req.user.id,
    });
  }

  res.status(201).json(task);
};

// Assignees and managers can move a task between statuses.
exports.updateTaskStatus = async (req, res) => {
  const { task, project, role } = await requireTaskAccess(req.user.id, req.params.taskId);
  const isAssignee = task.assignees.some((a) => a.userId === req.user.id);
  if (!isManager(role) && !isAssignee) throw forbidden('Only the assignee or a Team Lead/Admin can update this task.');

  const { status } = req.body;
  const updated = await prisma.task.update({ where: { id: task.id }, data: { status }, include: taskInclude });

  if (status === 'Done' && task.status !== 'Done') {
    await notify([...(await workspaceManagerIds(project.workspaceId)), ...task.assignees.map((a) => a.userId)], {
      workspaceId: project.workspaceId,
      title: 'Task completed',
      message: `"${task.name}" in ${project.name} was marked as done by ${req.user.name || req.user.email}.`,
      link: '/tasks',
      excludeUserId: req.user.id,
    });
  }

  res.json(updated);
};

exports.getTasks = async (req, res) => {
  const { project } = await requireProjectAccess(req.user.id, req.params.projectId);
  const tasks = await prisma.task.findMany({ where: { projectId: project.id }, include: taskInclude, orderBy: { createdAt: 'asc' } });
  res.json(tasks);
};

// Managers edit a task's details and (re)assign it. `assigneeId: null` unassigns.
exports.updateTask = async (req, res) => {
  const { task, project } = await requireTaskAccess(req.user.id, req.params.taskId, { managerOnly: true });
  const { name, description, priority, difficulty, dueDate, assigneeId } = req.body;

  const data = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (priority !== undefined) data.priority = priority;
  if (difficulty !== undefined) data.difficulty = difficulty;
  if (dueDate !== undefined) {
    data.dueDate = dueDate;
    data.reminderSentAt = null; // a new due date deserves a new reminder
  }

  let newAssignee;
  if (assigneeId !== undefined) {
    newAssignee = assigneeId ? await ensureAssignable(project, assigneeId) : null;
    data.assignees = { deleteMany: {}, ...(newAssignee ? { create: { userId: newAssignee } } : {}) };
  }

  const updated = await prisma.task.update({ where: { id: task.id }, data, include: taskInclude });

  if (newAssignee && !task.assignees.some((a) => a.userId === newAssignee)) {
    await notify([newAssignee], {
      workspaceId: project.workspaceId,
      title: 'New task assigned',
      message: `You were assigned "${updated.name}" in ${project.name}.`,
      link: '/tasks',
      excludeUserId: req.user.id,
    });
  }
  res.json(updated);
};

exports.deleteTask = async (req, res) => {
  const { task } = await requireTaskAccess(req.user.id, req.params.taskId, { managerOnly: true });
  await prisma.task.delete({ where: { id: task.id } });
  res.status(204).end();
};
