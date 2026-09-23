const http = require('http');
const { Server } = require('socket.io');
const config = require('./config');
const app = require('./app');
const prisma = require('./utils/db');
const collab = require('./realtime/collab');
const { startReminderJob } = require('./jobs/reminders');

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: config.corsOrigins },
  maxHttpBufferSize: 2e6,
});
collab.attach(io);

const reminderJob = config.enableCron ? startReminderJob() : null;

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${config.port} is already in use. Stop the other process or set a different PORT in .env.`);
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
});

server.listen(config.port, () => {
  console.log(`NoteVault API listening on port ${config.port} (allowed origins: ${config.corsOrigins.join(', ')})`);
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down...`);
  const forceExit = setTimeout(() => process.exit(1), 10000);
  forceExit.unref();

  reminderJob?.stop();
  await collab.flushAll();
  // Closes all sockets and the underlying HTTP server.
  io.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => console.error('Unhandled promise rejection:', reason));
