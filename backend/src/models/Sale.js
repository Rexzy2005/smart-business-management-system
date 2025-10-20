/**
 * Sale Model
 * Defines the schema for sales transactions
 */

const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  productName: {
    type: String,
    required: true
  },
  productSKU: {
    type: String
  },
  quantitySold: {
    type: Number,
    required: [true, 'Quantity sold is required'],
    min: [1, 'Quantity must be at least 1']
  },
  unitType: {
    type: String,
    required: [true, 'Unit type is required'],
    enum: ['piece', 'carton']
  },
  // Pricing at time of sale (important for historical accuracy)
  pricePerUnit: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  costPerUnit: {
    type: Number,
    required: true,
    min: [0, 'Cost cannot be negative']
  },
  // Calculated fields
  subtotal: {
    type: Number,
    required: true
  },
  profit: {
    type: Number,
    required: true
  }
});

const saleSchema = new mongoose.Schema(
  {
    // Business Reference
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true
    },

    // Sale Information
    saleDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    saleNumber: {
      type: String,
      unique: true,
      sparse: true
    },

    // Items Sold
    items: {
      type: [saleItemSchema],
      required: [true, 'At least one item is required'],
      validate: {
        validator: function(items) {
          return items && items.length > 0;
        },
        message: 'Sale must contain at least one item'
      }
    },

    // Totals
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative']
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative']
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, 'Tax cannot be negative']
    },
    total: {
      type: Number,
      required: true,
      min: [0, 'Total cannot be negative']
    },
    totalCost: {
      type: Number,
      required: true
    },
    totalProfit: {
      type: Number,
      required: true
    },

    // Payment Information
    paymentStatus: {
      type: String,
      enum: ['paid', 'pending', 'partial', 'cancelled'],
      default: 'paid',
      required: true
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'transfer', 'pos', 'mobile_money', 'other'],
      default: 'cash'
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: [0, 'Amount paid cannot be negative']
    },
    amountDue: {
      type: Number,
      default: 0,
      min: [0, 'Amount due cannot be negative']
    },

    // Additional Information
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    receiptNumber: {
      type: String,
      trim: true
    },

    // Sale Status
    status: {
      type: String,
      enum: ['completed', 'pending', 'cancelled', 'refunded'],
      default: 'completed'
    },

    // Recorded By
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Cancellation/Refund Info
    cancelledAt: {
      type: Date
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    cancellationReason: {
      type: String,
      maxlength: 500
    }
  },
  {
    timestamps: true
  }
);

/**
 * Pre-save middleware to generate sale number
 */
saleSchema.pre('save', async function(next) {
  if (this.isNew && !this.saleNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Find the count of sales for today
    const todayStart = new Date(date.setHours(0, 0, 0, 0));
    const todayEnd = new Date(date.setHours(23, 59, 59, 999));
    
    const count = await this.constructor.countDocuments({
      business: this.business,
      saleDate: { $gte: todayStart, $lte: todayEnd }
    });
    
    const sequence = String(count + 1).padStart(4, '0');
    this.saleNumber = `SAL-${year}${month}${day}-${sequence}`;
  }
  
  next();
});

/**
 * Calculate and update profit margin percentage
 */
saleSchema.virtual('profitMargin').get(function() {
  if (this.subtotal === 0) return 0;
  return ((this.totalProfit / this.subtotal) * 100).toFixed(2);
});

/**
 * Method to get sale summary
 */
saleSchema.methods.toSummary = function() {
  return {
    id: this._id,
    saleNumber: this.saleNumber,
    saleDate: this.saleDate,
    total: this.total,
    totalProfit: this.totalProfit,
    profitMargin: this.profitMargin,
    paymentStatus: this.paymentStatus,
    paymentMethod: this.paymentMethod,
    status: this.status,
    itemsCount: this.items.length,
    createdAt: this.createdAt
  };
};

/**
 * Method to get detailed sale info
 */
saleSchema.methods.toDetailedInfo = function() {
  return {
    id: this._id,
    saleNumber: this.saleNumber,
    saleDate: this.saleDate,
    items: this.items,
    subtotal: this.subtotal,
    discount: this.discount,
    tax: this.tax,
    total: this.total,
    totalCost: this.totalCost,
    totalProfit: this.totalProfit,
    profitMargin: this.profitMargin,
    paymentStatus: this.paymentStatus,
    paymentMethod: this.paymentMethod,
    amountPaid: this.amountPaid,
    amountDue: this.amountDue,
    notes: this.notes,
    receiptNumber: this.receiptNumber,
    status: this.status,
    recordedBy: this.recordedBy,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Ensure virtuals are included in JSON
saleSchema.set('toJSON', { virtuals: true });
saleSchema.set('toObject', { virtuals: true });

// Create indexes for better query performance
saleSchema.index({ business: 1, saleDate: -1 });
saleSchema.index({ business: 1, status: 1 });
saleSchema.index({ business: 1, paymentStatus: 1 });
saleSchema.index({ saleNumber: 1 });
saleSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Sale', saleSchema);