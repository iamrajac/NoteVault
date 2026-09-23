const express = require('express');
const controller = require('../controllers/projects');
const { validate } = require('../middleware/validate');
const { wrapController } = require('../utils/errors');
const schemas = require('../validation/schemas').projects;

const c = wrapController(controller);
const router = express.Router();

router.get('/:workspaceId', c.getWorkspaceProjects);
router.post('/', validate(schemas.create), c.createProject);
router.delete('/:projectId', c.deleteProject);
router.post('/:projectId/members', validate(schemas.addMember), c.addProjectMember);
router.post('/:projectId/invite-link', c.generateInviteLink);
router.post('/:projectId/invite-email', validate(schemas.inviteEmail), c.inviteByEmail);

module.exports = router;
