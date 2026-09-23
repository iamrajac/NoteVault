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
    const member = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: assigneeId } } });
    if (!member) throw badRequest('The assignee must be a member of this project.');
    targetAssigneeId = assigneeId;
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
