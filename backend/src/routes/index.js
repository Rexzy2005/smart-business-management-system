/**
 * Main Routes Index
 * Combines all route modules
 */

const express = require('express');
const healthController = require('../controllers/healthController');
const authRoutes = require('./authRoutes');
const businessRoutes = require('./businessRoutes');
const productRoutes = require('./productRoutes');
const saleRoutes = require('./saleRoutes');
const transactionRoutes = require('./transactionRoutes');
const notificationRoutes = require('./notificationRoutes');



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

router.use('/business', businessRoutes);

/**
 * Product Routes
 */
router.use('/products', productRoutes);

/**
 * Sale Routes
 */
router.use('/sales', saleRoutes);

// Transaction Routes
router.use('/transactions', transactionRoutes);

// Notification Routes
router.use('/notifications', notificationRoutes);

module.exports = router;