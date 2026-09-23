const prisma = require('../utils/db');
const { requireWorkspaceMember } = require('../utils/access');
const { notFound } = require('../utils/errors');

exports.getNotifications = async (req, res) => {
  const { workspaceId } = req.params;
  await requireWorkspaceMember(req.user.id, workspaceId);

  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id, OR: [{ workspaceId }, { workspaceId: null }] },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
  res.json(notifications);
};

exports.markAsRead = async (req, res) => {
  // updateMany scoped to the caller, so nobody can mark someone else's notifications.
  const { count } = await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user.id },
    data: { isRead: true },
  });
  if (count === 0) throw notFound('Notification not found');
  res.json({ success: true });
};

exports.markAllAsRead = async (req, res) => {
  const { workspaceId } = req.params;
  await requireWorkspaceMember(req.user.id, workspaceId);
  await prisma.notification.updateMany({ where: { userId: req.user.id, workspaceId, isRead: false }, data: { isRead: true } });
  res.json({ success: true });
};
