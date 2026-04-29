require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Enable Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const workspaceRoutes = require('./routes/workspaces');
const notesRoutes = require('./routes/notes');
const milestoneRoutes = require('./routes/milestones');
const notificationRoutes = require('./routes/notifications');

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'NoteVault Backend' });
});

// Collaborative Socket.IO Logic
io.on('connection', (socket) => {
  console.log(`[Socket] Editor connected: ${socket.id}`);

  socket.on('join-note', (noteId) => {
    socket.join(noteId);
    const clientsInRoom = io.sockets.adapter.rooms.get(noteId)?.size || 0;
    io.to(noteId).emit('active-users', clientsInRoom);
    console.log(`[Socket] User joined note room: ${noteId}, total: ${clientsInRoom}`);
  });

  socket.on('leave-note', (noteId) => {
    socket.leave(noteId);
    const clientsInRoom = io.sockets.adapter.rooms.get(noteId)?.size || 0;
    io.to(noteId).emit('active-users', clientsInRoom);
  });

  socket.on('note-change', (data) => {
    // Expected structure: { noteId, content, cursor }
    // Broadcast back to everyone in the room except sender
    socket.to(data.noteId).emit('receive-note-change', data);
  });

  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        const clientsInRoom = (io.sockets.adapter.rooms.get(room)?.size || 1) - 1;
        io.to(room).emit('active-users', clientsInRoom);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Editor disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5069;

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the process using that port or set a different PORT in .env.`);
    process.exit(1);
  }
  console.error('Server error:', error);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`NoteVault Engine running on port ${PORT} with Collaborative WS`);
});
