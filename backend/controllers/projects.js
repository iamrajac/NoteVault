const prisma = require('../utils/db');
const { requireWorkspaceMember, requireProjectAccess, visibleProjectsWhere, MANAGER_ROLES, publicUserSelect } = require('../utils/access');
const { badRequest, conflict, notFound } = require('../utils/errors');
const { createInvitation, sendInviteEmail } = require('./auth');
const { notify } = require('../utils/notify');

const withCounts = { _count: { select: { tasks: true, members: true } } };

// Admins and Team Leads create projects; the creator becomes a member.
exports.createProject = async (req, res) => {
  const { name, description, workspaceId } = req.body;
  await requireWorkspaceMember(req.user.id, workspaceId, MANAGER_ROLES);

  const project = await prisma.project.create({
    data: { name, description, workspaceId, createdById: req.user.id, members: { create: { userId: req.user.id } } },
    include: withCounts,
  });
  res.status(201).json(project);
};

// Managers see every project in the workspace; employees only the ones they were added to.
exports.getWorkspaceProjects = async (req, res) => {
  const { workspaceId } = req.params;
  const role = await requireWorkspaceMember(req.user.id, workspaceId);

  const projects = await prisma.project.findMany({
    where: visibleProjectsWhere(req.user.id, workspaceId, role),
    include: withCounts,
    orderBy: { createdAt: 'asc' },
  });
  res.json(projects);
};

exports.deleteProject = async (req, res) => {
  const { project } = await requireProjectAccess(req.user.id, req.params.projectId, { managerOnly: true });
  await prisma.project.delete({ where: { id: project.id } });
  res.status(204).end();
};

// Add an existing workspace member to a project.
exports.addProjectMember = async (req, res) => {
  const { project } = await requireProjectAccess(req.user.id, req.params.projectId, { managerOnly: true });
  const { targetUserId } = req.body;

  const inWorkspace = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: targetUserId, workspaceId: project.workspaceId } },
  });
  if (!inWorkspace) throw badRequest('That user is not a member of this workspace. Invite them first.');

  try {
    const member = await prisma.projectMember.create({ data: { projectId: project.id, userId: targetUserId } });
    await notify([targetUserId], {
      workspaceId: project.workspaceId,
      title: 'Added to a project',
      message: `You were added to the project "${project.name}".`,
      link: '/projects',
      excludeUserId: req.user.id,
    });
    res.status(201).json(member);
  } catch (error) {
    if (error.code === 'P2002') throw conflict('User is already a member of this project.');
    throw error;
  }
};

// Shareable invite link: anyone with it can join the project as an Employee until it expires.
exports.generateInviteLink = async (req, res) => {
  const { project } = await requireProjectAccess(req.user.id, req.params.projectId, { managerOnly: true });
  const { token, link } = await createInvitation({
    workspaceId: project.workspaceId,
    projectId: project.id,
    invitedById: req.user.id,
  });
  res.json({ token, link });
};

exports.inviteByEmail = async (req, res) => {
  const { project } = await requireProjectAccess(req.user.id, req.params.projectId, { managerOnly: true });
  const { email } = req.body;

  const workspace = await prisma.workspace.findUnique({ where: { id: project.workspaceId } });
  const { link } = await createInvitation({
    workspaceId: project.workspaceId,
    projectId: project.id,
    email,
    invitedById: req.user.id,
  });
  const sent = await sendInviteEmail({
    to: email,
    link,
    inviterName: req.user.name || req.user.email,
    workspaceName: workspace.name,
    projectName: project.name,
  });

  res.json({ message: sent ? 'Invitation email sent.' : 'Invitation created, but the email could not be sent.', link, emailSent: sent });
};

exports.getProjectMembers = async (req, res) => {
  const { project } = await requireProjectAccess(req.user.id, req.params.projectId);
  const members = await prisma.projectMember.findMany({
    where: { projectId: project.id },
    include: { user: { select: publicUserSelect } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(members);
};

// Managers remove someone from a project; their tasks in it become unassigned.
exports.removeProjectMember = async (req, res) => {
  const { project } = await requireProjectAccess(req.user.id, req.params.projectId, { managerOnly: true });
  const { userId } = req.params;
  const { count } = await prisma.projectMember.deleteMany({ where: { projectId: project.id, userId } });
  if (count === 0) throw notFound('That person is not a member of this project.');
  await prisma.taskAssignee.deleteMany({ where: { userId, task: { projectId: project.id } } });
  res.status(204).end();
};
