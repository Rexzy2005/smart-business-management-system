/**
 * Health Check Controller
 * Provides endpoints to check API and database health
 */

const mongoose = require('mongoose');

/**
 * Basic Health Check
 * @route GET /api/health
 * @access Public
 */
exports.healthCheck = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Brillix API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
};

/**
 * Database Health Check
 * @route GET /api/health/db
 * @access Public
 */
exports.databaseHealth = async (req, res) => {
  try {
    // Check MongoDB connection state
    const dbState = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    // If connected, perform a simple database operation
    if (dbState === 1) {
      await mongoose.connection.db.admin().ping();
      
      res.status(200).json({
        success: true,
        message: 'Database connection is healthy',
        database: {
          status: states[dbState],
          name: mongoose.connection.name,
          host: mongoose.connection.host,
          port: mongoose.connection.port
        },
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'Database connection is not healthy',
        database: {
          status: states[dbState]
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Database health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};