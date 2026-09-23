const prisma = require('./db');

// Creates in-app notifications. Failures are logged, never thrown, so they can't break the action that triggered them.
async function notify(userIds, { workspaceId, title, message, link, excludeUserId }) {
  const recipients = [...new Set(userIds)].filter((id) => id && id !== excludeUserId);
  if (recipients.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: recipients.map((userId) => ({ userId, workspaceId, title, message, link })),
    });
  } catch (err) {
    console.error('[notify] Failed to create notifications:', err.message);
  }
}

// User ids of the Admins and Team Leads of a workspace.
async function workspaceManagerIds(workspaceId) {
  const managers = await prisma.workspaceMember.findMany({
    where: { workspaceId, role: { in: ['Admin', 'Team Lead'] } },
    select: { userId: true },
  });
  return managers.map((m) => m.userId);
}

module.exports = { notify, workspaceManagerIds };
