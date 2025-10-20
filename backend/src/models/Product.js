/**
 * Product Model
 * Defines the schema for product/inventory management
 */

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Product name cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true // Allows multiple null values
    },
    barcode: {
      type: String,
      trim: true,
      sparse: true
    },

    // Category and Type (References business preferences)
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true
    },
    type: {
      type: String,
      required: [true, 'Product type is required'],
      trim: true
    },

    // Unit Information
    unitType: {
      type: String,
      required: [true, 'Unit type is required'],
      trim: true
    },
    unitPerCarton: {
      type: Number,
      required: [true, 'Unit per carton is required'],
      min: [1, 'Unit per carton must be at least 1'],
      default: 1
    },

    // Pricing Information
    buyingPricePerCarton: {
      type: Number,
      required: [true, 'Buying price per carton is required'],
      min: [0, 'Buying price cannot be negative']
    },
    sellingPricePerPiece: {
      type: Number,
      required: [true, 'Selling price per piece is required'],
      min: [0, 'Selling price cannot be negative']
    },

    // Additional Pricing (Optional)
    sellingPricePerCarton: {
      type: Number,
      min: [0, 'Selling price per carton cannot be negative']
    },
    buyingPricePerPiece: {
      type: Number,
      min: [0, 'Buying price per piece cannot be negative']
    },

    // Stock Information
    quantityInStock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Quantity cannot be negative']
    },
    cartonsInStock: {
      type: Number,
      default: 0,
      min: [0, 'Cartons in stock cannot be negative']
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
      min: [0, 'Low stock threshold cannot be negative']
    },

    // Product Status
    isActive: {
      type: Boolean,
      default: true
    },
    isLowStock: {
      type: Boolean,
      default: false
    },

    // Additional Product Details
    expiryDate: {
      type: Date
    },
    manufacturingDate: {
      type: Date
    },
    serialNumber: {
      type: String,
      trim: true
    },

    // Images
    images: [
      {
        url: {
          type: String,
          required: true
        },
        isPrimary: {
          type: Boolean,
          default: false
        },
        uploadedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    // Business Reference
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true
    },

    // Created By
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Last Updated By
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    // Metadata
    tags: [String],
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    }
  },
  {
    timestamps: true
  }
);

/**
 * Virtual field for profit margin per piece
 */
productSchema.virtual('profitMarginPerPiece').get(function () {
  const buyingPricePerPiece = this.buyingPricePerCarton / this.unitPerCarton;
  return this.sellingPricePerPiece - buyingPricePerPiece;
});

/**
 * Virtual field for profit percentage
 */
productSchema.virtual('profitPercentage').get(function () {
  const buyingPricePerPiece = this.buyingPricePerCarton / this.unitPerCarton;
  if (buyingPricePerPiece === 0) return 0;
  return ((this.sellingPricePerPiece - buyingPricePerPiece) / buyingPricePerPiece) * 100;
});

/**
 * Virtual field for total stock value (at buying price)
 */
productSchema.virtual('totalStockValue').get(function () {
  const buyingPricePerPiece = this.buyingPricePerCarton / this.unitPerCarton;
  return this.quantityInStock * buyingPricePerPiece;
});

/**
 * Virtual field for potential revenue (at selling price)
 */
productSchema.virtual('potentialRevenue').get(function () {
  return this.quantityInStock * this.sellingPricePerPiece;
});

/**
 * Pre-save middleware to auto-calculate derived fields
 */
productSchema.pre('save', function (next) {
  // Calculate buying price per piece if not provided
  if (!this.buyingPricePerPiece && this.buyingPricePerCarton && this.unitPerCarton) {
    this.buyingPricePerPiece = this.buyingPricePerCarton / this.unitPerCarton;
  }

  // Calculate selling price per carton if not provided
  if (!this.sellingPricePerCarton && this.sellingPricePerPiece && this.unitPerCarton) {
    this.sellingPricePerCarton = this.sellingPricePerPiece * this.unitPerCarton;
  }

  // Calculate cartons in stock
  if (this.unitPerCarton) {
    this.cartonsInStock = Math.floor(this.quantityInStock / this.unitPerCarton);
  }

  // Check if stock is low
  this.isLowStock = this.quantityInStock <= this.lowStockThreshold;

  // Generate SKU if not provided
  if (!this.sku) {
    const prefix = this.category.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    this.sku = `${prefix}-${timestamp}`;
  }

  next();
});

/**
 * Method to update stock quantity
 * @param {Number} quantity - Quantity to add (positive) or remove (negative)
 * @param {String} reason - Reason for stock change
 */
productSchema.methods.updateStock = function (quantity, reason = 'manual') {
  this.quantityInStock += quantity;
  
  if (this.quantityInStock < 0) {
    throw new Error('Insufficient stock');
  }
  
  return this.save();
};

/**
 * Method to get product summary
 */
productSchema.methods.toSummary = function () {
  return {
    id: this._id,
    name: this.name,
    category: this.category,
    type: this.type,
    unitType: this.unitType,
    quantityInStock: this.quantityInStock,
    sellingPricePerPiece: this.sellingPricePerPiece,
    isLowStock: this.isLowStock,
    isActive: this.isActive
  };
};

/**
 * Method to get detailed product info
 */
productSchema.methods.toDetailedInfo = function () {
  return {
    id: this._id,
    name: this.name,
    description: this.description,
    sku: this.sku,
    barcode: this.barcode,
    category: this.category,
    type: this.type,
    unitType: this.unitType,
    unitPerCarton: this.unitPerCarton,
    buyingPricePerCarton: this.buyingPricePerCarton,
    buyingPricePerPiece: this.buyingPricePerPiece,
    sellingPricePerPiece: this.sellingPricePerPiece,
    sellingPricePerCarton: this.sellingPricePerCarton,
    quantityInStock: this.quantityInStock,
    cartonsInStock: this.cartonsInStock,
    lowStockThreshold: this.lowStockThreshold,
    isLowStock: this.isLowStock,
    isActive: this.isActive,
    profitMarginPerPiece: this.profitMarginPerPiece,
    profitPercentage: this.profitPercentage?.toFixed(2),
    totalStockValue: this.totalStockValue,
    potentialRevenue: this.potentialRevenue,
    expiryDate: this.expiryDate,
    manufacturingDate: this.manufacturingDate,
    serialNumber: this.serialNumber,
    images: this.images,
    tags: this.tags,
    notes: this.notes,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Ensure virtuals are included in JSON
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

// Create indexes for better query performance
productSchema.index({ business: 1, name: 1 });
productSchema.index({ business: 1, category: 1 });
productSchema.index({ business: 1, isLowStock: 1 });
productSchema.index({ business: 1, isActive: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ barcode: 1 });

module.exports = mongoose.model('Product', productSchema);