const express = require('express');
const controller = require('../controllers/notes');
const { validate } = require('../middleware/validate');
const { wrapController } = require('../utils/errors');
const schemas = require('../validation/schemas').notes;

const c = wrapController(controller);
const router = express.Router();

router.post('/', validate(schemas.create), c.createNote);
router.get('/project/:projectId', c.getProjectNotes);
router.get('/:id', c.getNoteById);
router.patch('/:id', validate(schemas.update), c.updateNote);
router.delete('/:id', c.deleteNote);
router.patch('/:id/status', validate(schemas.updateStatus), c.updateNoteStatus);
router.post('/:id/links', validate(schemas.link), c.linkNote);
router.get('/:id/versions', c.getNoteVersions);
router.get('/:id/versions/:versionId', c.getNoteVersion);
router.post('/:id/versions/:versionId/restore', c.restoreNoteVersion);
router.get('/:id/logs', c.getNoteEditLogs);

module.exports = router;
