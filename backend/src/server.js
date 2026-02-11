const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const authController = require('./controllers/authController');

// Import routes
const walletRoutes = require('./routes/wallets');
const transactionListRoutes = require('./routes/transactions');
const transactionRoutes = require('./routes/transactions-all');
const subscriptionListRoutes = require('./routes/subscriptions');
const subscriptionRoutes = require('./routes/subscriptions-all');
const freeTrialListRoutes = require('./routes/free-trials');
const freeTrialRoutes = require('./routes/free-trials-all');
const sharedWalletRoutes = require('./routes/shared-wallets');
const aiRoutes = require('./routes/ai');
const extensionRoutes = require('./routes/extension');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Authentication routes
app.post('/api/auth/signup', authController.signup);
app.post('/api/auth/login', authController.login);
app.get('/api/auth/me', authController.getCurrentUser);
app.post('/api/auth/logout', authController.logout);

// API routes
app.use('/api/wallets', walletRoutes);
app.use('/api/wallets/:walletId/transactions', transactionListRoutes);  // Nested route for transactions
app.use('/api/transactions', transactionRoutes);  // Individual transaction routes
app.use('/api/wallets/:walletId/subscriptions', subscriptionListRoutes);  // Nested route for subscriptions
app.use('/api/subscriptions', subscriptionRoutes);  // Individual subscription routes
app.use('/api/wallets/:walletId/free-trials', freeTrialListRoutes);  // Nested route for free trials
app.use('/api/free-trials', freeTrialRoutes);  // Individual free trial routes
app.use('/api', sharedWalletRoutes);  // Shared wallet routes
app.use('/api', aiRoutes);  // AI assistant routes
app.use('/api', extensionRoutes);  // Extension processing routes

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: {
      message: 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not Found'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
  console.log(`Auth endpoints available:`);
  console.log(`  POST http://localhost:${PORT}/api/auth/signup`);
  console.log(`  POST http://localhost:${PORT}/api/auth/login`);
  console.log(`  GET  http://localhost:${PORT}/api/auth/me`);
  console.log(`  POST http://localhost:${PORT}/api/auth/logout`);
  console.log(`Wallet endpoints available:`);
  console.log(`  GET    http://localhost:${PORT}/api/wallets`);
  console.log(`  POST   http://localhost:${PORT}/api/wallets`);
  console.log(`  GET    http://localhost:${PORT}/api/wallets/:id`);
  console.log(`  PUT    http://localhost:${PORT}/api/wallets/:id`);
  console.log(`  DELETE http://localhost:${PORT}/api/wallets/:id`);
  console.log(`Transaction endpoints available:`);
  console.log(`  GET    http://localhost:${PORT}/api/wallets/:id/transactions`);
  console.log(`  POST   http://localhost:${PORT}/api/wallets/:id/transactions`);
  console.log(`  GET    http://localhost:${PORT}/api/transactions/:transactionId`);
  console.log(`  PUT    http://localhost:${PORT}/api/transactions/:transactionId`);
  console.log(`  DELETE http://localhost:${PORT}/api/transactions/:transactionId`);
  console.log(`Subscription endpoints available:`);
  console.log(`  GET    http://localhost:${PORT}/api/wallets/:id/subscriptions`);
  console.log(`  POST   http://localhost:${PORT}/api/wallets/:id/subscriptions`);
  console.log(`  PUT    http://localhost:${PORT}/api/subscriptions/:subscriptionId`);
  console.log(`  DELETE http://localhost:${PORT}/api/subscriptions/:subscriptionId`);
  console.log(`Free Trial endpoints available:`);
  console.log(`  GET    http://localhost:${PORT}/api/wallets/:id/free-trials`);
  console.log(`  POST   http://localhost:${PORT}/api/wallets/:id/free-trials`);
  console.log(`  PUT    http://localhost:${PORT}/api/free-trials/:freeTrialId`);
  console.log(`  DELETE http://localhost:${PORT}/api/free-trials/:freeTrialId`);
  console.log(`Shared Wallet endpoints available:`);
  console.log(`  POST   http://localhost:${PORT}/api/wallets/:id/share`);
  console.log(`  PUT    http://localhost:${PORT}/api/shared-wallets/:sharedWalletId`);
  console.log(`  PUT    http://localhost:${PORT}/api/shared-wallets/:sharedWalletId/respond`);
  console.log(`  DELETE http://localhost:${PORT}/api/shared-wallets/:sharedWalletId`);
  console.log(`  GET    http://localhost:${PORT}/api/shared-wallets/invitations`);
  console.log(`AI Assistant endpoints available:`);
  console.log(`  POST   http://localhost:${PORT}/api/ai/assistant`);
  console.log(`  GET    http://localhost:${PORT}/api/ai/assistant/history`);
  console.log(`  DELETE http://localhost:${PORT}/api/ai/assistant/history`);
  console.log(`Chrome Extension endpoints available:`);
  console.log(`  POST   http://localhost:${PORT}/api/ai/extension/capture`);
  console.log(`  GET    http://localhost:${PORT}/api/ai/extension/status/:extractionId`);
  console.log(`  POST   http://localhost:${PORT}/api/ai/extension/confirm/:extractionId`);
});

module.exports = app;