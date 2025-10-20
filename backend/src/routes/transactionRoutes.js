/**
 * Transaction Routes
 * Defines routes for cash flow management
 */

const express = require('express');
const transactionController = require('../controllers/transactionController');
const { protect, authorize } = require('../middleware/auth');
const {
  createTransactionValidation,
  updateTransactionValidation,
  transactionIdValidation,
  validate
} = require('../middleware/validation');

const router = express.Router();

/**
 * All routes require authentication
 */
router.use(protect);

/**
 * Transaction Routes
 */

// Create transaction
router.post(
  '/',
  createTransactionValidation,
  validate,
  transactionController.createTransaction
);

// Get all transactions
router.get('/', transactionController.getTransactions);

// Get cash flow summary
router.get('/summary', transactionController.getCashFlowSummary);

// Get cash flow trends
router.get('/trends', transactionController.getCashFlowTrends);

// Get today's cash flow
router.get('/today', transactionController.getTodayCashFlow);

// Get single transaction
router.get(
  '/:id',
  transactionIdValidation,
  validate,
  transactionController.getTransaction
);

// Update transaction
router.put(
  '/:id',
  transactionIdValidation,
  updateTransactionValidation,
  validate,
  transactionController.updateTransaction
);

// Delete transaction (Owner/Admin only)
router.delete(
  '/:id',
  transactionIdValidation,
  validate,
  authorize('owner', 'admin'),
  transactionController.deleteTransaction
);

module.exports = router;