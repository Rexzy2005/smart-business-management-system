/**
 * Database Indexes Setup Script
 * Run this to create optimal indexes for better query performance
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Business = require('../models/Business');
const logger = require('../utils/logger');

const createIndexes = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB');

    // Create User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ business: 1 });
    await User.collection.createIndex({ isActive: 1 });
    await User.collection.createIndex({ role: 1 });
    logger.success('User indexes created');

    // Create Business indexes
    await Business.collection.createIndex({ owner: 1 });
    await Business.collection.createIndex({ name: 1 });
    await Business.collection.createIndex({ isActive: 1 });
    await Business.collection.createIndex({ subscriptionStatus: 1 });
    logger.success('Business indexes created');

    logger.success('All indexes created successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error creating indexes:', error);
    process.exit(1);
  }
};

createIndexes();