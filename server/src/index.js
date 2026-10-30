const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const config = require('./config');
const { RoomManager } = require('./rooms/roomManager');
const { setupSocketHandlers } = require('./sockets/socketHandler');
const { extractYouTubeVideoId } = require('./utils/youtube');

const app = express();
const server = http.createServer(app);

// Helper to normalize origins (strip trailing slash)
function normalizeOrigin(url) {
  if (!url) return '';
  return url.trim().replace(/\/+$/, '');
}

// Parse allowed origins from config.clientUrl (supports comma-separated list)
const configuredOrigins = (config.clientUrl || '')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

const defaultAllowedOrigins = [
  ...configuredOrigins,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

// Origin validator supporting localhost, configured URLs, and Vercel deployments
function isOriginAllowed(origin) {
  if (!origin) return true; // Allow non-browser requests (Postman, curl, server-to-server)
  const norm = normalizeOrigin(origin);

  if (defaultAllowedOrigins.includes(norm)) return true;
  if (config.nodeEnv === 'development') return true;

  // Allow Vercel preview and production deployments (*.vercel.app)
  if (/^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(norm)) return true;

  return false;
}

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Initialize Room Manager & Socket.IO
const roomManager = new RoomManager();
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Socket CORS blocked for origin: ${origin}`));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 30000,
  pingInterval: 25000,
});

// Setup Socket handlers
setupSocketHandlers(io, roomManager);

// REST API Endpoints

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeRooms: roomManager.rooms.size,
    environment: config.nodeEnv,
  });
});

// 2. Validate room code before joining
app.get('/api/rooms/:roomId/validate', (req, res) => {
  const { roomId } = req.params;
  const room = roomManager.getRoom(roomId.trim());

  if (!room) {
    return res.status(404).json({
      valid: false,
      error: 'Room not found. Please verify the room code or link.',
    });
  }

  res.json({
    valid: true,
    roomId: room.roomId,
    participantCount: room.participants.size,
    currentVideoId: room.playback.videoId,
    status: room.playback.status,
  });
});

// 3. Validate YouTube URL
app.post('/api/youtube/validate', (req, res) => {
  const { url } = req.body;
  const result = extractYouTubeVideoId(url);
  if (!result.valid) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// Only listen if not running in Jest tests
if (process.env.NODE_ENV !== 'test') {
  server.listen(config.port, () => {
    console.log(`[WatchParty Server] Running on http://localhost:${config.port}`);
    console.log(`[WatchParty Server] Allowed Client Origins:`, configuredOrigins);
  });
}

module.exports = {
  app,
  server,
  io,
  roomManager,
};
