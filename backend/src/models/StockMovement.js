/**
 * Stock Movement Model
 * Tracks all inventory changes for audit trail
 */

const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['in', 'out', 'adjustment'],
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    quantityBefore: {
      type: Number,
      required: true
    },
    quantityAfter: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      enum: [
        'purchase',
        'sale',
        'return',
        'damaged',
        'expired',
        'lost',
        'adjustment',
        'transfer',
        'other'
      ],
      required: true
    },
    notes: {
      type: String,
      maxlength: 500
    },
    reference: {
      type: String,
      trim: true
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Create indexes
stockMovementSchema.index({ business: 1, createdAt: -1 });
stockMovementSchema.index({ product: 1, createdAt: -1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);