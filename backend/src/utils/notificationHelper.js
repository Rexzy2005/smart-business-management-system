/**
 * Notification Helper
 * Functions to create notifications for various events
 */

const Notification = require('../models/Notification');
const {
  sendLowStockAlert,
  sendSaleConfirmation,
  sendExpenseAlert,
  sendDailySummary
} = require('./sendEmail');
const logger = require('./logger');

/**
 * Create low stock notification
 */
exports.createLowStockNotification = async (product, business, user) => {
  try {
    const notification = await Notification.create({
      business: business._id,
      user: user._id,
      type: 'low_stock',
      title: '⚠️ Low Stock Alert',
      message: `${product.name} is running low. Only ${product.quantityInStock} ${product.unitType} remaining.`,
      priority: 'high',
      actionUrl: `/inventory/products/${product._id}`,
      actionText: 'Manage Inventory',
      referenceType: 'product',
      referenceId: product._id,
      metadata: {
        productId: product._id,
        productName: product.name,
        currentStock: product.quantityInStock,
        reorderLevel: product.reorderLevel
      }
    });

    // Send email if enabled
    if (process.env.LOW_STOCK_EMAIL_ENABLED === 'true') {
      await sendLowStockAlert(user.email, [product], business.name);
    }

    logger.info(`Low stock notification created for ${product.name}`);
    return notification;
  } catch (error) {
    logger.error('Create low stock notification error:', error);
    throw error;
  }
};

/**
 * Create out of stock notification
 */
exports.createOutOfStockNotification = async (product, business, user) => {
  try {
    const notification = await Notification.create({
      business: business._id,
      user: user._id,
      type: 'out_of_stock',
      title: '🚨 Out of Stock Alert',
      message: `${product.name} is now out of stock!`,
      priority: 'urgent',
      actionUrl: `/inventory/products/${product._id}`,
      actionText: 'Reorder Now',
      referenceType: 'product',
      referenceId: product._id,
      metadata: {
        productId: product._id,
        productName: product.name,
        sku: product.sku
      }
    });

    logger.info(`Out of stock notification created for ${product.name}`);
    return notification;
  } catch (error) {
    logger.error('Create out of stock notification error:', error);
    throw error;
  }
};

/**
 * Create sale completed notification
 */
exports.createSaleNotification = async (sale, business, user) => {
  try {
    const notification = await Notification.create({
      business: business._id,
      user: user._id,
      type: 'sale_completed',
      title: '✅ Sale Confirmed',
      message: `Sale #${sale.saleNumber} completed. Total: ₦${sale.total.toLocaleString()}`,
      priority: 'medium',
      actionUrl: `/sales/${sale._id}`,
      actionText: 'View Sale Details',
      referenceType: 'sale',
      referenceId: sale._id,
      metadata: {
        saleId: sale._id,
        saleNumber: sale.saleNumber,
        total: sale.total,
        profit: sale.totalProfit,
        itemsCount: sale.items.length
      }
    });

    // Send email if enabled
    if (process.env.SALE_CONFIRMATION_EMAIL_ENABLED === 'true') {
      await sendSaleConfirmation(user.email, sale, business.name);

      notification.emailSent = true;
      notification.emailSentAt = new Date();
      await notification.save();
    }

    logger.info(`Sale notification created for sale #${sale.saleNumber}`);
    return notification;
  } catch (error) {
    logger.error('Create sale notification error:', error);
    throw error;
  }
};

/**
 * Create payment received notification
 */
exports.createPaymentNotification = async (transaction, business, user) => {
  try {
    const notification = await Notification.create({
      business: business._id,
      user: user._id,
      type: 'payment_received',
      title: '💰 Payment Received',
      message: `Payment of ₦${transaction.amount.toLocaleString()} received via ${transaction.paymentMethod}`,
      priority: 'medium',
      actionUrl: `/transactions/${transaction._id}`,
      actionText: 'View Details',
      referenceType: 'transaction',
      referenceId: transaction._id,
      metadata: {
        transactionId: transaction._id,
        amount: transaction.amount,
        method: transaction.paymentMethod,
        reference: transaction.reference
      }
    });

    logger.info(`Payment notification created for ₦${transaction.amount}`);
    return notification;
  } catch (error) {
    logger.error('Create payment notification error:', error);
    throw error;
  }
};

/**
 * Create expense recorded notification
 */
