require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: __dirname + '/.env' });

// Import routes
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const adminRoutes = require('./src/routes/admin');
const hrRoutes = require('./src/routes/hr');
const bookingRoutes = require('./src/routes/bookings');
const roomRoutes = require('./src/routes/rooms');
const guestRoutes = require('./src/routes/guests');
const paymentRoutes = require('./src/routes/payments');
const reportRoutes = require('./src/routes/reports');
const chapaRoutes = require('./src/routes/chapa');
const pricingRoutes = require('./src/routes/pricing');
const cabinRoutes = require('./src/routes/cabins');
const paymentGatewayRoutes = require('./src/routes/paymentGateway');
const { router: notificationRoutes } = require('./src/routes/notifications');
const attendanceRoutes = require('./src/routes/attendance');
const payrollRoutes = require('./src/routes/payroll');
const employeeRoutes = require('./src/routes/employees');

// Import middleware
const { errorHandler } = require('./src/middleware/errorHandler');
const { authenticateToken } = require('./src/middleware/auth');
const { logger } = require('./src/middleware/logger');

const app = express();
const PORT = process.env.PORT || 5000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX),
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW) * 60)
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://yourdomain.com']
    : ['http://localhost:3000', 'http://localhost:3001', 'http://192.168.1.10:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Stripe webhook endpoint requires raw body. We'll mount the webhook handler specifically
const { handleWebhook } = require('./src/routes/stripe');
app.post('/api/stripe/webhook', require('express').raw({ type: 'application/json' }), handleWebhook);

// Mount stripe router for other stripe-related endpoints
const { router: stripeRouter } = require('./src/routes/stripe');
app.use('/api/stripe', stripeRouter);

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: require('./package.json').version
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/hr', authenticateToken, hrRoutes);
app.use('/api/bookings', authenticateToken, bookingRoutes);
app.use('/api/rooms', authenticateToken, roomRoutes);
app.use('/api/guests', authenticateToken, guestRoutes);
app.use('/api/payments', authenticateToken, paymentRoutes);
app.use('/api/reports', authenticateToken, reportRoutes);
app.use('/api/chapa', chapaRoutes);
app.use('/api/pricing', authenticateToken, pricingRoutes);
app.use('/api/cabins', authenticateToken, cabinRoutes);
app.use('/api/payment-gateway', authenticateToken, paymentGatewayRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);
app.use('/api/attendance', authenticateToken, attendanceRoutes);
app.use('/api/payroll', authenticateToken, payrollRoutes);
app.use('/api/employees', authenticateToken, employeeRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/api/health`);
  logger.info(`📁 Uploads directory: ${uploadsDir}`);
  logger.info(`📝 Logs directory: ${logsDir}`);
}); 