/**
 * MongoDB Database Configuration
 * Handles connection to MongoDB using Mongoose
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Connect to MongoDB
 * @returns {Promise} Resolves when connection is successful
 */
const connectDB = async () => {
  try {
    // Mongoose connection options
    const options = {
      // Use new URL parser
      useNewUrlParser: true,
      // Use unified topology for connection management
      useUnifiedTopology: true,
      // Set timeout for initial connection
      serverSelectionTimeoutMS: 5000,
      // Set timeout for socket operations
      socketTimeoutMS: 45000,
    };

    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
    logger.info(`📊 Database: ${conn.connection.name}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    logger.error('❌ MongoDB connection failed:', error.message);
    throw error;
  }
};

/**
 * Graceful shutdown of database connection
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error);
    throw error;
  }
};

// Export functions
module.exports = connectDB;
module.exports.disconnectDB = disconnectDB;