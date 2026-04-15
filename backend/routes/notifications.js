const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notifications');

router.get('/:workspaceId', notificationController.getNotifications);
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;
