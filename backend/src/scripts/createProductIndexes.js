/**
 * Product Indexes Setup Script
 * Run this to create optimal indexes for product queries
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const logger = require('../utils/logger');

const createProductIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB');

    // Create Product indexes
    await Product.collection.createIndex({ business: 1, name: 1 });
    await Product.collection.createIndex({ business: 1, category: 1 });
    await Product.collection.createIndex({ business: 1, type: 1 });
    await Product.collection.createIndex({ business: 1, isLowStock: 1 });
    await Product.collection.createIndex({ business: 1, isActive: 1 });
    await Product.collection.createIndex({ sku: 1 }, { unique: true, sparse: true });
    await Product.collection.createIndex({ barcode: 1 }, { sparse: true });
    await Product.collection.createIndex({ business: 1, createdAt: -1 });
    await Product.collection.createIndex({
      name: 'text',
      description: 'text',
      sku: 'text'
    });

    logger.success('Product indexes created successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error creating product indexes:', error);
    process.exit(1);
  }
};

createProductIndexes();