/**
 * Product Routes
 * Defines routes for product/inventory management
 */

const express = require('express');
const productController = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * All routes require authentication
 */
router.use(protect);

/**
 * Product CRUD Routes
 */


// Create product
router.post('/', productController.createProduct);

// Get all products with filters
router.get('/', productController.getProducts);

// Get product statistics
router.get('/stats', productController.getProductStats);

// Get low stock products (must be before /:id route)
router.get('/low-stock', productController.getLowStockProducts);

// Get single product
router.get('/:id', productController.getProduct);

// Update product
router.put('/:id', productController.updateProduct);

// Update product stock
router.patch('/:id/stock', productController.updateStock);

// Delete product (soft delete - owner/admin only)
router.delete(
  '/:id',
  authorize('owner', 'admin'),
  productController.deleteProduct
);

module.exports = router;