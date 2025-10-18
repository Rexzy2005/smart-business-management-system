/**
 * Authentication Routes with Rate Limiting
 */

const express = require('express');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  registerValidation,
  loginValidation,
  validate
} = require('../middleware/validation');
const {
  authLimiter,
  registerLimiter
} = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * Public Routes with Rate Limiting
 */

// Register new user and business
router.post(
  '/register',
  registerLimiter,
  registerValidation,
  validate,
  authController.register
);

// Login user
router.post(
  '/login',
  authLimiter,
  loginValidation,
  validate,
  authController.login
);

/**
 * Protected Routes
 */

// Get current user
router.get('/me', protect, authController.getMe);

// Update password
router.put('/update-password', protect, authController.updatePassword);

// Logout
router.post('/logout', protect, authController.logout);

module.exports = router;