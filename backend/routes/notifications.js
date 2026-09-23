const express = require('express');
const controller = require('../controllers/notifications');
const { wrapController } = require('../utils/errors');

const c = wrapController(controller);
const router = express.Router();

router.get('/:workspaceId', c.getNotifications);
router.patch('/:workspaceId/read-all', c.markAllAsRead);
router.patch('/:id/read', c.markAsRead);

module.exports = router;
