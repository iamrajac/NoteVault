const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const prisma = require('./utils/db');
const { requireAuth } = require('./middleware/auth');
const { HttpError } = require('./utils/errors');

const app = express();

app.disable('x-powered-by');
if (config.trustProxy) app.set('trust proxy', config.trustProxy);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // Requests without an Origin header (curl, health checks, server-to-server) are allowed; browsers always send one.
      if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
      callback(new HttpError(403, 'Origin not allowed'));
    },
  })
);
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'ok' });
  } catch {
    res.status(503).json({ status: 'error', database: 'unreachable' });
  }
});

// Public (partly) — the router applies requireAuth to its private endpoints.
app.use('/api/auth', require('./routes/auth'));

// Everything else requires a valid login token.
app.use('/api/projects', requireAuth, require('./routes/projects'));
app.use('/api/tasks', requireAuth, require('./routes/tasks'));
app.use('/api/workspaces', requireAuth, require('./routes/workspaces'));
app.use('/api/notes', requireAuth, require('./routes/notes'));
app.use('/api/milestones', requireAuth, require('./routes/milestones'));
app.use('/api/notifications', requireAuth, require('./routes/notifications'));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request is too large' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' });
  console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

module.exports = app;
