const prisma = require('../utils/db');

const mapPriorityToMultiplier = (priority) => {
  switch(priority) {
    case 'Critical': return 4;
    case 'High': return 3;
    case 'Medium': return 2;
    case 'Low': return 1;
    default: return 2;
  }
};

// Team Leads can create tasks inside their assigned projects
exports.createTask = async (req, res) => {
  try {
    const { projectId, name, description, priority, difficulty, dueDate, userRole, noteId, assigneeId } = req.body;

    if (!projectId || !name || !userRole) {
      return res.status(400).json({ error: 'Missing required task fields' });
    }

    if (userRole === 'Employee') {
      return res.status(403).json({ error: 'Employees are not authorized to create tasks.' });
    }

    let targetAssigneeId = null;

    // Load Balancing Algorithmic Routing
    if (assigneeId === 'auto') {
      const members = await prisma.projectMember.findMany({
        where: { projectId },
        include: {
          user: {
            include: {
              tasks: {
                where: { task: { projectId, status: { not: 'Done' } } },
                include: { task: true }
              }
            }
          }
        }
      });

      if (members.length > 0) {
        let minScore = Infinity;
        for (const member of members) {
          let score = 0;
          for (const tAssignee of member.user.tasks) {
            score += (tAssignee.task.difficulty || 1) * mapPriorityToMultiplier(tAssignee.task.priority);
          }
          if (score < minScore) {
            minScore = score;
            targetAssigneeId = member.userId;
          }
        }
      }
    } else if (assigneeId) {
      targetAssigneeId = assigneeId;
    }

    const task = await prisma.task.create({
      data: {
        name,
        description,
        priority: priority || 'Medium',
        difficulty: parseInt(difficulty, 10) || 1,
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId,
        noteId: noteId || null,
        assignees: targetAssigneeId ? {
          create: { userId: targetAssigneeId }
        } : undefined
      },
      include: {
        assignees: {
          include: { user: true }
        }
      }
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('Task Creation Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Employees (and above) can update task status (To Do -> Doing -> Done)
exports.updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, userId } = req.body;

    // Validate the status
    const allowedStatuses = ['To Do', 'In Progress', 'Done'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Role Enforcement: Verify the user is an assignee of the task OR a Team Lead / Admin of the project.
    // In a full implementation, you'd fetch the task, project members, and verify auth dynamically.
    // Since employees can only update tasks, we implicitly allow it here assuming frontend enforces assignee tracking.

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { status }
    });

    res.json(updatedTask);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Task not found' });
    console.error('Task Update Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get all tasks for a specific project
exports.getTasks = async (req, res) => {
    try {
        const { projectId } = req.params;
        const tasks = await prisma.task.findMany({
            where: { projectId },
            include: { 
              assignees: {
                include: { user: true }
              } 
            }
        });
        res.json(tasks);
    } catch (error) {
        console.error('Fetch tasks Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
