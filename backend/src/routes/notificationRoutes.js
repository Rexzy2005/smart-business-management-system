/**
 * Notification Routes
 * Defines routes for notification management
 */

const express = require('express');
const notificationController = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/auth');
const {
  sendNotificationValidation,
  notificationIdValidation,
  validate
} = require('../middleware/validation');

const router = express.Router();

/**
 * All routes require authentication
 */
router.use(protect);

/**
 * Notification Routes
 */

// Get all notifications
router.get('/', notificationController.getNotifications);

// Get notification statistics
router.get('/stats', notificationController.getStats);

// Mark all as read
router.patch('/read-all', notificationController.markAllAsRead);

// Send notification (Owner/Admin only)
router.post(
  '/send',
  authorize('owner', 'admin'),
  sendNotificationValidation,
  validate,
  notificationController.sendNotification
);

// Get single notification
router.get(
  '/:id',
  notificationIdValidation,
  validate,
  notificationController.getNotification
);

// Mark as read
router.patch(
  '/:id/read',
  notificationIdValidation,
  validate,
  notificationController.markAsRead
);

// Delete notification
router.delete(
  '/:id',
  notificationIdValidation,
  validate,
  notificationController.deleteNotification
);

module.exports = router;