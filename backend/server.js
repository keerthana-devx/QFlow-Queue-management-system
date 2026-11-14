require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const jwt        = require('jsonwebtoken');
const connectDB  = require('./config/db');

connectDB();

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Make io accessible in route handlers via req.io
app.use((req, _, next) => { req.io = io; next(); });
app.use(cors());
app.use(express.json());

// ── Socket.IO authentication + room management ──────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    // Public display connections are allowed without a token
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
    // Public display joins a room by managerId passed as query param
    const mid = socket.handshake.query?.managerId;
    if (mid) socket.join(`public:${mid}`);
    return;
  }

  const mid = socket.data.managerId;
  socket.join(`manager:${mid}`);

  socket.on('disconnect', () => {});
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/doctors',      require('./routes/doctors'));
app.use('/api/analytics',    require('./routes/analytics'));

// Legacy queue route kept so old frontend calls don't 404 during transition
app.use('/api/queue',        require('./routes/queue'));

app.get('/', (_, res) => res.json({ message: 'QFlow API running' }));
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'QFlow backend is running',
    database: 'Check MongoDB connection separately'
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
