const express = require('express');
const controller = require('../controllers/tasks');
const { validate } = require('../middleware/validate');
const { wrapController } = require('../utils/errors');
const schemas = require('../validation/schemas').tasks;

const c = wrapController(controller);
const router = express.Router();

router.post('/', validate(schemas.create), c.createTask);
router.patch('/:taskId/status', validate(schemas.updateStatus), c.updateTaskStatus);
router.get('/:projectId', c.getTasks);

module.exports = router;
