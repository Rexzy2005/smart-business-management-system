/**
 * Notification Controller
 * Handles in-app notifications
 */

const Notification = require('../models/Notification');
const logger = require('../utils/logger');
const { sendEmail } = require('../utils/sendEmail');

/**
 * Get all notifications for current user/business
 * @route GET /api/notifications
 * @access Private
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      isRead,
      priority
    } = req.query;

    // Build query
    const query = {
      business: req.user.business._id
    };

    // Notifications can be for specific user or all users in business
    if (req.query.userOnly === 'true') {
      query.user = req.user.id;
    }

    // Filter by type
    if (type) {
      query.type = type;
    }

    // Filter by read status
    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    // Filter by priority
    if (priority) {
      query.priority = priority;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count
    const total = await Notification.countDocuments(query);

    // Get unread count
    const unreadCount = await Notification.countDocuments({
      ...query,
      isRead: false
    });

    logger.info(`Notifications listed: ${notifications.length} for ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: {
        notifications: notifications.map(n => n.toDetailedInfo()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        unreadCount
      }
    });

  } catch (error) {
    logger.error('Get notifications error:', error);
    next(error);
  }
};

/**
 * Get single notification
 * @route GET /api/notifications/:id
 * @access Private
 */
exports.getNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      business: req.user.business._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        notification: notification.toDetailedInfo()
      }
    });

  } catch (error) {
    logger.error('Get notification error:', error);
    next(error);
  }
};

/**
 * Mark notification as read
 * @route PATCH /api/notifications/:id/read
 * @access Private
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      business: req.user.business._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.markAsRead();

    logger.info(`Notification marked as read: ${notification._id}`);

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: {
        notification: notification.toDetailedInfo()
      }
    });

  } catch (error) {
    logger.error('Mark as read error:', error);
    next(error);
  }
};

/**
 * Mark all notifications as read
 * @route PATCH /api/notifications/read-all
 * @access Private
 */
exports.markAllAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      {
        business: req.user.business._id,
        isRead: false
      },
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      }
    );

    logger.info(`Marked ${result.modifiedCount} notifications as read for ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: `Marked ${result.modifiedCount} notifications as read`,
      data: {
        modifiedCount: result.modifiedCount
      }
    });

  } catch (error) {
    logger.error('Mark all as read error:', error);
    next(error);
  }
};

/**
 * Delete notification
 * @route DELETE /api/notifications/:id
 * @access Private
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      business: req.user.business._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    logger.info(`Notification deleted: ${notification._id}`);

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    logger.error('Delete notification error:', error);
    next(error);
  }
};

/**
 * Send notification (manual)
 * @route POST /api/notifications/send
 * @access Private (Owner/Admin only)
 */
exports.sendNotification = async (req, res, next) => {
  try {
    const {
      type = 'system',
      priority = 'medium',
      title,
      message,
      userId,
      sendEmail: shouldSendEmail = false,
      data,
      actionUrl
    } = req.body;

    // Create notification
    const notification = await Notification.create({
      business: req.user.business._id,
      user: userId || null, // null means all users in business
      type,
      priority,
      title,
      message,
      data,
      actionUrl
    });

    // Send email if requested
    if (shouldSendEmail) {
      try {
        const User = require('../models/User');

        let recipients = [];
        if (userId) {
          const user = await User.findById(userId);
          if (user) recipients.push(user);
        } else {
          // Send to all users in business
          recipients = await User.find({ business: req.user.business._id });
        }

        for (const recipient of recipients) {
          await sendEmail({
            to: recipient.email,
            subject: title,
            text: message,
            html: `
              
                ${title}
                ${message}
                ${actionUrl ? `View Details` : ''}
                
                This is an automated notification from ${req.user.business.name}
              
            `
          });
        }

        notification.emailSent = true;
        notification.emailSentAt = new Date();
        await notification.save();

      } catch (emailError) {
        logger.error('Email sending error:', emailError);
        // Continue even if email fails
      }
    }

    logger.info(`Notification sent: ${type} - ${title}`);

    res.status(201).json({
      success: true,
      message: 'Notification sent successfully',
      data: {
        notification: notification.toDetailedInfo()
      }
    });

  } catch (error) {
    logger.error('Send notification error:', error);
    next(error);
  }
};

/**
 * Get notification statistics
 * @route GET /api/notifications/stats
 * @access Private
 */
exports.getStats = async (req, res, next) => {
  try {
    const stats = await Notification.aggregate([
      { $match: { business: req.user.business._id } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: {
            $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
          },
          byType: {
            $push: {
              type: '$type',
              isRead: '$isRead'
            }
          }
        }
      }
    ]);

    // Count by type
    const typeStats = await Notification.aggregate([
      { $match: { business: req.user.business._id } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          unread: {
            $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: stats[0] || { total: 0, unread: 0 },
        byType: typeStats
      }
    });

  } catch (error) {
    logger.error('Get notification stats error:', error);
    next(error);
  }
};