const prisma = require('../utils/db');

exports.pushNotification = async ({ userId, workspaceId, title, message, link }) => {
  try {
    await prisma.notification.create({
      data: { userId, workspaceId, title, message, link }
    });
  } catch(e) {
    console.error('Push Notification Error:', e);
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const { userId } = req.query; // assuming passed as query or decoded from JWT
    const { workspaceId } = req.params;

    if (!userId) return res.status(400).json({ error: "userId required" });

    const notifications = await prisma.notification.findMany({
      where: { userId, workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    res.json(notifications);
  } catch(e) {
    res.status(500).json({ error: "Server Error" });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: "Server Error" });
  }
};
