// Hourly job: notify assignees about unfinished tasks due within the next 24 hours (once per task).
const cron = require('node-cron');
const prisma = require('../utils/db');
const { notify } = require('../utils/notify');

async function sendDueTaskReminders(now = new Date()) {
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tasks = await prisma.task.findMany({
    where: { status: { not: 'Done' }, dueDate: { gte: now, lte: soon }, reminderSentAt: null },
    include: { assignees: true, project: { select: { name: true, workspaceId: true } } },
  });

  for (const task of tasks) {
    await notify(
      task.assignees.map((a) => a.userId),
      {
        workspaceId: task.project.workspaceId,
        title: 'Task due soon',
        message: `"${task.name}" in ${task.project.name} is due ${task.dueDate.toUTCString()}.`,
        link: '/tasks',
      }
    );
    await prisma.task.update({ where: { id: task.id }, data: { reminderSentAt: now } });
  }
  return tasks.length;
}

function startReminderJob() {
  return cron.schedule('0 * * * *', () => {
    sendDueTaskReminders().catch((err) => console.error('[reminders] failed:', err.message));
  });
}

module.exports = { sendDueTaskReminders, startReminderJob };
