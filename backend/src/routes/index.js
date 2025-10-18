/**
 * Main Routes Index
 * Combines all route modules
 */

const express = require('express');
const healthController = require('../controllers/healthController');
const authRoutes = require('./authRoutes');
const businessRoutes = require('./businessRoutes');

const router = express.Router();

/**
 * Health Check Routes
 */
router.get('/health', healthController.healthCheck);
router.get('/health/db', healthController.databaseHealth);

/**
 * Authentication Routes
 */
router.use('/auth', authRoutes);

/**
 * Business Routes
 */
router.use('/business', businessRoutes);

module.exports = router;