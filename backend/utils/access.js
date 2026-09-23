// Authorization helpers. Every permission decision is made from the database, never from values the client sends.
const prisma = require('./db');
const { forbidden, notFound } = require('./errors');

const ROLES = ['Admin', 'Team Lead', 'Employee'];
const MANAGER_ROLES = ['Admin', 'Team Lead'];

// Fields that are safe to return for any user. Never include `password`.
const publicUserSelect = { id: true, name: true, email: true };

const isManager = (role) => MANAGER_ROLES.includes(role);

// Returns the caller's role in the workspace. Non-members get a 404 so workspace ids can't be probed.
async function requireWorkspaceMember(userId, workspaceId, allowedRoles = ROLES) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  if (!membership) throw notFound('Workspace not found');
  if (!allowedRoles.includes(membership.role)) throw forbidden();
  return membership.role;
}

// Managers can see every project in their workspace; employees only projects they were added to.
async function requireProjectAccess(userId, projectId, { managerOnly = false } = {}) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw notFound('Project not found');

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId: project.workspaceId } },
  });
  if (!membership) throw notFound('Project not found');

  if (!isManager(membership.role)) {
    if (managerOnly) throw forbidden('Only Admins and Team Leads can do that');
    const projectMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    if (!projectMember) throw notFound('Project not found');
  }

  return { project, role: membership.role };
}

async function requireNoteAccess(userId, noteId, options) {
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note) throw notFound('Note not found');
  const access = await requireProjectAccess(userId, note.projectId, options);
  return { note, ...access };
}

async function requireTaskAccess(userId, taskId, options) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { assignees: true } });
  if (!task) throw notFound('Task not found');
  const access = await requireProjectAccess(userId, task.projectId, options);
  return { task, ...access };
}

async function requireMilestoneAccess(userId, milestoneId, options) {
  const milestone = await prisma.milestone.findUnique({ where: { id: milestoneId } });
  if (!milestone) throw notFound('Milestone not found');
  const access = await requireProjectAccess(userId, milestone.projectId, options);
  return { milestone, ...access };
}

// Prisma `where` filter for projects the user may see inside a workspace.
function visibleProjectsWhere(userId, workspaceId, role) {
  return isManager(role) ? { workspaceId } : { workspaceId, members: { some: { userId } } };
}

module.exports = {
  ROLES,
  MANAGER_ROLES,
  publicUserSelect,
  isManager,
  requireWorkspaceMember,
  requireProjectAccess,
  requireNoteAccess,
  requireTaskAccess,
  requireMilestoneAccess,
  visibleProjectsWhere,
};
