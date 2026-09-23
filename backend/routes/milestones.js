const express = require('express');
const controller = require('../controllers/milestones');
const { validate } = require('../middleware/validate');
const { wrapController } = require('../utils/errors');
const schemas = require('../validation/schemas').milestones;

const c = wrapController(controller);
const router = express.Router();

router.post('/', validate(schemas.create), c.createMilestone);
router.get('/project/:projectId', c.getProjectMilestones);
router.get('/workspace/:workspaceId', c.getWorkspaceMilestones);
router.patch('/:id/status', validate(schemas.updateStatus), c.updateMilestoneStatus);
router.delete('/:id', c.deleteMilestone);
router.get('/:id/items', c.getMilestoneItems);
router.post('/:id/items', validate(schemas.linkItem), c.linkItem);

module.exports = router;
