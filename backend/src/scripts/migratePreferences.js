/**
 * Migration Script: Add default preferences to existing businesses
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Business = require('../models/Business');
const logger = require('../utils/logger');

const migratePreferences = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB');

    // Find all businesses without preferences
    const businesses = await Business.find({
      $or: [
        { preferences: { $exists: false } },
        { 'preferences.categories': { $exists: false } }
      ]
    });

    logger.info(`Found ${businesses.length} businesses to migrate`);

    for (const business of businesses) {
      // Set default preferences
      business.preferences = {
        categories: [
          {
            name: 'Electronics',
            description: 'Electronic devices and accessories',
            icon: '💻',
            color: '#3b82f6'
          },
          {
            name: 'Clothing',
            description: 'Apparel and fashion items',
            icon: '👕',
            color: '#ec4899'
          },
          {
            name: 'Food & Beverages',
            description: 'Food items and drinks',
            icon: '🍔',
            color: '#f59e0b'
          }
        ],
        units: [
          { name: 'Piece', abbreviation: 'PCS', type: 'quantity' },
          { name: 'Kilogram', abbreviation: 'KG', type: 'weight' },
          { name: 'Liter', abbreviation: 'L', type: 'volume' },
          { name: 'Dozen', abbreviation: 'DZ', type: 'quantity' }
        ],
        productTypes: [
          {
            name: 'Physical Product',
            description: 'Tangible goods that can be shipped',
            requiresSerialNumber: false,
            requiresExpiryDate: false,
            trackInventory: true
          },
          {
            name: 'Perishable',
            description: 'Products with expiry dates',
            requiresSerialNumber: false,
            requiresExpiryDate: true,
            trackInventory: true
          },
          {
            name: 'Service',
            description: 'Non-physical services',
            requiresSerialNumber: false,
            requiresExpiryDate: false,
            trackInventory: false
          }
        ]
      };

      await business.save();
      logger.success(`Migrated preferences for: ${business.name}`);
    }

    logger.success(`Migration complete! ${businesses.length} businesses updated`);
    process.exit(0);
  } catch (error) {
    logger.error('Migration error:', error);
    process.exit(1);
  }
};

migratePreferences();