/**
 * Business Model (Updated with Preferences)
 * Defines the schema for business/company profiles with preferences
 */

const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema(
  {
    // Business Information
    name: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      maxlength: [100, 'Business name cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    
    // Business Type
    industry: {
      type: String,
      enum: [
        'retail',
        'restaurant',
        'services',
        'manufacturing',
        'technology',
        'healthcare',
        'education',
        'real-estate',
        'finance',
        'other'
      ],
      default: 'other'
    },

    // Contact Information
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },
    phone: {
      type: String,
      trim: true
    },
    website: {
      type: String,
      trim: true
    },

    // Address
    address: {
      street: {
        type: String,
        trim: true
      },
      city: {
        type: String,
        trim: true
      },
      state: {
        type: String,
        trim: true
      },
      country: {
        type: String,
        trim: true,
        default: 'Nigeria'
      },
      postalCode: {
        type: String,
        trim: true
      }
    },

    // Business Registration
    registrationNumber: {
      type: String,
      trim: true,
      unique: true,
      sparse: true
    },
    taxId: {
      type: String,
      trim: true
    },

    // Business Settings
    currency: {
      type: String,
      default: 'NGN',
      enum: ['NGN', 'USD', 'EUR', 'GBP']
    },
    timezone: {
      type: String,
      default: 'Africa/Lagos'
    },

    // 🆕 Business Preferences
    preferences: {
      // Product Categories
      categories: [
        {
          name: {
            type: String,
            required: true,
            trim: true
          },
          description: {
            type: String,
            trim: true
          },
          icon: {
            type: String,
            trim: true
          },
          color: {
            type: String,
            trim: true,
            default: '#6366f1'
          },
          isActive: {
            type: Boolean,
            default: true
          },
          createdAt: {
            type: Date,
            default: Date.now
          }
        }
      ],

      // Units of Measurement
      units: [
        {
          name: {
            type: String,
            required: true,
            trim: true
          },
          abbreviation: {
            type: String,
            required: true,
            trim: true,
            uppercase: true
          },
          type: {
            type: String,
            enum: ['weight', 'volume', 'length', 'quantity', 'other'],
            default: 'quantity'
          },
          isActive: {
            type: Boolean,
            default: true
          },
          createdAt: {
            type: Date,
            default: Date.now
          }
        }
      ],

      // Product Types
      productTypes: [
        {
          name: {
            type: String,
            required: true,
            trim: true
          },
          description: {
            type: String,
            trim: true
          },
          requiresSerialNumber: {
            type: Boolean,
            default: false
          },
          requiresExpiryDate: {
            type: Boolean,
            default: false
          },
          trackInventory: {
            type: Boolean,
            default: true
          },
          isActive: {
            type: Boolean,
            default: true
          },
          createdAt: {
            type: Date,
            default: Date.now
          }
        }
      ]
    },

    // Owner (Primary User)
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // Business Status
    isActive: {
      type: Boolean,
      default: true
    },
    subscriptionStatus: {
      type: String,
      enum: ['trial', 'active', 'suspended', 'cancelled'],
      default: 'trial'
    },
    subscriptionPlan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free'
    },

    // Logo and Branding
    logo: {
      type: String,
      default: null
    },

    // Business Metrics
    totalEmployees: {
      type: Number,
      default: 1
    },
    totalRevenue: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

/**
 * Initialize default preferences for new businesses
 */
businessSchema.pre('save', function (next) {
  // Only set defaults if preferences are not already set
  if (this.isNew && (!this.preferences || !this.preferences.categories)) {
    this.preferences = {
      categories: [
        {
          name: 'Electronics',
          description: 'Electronic devices and accessories',
          icon: '💻',
          color: '#3b82f6'
        },
        {
          name: 'Clothing',
          description: 'Apparel and fashion items',
          icon: '👕',
          color: '#ec4899'
        },
        {
          name: 'Food & Beverages',
          description: 'Food items and drinks',
          icon: '🍔',
          color: '#f59e0b'
        }
      ],
      units: [
        {
          name: 'Piece',
          abbreviation: 'PCS',
          type: 'quantity'
        },
        {
          name: 'Kilogram',
          abbreviation: 'KG',
          type: 'weight'
        },
        {
          name: 'Liter',
          abbreviation: 'L',
          type: 'volume'
        },
        {
          name: 'Dozen',
          abbreviation: 'DZ',
          type: 'quantity'
        }
      ],
      productTypes: [
        {
          name: 'Physical Product',
          description: 'Tangible goods that can be shipped',
          requiresSerialNumber: false,
          requiresExpiryDate: false,
          trackInventory: true
        },
        {
          name: 'Perishable',
          description: 'Products with expiry dates',
          requiresSerialNumber: false,
          requiresExpiryDate: true,
          trackInventory: true
        },
        {
          name: 'Service',
          description: 'Non-physical services',
          requiresSerialNumber: false,
          requiresExpiryDate: false,
          trackInventory: false
        }
      ]
    };
  }
  next();
});

/**
 * Method to get business public profile
 */
businessSchema.methods.toPublicProfile = function () {
  return {
    id: this._id,
    name: this.name,
    description: this.description,
    industry: this.industry,
    email: this.email,
    phone: this.phone,
    website: this.website,
    address: this.address,
    currency: this.currency,
    logo: this.logo,
    subscriptionPlan: this.subscriptionPlan,
    createdAt: this.createdAt
  };
};

// Create indexes
businessSchema.index({ owner: 1 });
businessSchema.index({ name: 1 });

module.exports = mongoose.model('Business', businessSchema);