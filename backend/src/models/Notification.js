/**
 * Notification Model
 * Defines the schema for in-app notifications
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // Business Reference
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true
    },

    // User Reference (who should see this notification)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },

    // Notification Type
    type: {
      type: String,
      enum: [
        'low_stock',
        'out_of_stock',
        'sale_completed',
        'payment_received',
        'payment_due',
        'daily_summary',
        'system',
        'other'
      ],
      required: true,
      index: true
    },

    // Priority Level
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },

    // Notification Content
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters']
    },

    // Optional Data
    data: {
      type: mongoose.Schema.Types.Mixed
    },

    // Reference to related entity
    referenceType: {
      type: String,
      enum: ['product', 'sale', 'transaction', 'user', 'other']
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId
    },

    // Action Link (optional)
    actionUrl: {
      type: String,
      trim: true
    },

    // Read Status
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: {
      type: Date
    },

    // Email Sent
    emailSent: {
      type: Boolean,
      default: false
    },
    emailSentAt: {
      type: Date
    },

    // Expiry (for temporary notifications)
    expiresAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

/**
 * Index for efficient queries
 */
notificationSchema.index({ business: 1, user: 1, isRead: 1 });
notificationSchema.index({ business: 1, type: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Mark notification as read
 */
notificationSchema.methods.markAsRead = async function () {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

/**
 * Get notification summary
 */
notificationSchema.methods.toSummary = function () {
  return {
    id: this._id,
    type: this.type,
    priority: this.priority,
    title: this.title,
    message: this.message,
    isRead: this.isRead,
    createdAt: this.createdAt
  };
};

/**
 * Get detailed notification info
 */
notificationSchema.methods.toDetailedInfo = function () {
  return {
    id: this._id,
    type: this.type,
    priority: this.priority,
    title: this.title,
    message: this.message,
    data: this.data,
    referenceType: this.referenceType,
    referenceId: this.referenceId,
    actionUrl: this.actionUrl,
    isRead: this.isRead,
    readAt: this.readAt,
    emailSent: this.emailSent,
    emailSentAt: this.emailSentAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('Notification', notificationSchema);