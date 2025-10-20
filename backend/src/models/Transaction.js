/**
 * Transaction Model
 * Defines the schema for income and expense tracking
 */

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    // Business Reference
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true
    },

    // Transaction Type
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: [true, 'Transaction type is required'],
      index: true
    },

    // Amount
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount must be positive']
    },

    // Category
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true
    },

    // Description
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },

    // Transaction Date
    transactionDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },

    // Payment Method (for income)
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'transfer', 'pos', 'mobile_money', 'other'],
      default: 'cash'
    },

    // Reference Information
    referenceType: {
      type: String,
      enum: ['sale', 'manual', 'refund', 'other'],
      default: 'manual'
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'referenceType'
    },

    // Additional Information
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters']
    },
    attachments: [{
      url: String,
      filename: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],

    // Tags for filtering
    tags: [String],

    // Recorded By
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Status
    status: {
      type: String,
      enum: ['completed', 'pending', 'cancelled'],
      default: 'completed'
    }
  },
  {
    timestamps: true
  }
);

/**
 * Virtual field for formatted amount
 */
transactionSchema.virtual('formattedAmount').get(function() {
  const sign = this.type === 'expense' ? '-' : '+';
  return `${sign}₦${this.amount.toLocaleString()}`;
});

/**
 * Method to get transaction summary
 */
transactionSchema.methods.toSummary = function() {
  return {
    id: this._id,
    type: this.type,
    amount: this.amount,
    category: this.category,
    description: this.description,
    transactionDate: this.transactionDate,
    paymentMethod: this.paymentMethod,
    status: this.status,
    createdAt: this.createdAt
  };
};

/**
 * Method to get detailed transaction info
 */
transactionSchema.methods.toDetailedInfo = function() {
  return {
    id: this._id,
    type: this.type,
    amount: this.amount,
    formattedAmount: this.formattedAmount,
    category: this.category,
    description: this.description,
    transactionDate: this.transactionDate,
    paymentMethod: this.paymentMethod,
    referenceType: this.referenceType,
    referenceId: this.referenceId,
    notes: this.notes,
    attachments: this.attachments,
    tags: this.tags,
    recordedBy: this.recordedBy,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Ensure virtuals are included in JSON
transactionSchema.set('toJSON', { virtuals: true });
transactionSchema.set('toObject', { virtuals: true });

// Create indexes for better query performance
transactionSchema.index({ business: 1, transactionDate: -1 });
transactionSchema.index({ business: 1, type: 1 });
transactionSchema.index({ business: 1, category: 1 });
transactionSchema.index({ business: 1, status: 1 });
transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);