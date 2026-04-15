const express = require('express');
const router = express.Router();
const workspacesController = require('../controllers/workspaces');

// Get members for a specific workspace
router.get('/:workspaceId/members', workspacesController.getWorkspaceMembers);
router.get('/:workspaceId/graph', workspacesController.getKnowledgeGraph);
router.get('/:workspaceId/changelog', workspacesController.getChangelog);
router.post('/:workspaceId/changelog/annotations', workspacesController.addChangelogAnnotation);
router.patch('/:workspaceId', workspacesController.updateWorkspace);
router.get('/:workspaceId/search', workspacesController.globalSearch);

module.exports = router;
