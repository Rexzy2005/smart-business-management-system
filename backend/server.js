/**
 * Brillix Backend - Server Entry Point
 * 
 * This is the main entry file that starts the Express server
 * and establishes the database connection.
 */

require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/database');
const logger = require('./src/utils/logger');

// Configuration
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Start Server
 * Connects to database first, then starts the Express server
 */
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Start Express server
    app.listen(PORT, () => {
      logger.info(`🚀 Brillix server running in ${NODE_ENV} mode on port ${PORT}`);
      logger.info(`📍 Health check available at: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('⚠️  UNHANDLED REJECTION! Shutting down...', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('⚠️  UNCAUGHT EXCEPTION! Shutting down...', err);
  process.exit(1);
});

// Start the server
startServer();