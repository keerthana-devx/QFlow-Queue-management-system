// 
require('dns').setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Make io accessible in route handlers
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(cors());
app.use(express.json());

// Socket.IO authentication and room management
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    socket.data.public = true;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.managerId = decoded.id;
    socket.data.public = false;
    next();
  } catch {
    next(new Error('Unauthorised'));
  }
});

io.on('connection', (socket) => {
  if (socket.data.public) {
    const mid = socket.handshake.query?.managerId;

    if (mid) socket.join(`public:${mid}`);
    return;
  }

  const mid = socket.data.managerId;
  socket.join(`manager:${mid}`);

  socket.on('disconnect', () => {});
});

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/queue', require('./routes/queue'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'QFlow API running' });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'QFlow backend is running'
  });
});

// Start server only after MongoDB connects
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
