/**
 * User Model
 * Defines the schema for user authentication and profile
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // Personal Information
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false // Don't include password in queries by default
    },

    // Phone number
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9+\-\s()]*$/, 'Please provide a valid phone number']
    },

    // Business Reference
    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true
    },

    // Role and Permissions
    role: {
      type: String,
      enum: ['owner', 'admin', 'manager', 'employee'],
      default: 'owner'
    },

    // Account Status
    isActive: {
      type: Boolean,
      default: true
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },

    // Last Login
    lastLogin: {
      type: Date
    },

    // Password Reset
    resetPasswordToken: String,
    resetPasswordExpire: Date
  },
  {
    timestamps: true // Adds createdAt and updatedAt
  }
);

/**
 * Pre-save middleware to hash password
 * Only runs if password is modified
 */
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generate salt
    const salt = await bcrypt.genSalt(
      parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10
    );

    // Hash password
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Method to compare password for login
 * @param {String} candidatePassword - Password to check
 * @returns {Boolean} - True if password matches
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Method to get user's full name
 * @returns {String} - Full name
 */
userSchema.methods.getFullName = function () {
  return `${this.firstName} ${this.lastName}`;
};

/**
 * Method to get public profile (without sensitive data)
 * @returns {Object} - Public user profile
 */
userSchema.methods.toPublicProfile = function () {
  return {
    id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    phone: this.phone,
    role: this.role,
    business: this.business,
    isActive: this.isActive,
    isEmailVerified: this.isEmailVerified,
    createdAt: this.createdAt
  };
};

// Create indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ business: 1 });

module.exports = mongoose.model('User', userSchema);