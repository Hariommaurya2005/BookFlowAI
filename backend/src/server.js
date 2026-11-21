require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/database');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const initSocket = require('./sockets');
const reminderJob = require('./cron/jobs/reminderJob');
const logger = require('./utils/logger');
const { assertRuntimeConfig } = require('./utils/runtimeConfig');
const { redactSensitiveUrl } = require('./utils/logSanitizer');

const app = express();
if (['1', 'true'].includes(String(process.env.TRUST_PROXY || '').toLowerCase())) app.set('trust proxy', 1);
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
app.set('io', io);
initSocket(io);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
morgan.token('safe-url', (req) => redactSensitiveUrl(req.originalUrl));
app.use(morgan(':remote-addr :method :safe-url :status :res[content-length] :response-time ms', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many sign-in attempts. Please try again later.' },
});
const authSensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many account recovery attempts. Please try again later.' },
});
const publicBookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many booking requests. Please try again later.' },
});
app.use('/api', limiter);
app.use('/api/v1/public/booking', publicBookingLimiter);
app.use('/api/v1/auth/login', authLoginLimiter);
app.use('/api/v1/auth/refresh-token', authLoginLimiter);
app.use('/api/v1/auth/register', authSensitiveLimiter);
app.use('/api/v1/auth/forgot-password', authSensitiveLimiter);
app.use('/api/v1/auth/reset-password', authSensitiveLimiter);

// Routes
app.use('/api/v1', routes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404 + error handler
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    assertRuntimeConfig(process.env);
    await connectDB();
    server.listen(PORT, () => {
      logger.info(`BookFlow AI server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      reminderJob.start();
      logger.info('Cron jobs started');
    });
  } catch (error) {
    logger.error(`Server startup failed: ${error.message}`);
    process.exit(1);
  }
};

start();

module.exports = { app, server };
