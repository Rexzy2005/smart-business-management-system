/**
 * Scheduled Jobs
 * Cron jobs for automated tasks
 */

const cron = require('node-cron');
const Business = require('../models/Business');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

/**
 * Send daily sales summary
 * Runs every day at 11:00 PM
 */
exports.scheduleDailySummary = () => {
  cron.schedule('0 23 * * *', async () => {
    try {
      logger.info('Running daily summary job...');

      // Get all active businesses
      const businesses = await Business.find({ isActive: true });

      for (const business of businesses) {
        try {
          await notificationService.sendDailySummaryNotification(business);
        } catch (error) {
          logger.error(`Failed to send daily summary for ${business.name}:`, error);
        }
      }

      logger.info(`Daily summary job completed for ${businesses.length} businesses`);
    } catch (error) {
      logger.error('Daily summary job error:', error);
    }
  });

  logger.info('Daily summary job scheduled (11:00 PM daily)');
};

/**
 * Clean up old notifications
 * Runs every Sunday at 2:00 AM
 */
exports.scheduleNotificationCleanup = () => {
  cron.schedule('0 2 * * 0', async () => {
    try {
      logger.info('Running notification cleanup job...');

      const deletedCount = await notificationService.cleanupOldNotifications(30);
      logger.info(`Notification cleanup job completed. Deleted ${deletedCount} old notifications.`);
    } catch (error) {
      logger.error('Notification cleanup job error:', error);
    }
  });

  logger.info('Notification cleanup job scheduled (2:00 AM every Sunday)');
};

/**
 * Start all scheduled jobs
 */
exports.startScheduledJobs = () => {
  exports.scheduleDailySummary();
  exports.scheduleNotificationCleanup();
  logger.info('All scheduled jobs started');
};