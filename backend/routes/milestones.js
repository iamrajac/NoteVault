const express = require('express');
const router = express.Router();
const milestonesController = require('../controllers/milestones');

router.post('/', milestonesController.createMilestone);
router.get('/project/:projectId', milestonesController.getProjectMilestones);
router.get('/workspace/:workspaceId', milestonesController.getWorkspaceMilestones);
router.patch('/:id/status', milestonesController.updateMilestoneStatus);

router.get('/:id/items', milestonesController.getMilestoneItems);
router.post('/:id/items', milestonesController.linkItem);

module.exports = router;