exports.createExpenseNotification = async (transaction, business, user) => {
  try {
    const notification = await Notification.create({
      business: business._id,
      user: user._id,
      type: 'expense_recorded',
      title: '💳 Expense Recorded',
      message: `Expense of ₦${transaction.amount.toLocaleString()} recorded - ${transaction.category}`,
      priority: 'low',
      actionUrl: `/transactions/${transaction._id}`,
      actionText: 'View Expense',
      referenceType: 'transaction',
      referenceId: transaction._id,
      metadata: {
        transactionId: transaction._id,
        amount: transaction.amount,
        category: transaction.category,
        description: transaction.description
      }
    });

    // Send email if enabled
    if (process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true') {
      await sendExpenseAlert(user.email, transaction, business.name);

      notification.emailSent = true;
      notification.emailSentAt = new Date();
      await notification.save();
    }

    logger.info(`Expense notification created for ₦${transaction.amount}`);
    return notification;
  } catch (error) {
    logger.error('Create expense notification error:', error);
    throw error;
  }
};

/**
 * Create daily summary notification
 */
exports.createDailySummaryNotification = async (summary, business, user) => {
  try {
    const notification = await Notification.create({
      business: business._id,
      user: user._id,
      type: 'daily_summary',
      title: '📊 Daily Business Summary',
      message: `Summary: ${summary.totalSales} sales, ₦${summary.totalRevenue.toLocaleString()} revenue, ₦${summary.totalProfit.toLocaleString()} profit`,
      priority: 'low',
      actionUrl: '/dashboard',
      actionText: 'View Dashboard',
      metadata: {
        date: summary.date,
        totalSales: summary.totalSales,
        totalRevenue: summary.totalRevenue,
        totalProfit: summary.totalProfit,
        totalExpenses: summary.totalExpenses,
        lowStockCount: summary.lowStockCount
      }
    });

    // Send email if enabled
    if (process.env.DAILY_SUMMARY_EMAIL_ENABLED === 'true') {
      await sendDailySummary(user.email, summary, business.name);

      notification.emailSent = true;
      notification.emailSentAt = new Date();
      await notification.save();
    }

    logger.info(`Daily summary notification created for ${business.name}`);
    return notification;
  } catch (error) {
    logger.error('Create daily summary notification error:', error);
    throw error;
  }
};

/**
 * Create system alert notification
 */
exports.createSystemAlert = async (title, message, business, user, priority = 'high') => {
  try {
    const notification = await Notification.create({
      business: business._id,
      user: user._id,
      type: 'alert',
      title,
      message,
      priority
    });

    logger.info(`System alert created: ${title}`);
    return notification;
  } catch (error) {
    logger.error('Create system alert error:', error);
    throw error;
  }
};

/**
 * Create info notification
 */
exports.createInfoNotification = async (title, message, business, user = null) => {
  try {
    const notification = await Notification.create({
      business: business._id,
      user: user && user._id ? user._id : null,
      type: 'info',
      title,
      message,
      priority: 'low'
    });

    logger.info(`Info notification created: ${title}`);
    return notification;
  } catch (error) {
    logger.error('Create info notification error:', error);
    throw error;
  }
};

/**
 * Broadcast notification to all business users
 */
exports.broadcastNotification = async (title, message, business, notificationType = 'info') => {
  try {
    const User = require('../models/User');
    const businessUsers = await User.find({ business: business._id });

    const notifications = await Promise.all(
      businessUsers.map(user =>
        Notification.create({
          business: business._id,
          user: user._id,
          type: notificationType,
          title,
          message,
          priority: 'medium'
        })
      )
    );

    logger.info(`Notification broadcasted to ${notifications.length} users`);
    return notifications;
  } catch (error) {
    logger.error('Broadcast notification error:', error);
    throw error;
  }
};

/**
 * Clean old notifications (keep last 30 days)
 */
exports.cleanOldNotifications = async (businessId) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await Notification.deleteMany({
      business: businessId,
      createdAt: { $lt: thirtyDaysAgo }
    });

    logger.info(`Cleaned ${result.deletedCount} old notifications for business ${businessId}`);
    return result;
  } catch (error) {
    logger.error('Clean old notifications error:', error);
    throw error;
  }
};

/**
 * Get business statistics for notifications
 */
exports.getNotificationStats = async (businessId) => {
  try {
    const stats = await Notification.aggregate([
      { $match: { business: require('mongoose').Types.ObjectId(businessId) } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          unread: {
            $sum: { $cond: ['$isRead', 0, 1] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    return stats;
  } catch (error) {
    logger.error('Get notification stats error:', error);
    throw error;
  }
};

/**
 * Mark old notifications as read
 */
exports.markOldNotificationsAsRead = async (businessId, daysOld = 7) => {
  try {
    const daysAgo = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const result = await Notification.updateMany(
      {
        business: businessId,
        isRead: false,
        createdAt: { $lt: daysAgo }
      },
      {
        $set: {
          isRead: true,
          readAt: new Date()
        }
      }
    );

    logger.info(`Marked ${result.modifiedCount} old notifications as read`);
    return result;
  } catch (error) {
    logger.error('Mark old notifications as read error:', error);
    throw error;
  }
};