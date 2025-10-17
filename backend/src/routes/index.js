/**
 * Main Routes Index
 * Combines all route modules
 */

const express = require('express');
const healthController = require('../controllers/healthController');

const router = express.Router();

/**
 * Health Check Routes
 */
router.get('/health', healthController.healthCheck);
router.get('/health/db', healthController.databaseHealth);

/**
 * Add your other routes here
 * Example:
 * const userRoutes = require('./userRoutes');
 * router.use('/users', userRoutes);
 */

module.exports = router;