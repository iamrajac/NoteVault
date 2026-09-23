const express = require('express');
const controller = require('../controllers/workspaces');
const { validate } = require('../middleware/validate');
const { wrapController } = require('../utils/errors');
const schemas = require('../validation/schemas').workspaces;

const c = wrapController(controller);
const router = express.Router();

router.post('/', validate(schemas.create), c.createWorkspace);
router.patch('/:workspaceId', validate(schemas.update), c.updateWorkspace);
router.delete('/:workspaceId', c.deleteWorkspace);
router.get('/:workspaceId/members', c.getWorkspaceMembers);
router.patch('/:workspaceId/members/:userId', validate(schemas.memberRole), c.updateMemberRole);
router.delete('/:workspaceId/members/:userId', c.removeMember);
router.get('/:workspaceId/graph', c.getKnowledgeGraph);
router.get('/:workspaceId/changelog', c.getChangelog);
router.post('/:workspaceId/changelog/annotations', validate(schemas.annotation), c.addChangelogAnnotation);
router.get('/:workspaceId/search', validate(schemas.search, 'query'), c.globalSearch);

module.exports = router;
