/**
 * Notification Service
 * Helper functions to create and send notifications
 */

const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../utils/logger');
const {
  sendLowStockAlert,
  sendOutOfStockAlert,
  sendSaleConfirmation,
  sendDailySalesSummary
} = require('../utils/sendEmail');

/**
 * Create a notification
 */
exports.createNotification = async (data) => {
  try {
    const notification = await Notification.create(data);
    logger.info(`Notification created: ${notification.type} - ${notification.title}`);
    return notification;
  } catch (error) {
    logger.error('Create notification error:', error);
    throw error;
  }
};

/**
 * Send low stock notification
 */
exports.notifyLowStock = async (product, business) => {
  try {
    // Create in-app notification
    await exports.createNotification({
      business: business._id,
      type: 'low_stock',
      priority: 'high',
      title: `Low Stock Alert: ${product.name}`,
      message: `${product.name} is running low. Current stock: ${product.quantityInStock} ${product.unitType}. Threshold: ${product.lowStockThreshold}`,
      data: {
        productId: product._id,
        productName: product.name,
        currentStock: product.quantityInStock,
        threshold: product.lowStockThreshold
      },
      referenceType: 'product',
      referenceId: product._id
    });

    // Send email to business owner and admins
    const recipients = await User.find({
      business: business._id,
      role: { $in: ['owner', 'admin'] }
    });

    if (recipients.length > 0) {
      await sendLowStockAlert(product, recipients);
    }

    logger.info(`Low stock notification sent for: ${product.name}`);
  } catch (error) {
    logger.error('Notify low stock error:', error);
  }
};

/**
 * Send out of stock notification
 */
exports.notifyOutOfStock = async (product, business) => {
  try {
    // Create in-app notification
    await exports.createNotification({
      business: business._id,
      type: 'out_of_stock',
      priority: 'urgent',
      title: `OUT OF STOCK: ${product.name}`,
      message: `${product.name} is now out of stock! Immediate restocking required.`,
      data: {
        productId: product._id,
        productName: product.name
      },
      referenceType: 'product',
      referenceId: product._id
    });

    // Send email to business owner and admins
    const recipients = await User.find({
      business: business._id,
      role: { $in: ['owner', 'admin'] }
    });

    if (recipients.length > 0) {
      await sendOutOfStockAlert(product, recipients);
    }

    logger.info(`Out of stock notification sent for: ${product.name}`);
  } catch (error) {
    logger.error('Notify out of stock error:', error);
  }
};

/**
 * Send sale completed notification
 */
exports.notifySaleCompleted = async (sale, business, user) => {
  try {
    // Create in-app notification
    await exports.createNotification({
      business: business._id,
      user: user._id,
      type: 'sale_completed',
      priority: 'low',
      title: `Sale Completed: ${sale.saleNumber}`,
      message: `Sale of ₦${sale.total.toLocaleString()} completed successfully. ${sale.items.length} item(s) sold.`,
      data: {
        saleId: sale._id,
        saleNumber: sale.saleNumber,
        total: sale.total,
        itemCount: sale.items.length
      },
      referenceType: 'sale',
      referenceId: sale._id
    });

    // Send email confirmation if customer email is provided
    if (sale.customerEmail) {
      await sendSaleConfirmation(sale, { email: sale.customerEmail });
    }

    logger.info(`Sale notification sent: ${sale.saleNumber}`);
  } catch (error) {
    logger.error('Notify sale completed error:', error);
  }
};

/**
 * Send payment received notification
 */
exports.notifyPaymentReceived = async (sale, payment, business) => {
  try {
    await exports.createNotification({
      business: business._id,
      type: 'payment_received',
      priority: 'medium',
      title: `Payment Received: ${sale.saleNumber}`,
      message: `Payment of ₦${payment.amount.toLocaleString()} received for sale ${sale.saleNumber}. ${sale.paymentStatus === 'paid' ? 'Fully paid.' : `Remaining: ₦${sale.amountDue.toLocaleString()}`}`,
      data: {
        saleId: sale._id,
        saleNumber: sale.saleNumber,
        paymentAmount: payment.amount,
        paymentStatus: sale.paymentStatus,
        amountDue: sale.amountDue
      },
      referenceType: 'sale',
      referenceId: sale._id
    });

    logger.info(`Payment notification sent: ${sale.saleNumber}`);
  } catch (error) {
    logger.error('Notify payment received error:', error);
  }
};

/**
 * Send daily summary notification
 */
exports.sendDailySummaryNotification = async (business) => {
  try {
    const Sale = require('../models/Sale');

    // Get today's sales data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySales = await Sale.find({
      business: business._id,
      date: { $gte: today, $lt: tomorrow },
      status: 'completed'
    });

    if (todaySales.length === 0) {
      logger.info(`No sales today for business ${business.name}`);
      return;
    }

    // Calculate summary
    const summary = {
      totalSales: todaySales.length,
      totalRevenue: todaySales.reduce((sum, s) => sum + s.total, 0),
      totalProfit: todaySales.reduce((sum, s) => sum + s.profit, 0),
      paidSales: todaySales.filter(s => s.paymentStatus === 'paid').length,
      pendingSales: todaySales.filter(s => s.paymentStatus !== 'paid').length,
      totalAmountDue: todaySales.reduce((sum, s) => sum + s.amountDue, 0),
      topProducts: []
    };

    // Get top products
    const productSales = {};
    todaySales.forEach(sale => {
      sale.items.forEach(item => {
        if (!productSales[item.productName]) {
          productSales[item.productName] = { quantity: 0, revenue: 0 };
        }
        productSales[item.productName].quantity += item.quantitySold;
        productSales[item.productName].revenue += item.subtotal;
      });
    });

    summary.topProducts = Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Create in-app notification
    await exports.createNotification({
      business: business._id,
      type: 'daily_summary',
      priority: 'low',
      title: `Daily Sales Summary - ${today.toLocaleDateString()}`,
      message: `${summary.totalSales} sales completed today. Revenue: ₦${summary.totalRevenue.toLocaleString()}. Profit: ₦${summary.totalProfit.toLocaleString()}.`,
      data: summary
    });

    // Send email to owner and admins
    const recipients = await User.find({
      business: business._id,
      role: { $in: ['owner', 'admin'] }
    });

    if (recipients.length > 0) {
      await sendDailySalesSummary(summary, recipients);
    }

    logger.info(`Daily summary sent for business: ${business.name}`);
  } catch (error) {
    logger.error('Send daily summary error:', error);
  }
};

/**
 * Clean up old notifications
 */
exports.cleanupOldNotifications = async (daysOld = 30) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.setDate() - daysOld);

    const result = await Notification.deleteMany({
      createdAt: { $lt: cutoffDate },
      isRead: true
    });

    logger.info(`Cleaned up ${result.deletedCount} old notifications`);
    return result.deletedCount;
  } catch (error) {
    logger.error('Cleanup notifications error:', error);
    throw error;
  }
};