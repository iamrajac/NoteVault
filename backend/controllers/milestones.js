const prisma = require('../utils/db');
const {
  requireProjectAccess,
  requireMilestoneAccess,
  requireWorkspaceMember,
  visibleProjectsWhere,
} = require('../utils/access');
const { badRequest, notFound } = require('../utils/errors');

exports.createMilestone = async (req, res) => {
  const { name, description, dueDate, projectId } = req.body;
  await requireProjectAccess(req.user.id, projectId, { managerOnly: true });

  const milestone = await prisma.milestone.create({
    data: { name, description, dueDate: dueDate ?? null, projectId, status: 'Active' },
  });
  res.status(201).json(milestone);
};

exports.getProjectMilestones = async (req, res) => {
  const { project } = await requireProjectAccess(req.user.id, req.params.projectId);
  const milestones = await prisma.milestone.findMany({ where: { projectId: project.id }, orderBy: { dueDate: 'asc' } });
  res.json(milestones);
};

exports.getWorkspaceMilestones = async (req, res) => {
  const { workspaceId } = req.params;
  const role = await requireWorkspaceMember(req.user.id, workspaceId);

  const milestones = await prisma.milestone.findMany({
    where: { project: visibleProjectsWhere(req.user.id, workspaceId, role) },
    include: {
      project: { select: { name: true } },
      tasks: true,
      notes: { select: { id: true, title: true, status: true, projectId: true } },
    },
    orderBy: { dueDate: 'asc' },
  });
  res.json(milestones);
};

exports.updateMilestoneStatus = async (req, res) => {
  const { milestone } = await requireMilestoneAccess(req.user.id, req.params.id, { managerOnly: true });
  const updated = await prisma.milestone.update({ where: { id: milestone.id }, data: { status: req.body.status } });
  res.json(updated);
};

exports.getMilestoneItems = async (req, res) => {
  const { milestone } = await requireMilestoneAccess(req.user.id, req.params.id);
  const [tasks, notes] = await Promise.all([
    prisma.task.findMany({ where: { milestoneId: milestone.id } }),
    prisma.note.findMany({ where: { milestoneId: milestone.id }, select: { id: true, title: true, status: true, projectId: true } }),
  ]);
  res.json({ tasks, notes });
};

// Attach a task or note to a milestone. Both must be in the same project.
exports.linkItem = async (req, res) => {
  const { milestone } = await requireMilestoneAccess(req.user.id, req.params.id, { managerOnly: true });
  const { targetId, targetType } = req.body;

  const model = targetType === 'task' ? prisma.task : prisma.note;
  const item = await model.findUnique({ where: { id: targetId }, select: { projectId: true } });
  if (!item) throw notFound(`${targetType === 'task' ? 'Task' : 'Note'} not found`);
  if (item.projectId !== milestone.projectId) throw badRequest('Only items from the same project can be linked to this milestone.');

  await model.update({ where: { id: targetId }, data: { milestoneId: milestone.id } });
  res.json({ success: true });
};
