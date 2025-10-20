/**
 * Sale Routes
 * Defines routes for sales management
 */

const express = require('express');
const saleController = require('../controllers/saleController');
const { protect, authorize } = require('../middleware/auth');
const {
  recordSaleValidation,
  saleIdValidation,
  updatePaymentValidation,
  validate
} = require('../middleware/validation');

const router = express.Router();

/**
 * All routes require authentication
 */
router.use(protect);

/**
 * Sale Routes
 */

// Record new sale
router.post(
  '/',
  recordSaleValidation,
  validate,
  saleController.recordSale
);

// Get all sales with filters
router.get('/', saleController.getSales);

// Get sales statistics
router.get('/stats', saleController.getSalesStats);

// Get today's sales
router.get('/today', saleController.getTodaySales);

// Get single sale
router.get(
  '/:id',
  saleIdValidation,
  validate,
  saleController.getSale
);

// Update payment status
router.patch(
  '/:id/payment',
  saleIdValidation,
  updatePaymentValidation,
  validate,
  saleController.updatePayment
);

// Cancel sale (Owner/Admin only)
router.patch(
  '/:id/cancel',
  saleIdValidation,
  validate,
  authorize('owner', 'admin'),
  saleController.cancelSale
);

module.exports = router;