const express = require('express');
const router = express.Router();
const tasksController = require('../controllers/tasks');

// Create a new task (Team Lead/Admin)
router.post('/', tasksController.createTask);

// Update task status (Employees/Team Lead/Admin)
router.patch('/:taskId/status', tasksController.updateTaskStatus);

// Get tasks for a project
router.get('/:projectId', tasksController.getTasks);

module.exports = router;
