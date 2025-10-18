/**
 * Authentication Controller
 * Handles user registration, login, and authentication logic
 */

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Business = require('../models/Business');
const logger = require('../utils/logger');

/**
 * Generate JWT Token
 * @param {String} id - User ID
 * @returns {String} - JWT token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

/**
 * Register new user and create business
 * @route POST /api/auth/register
 * @access Public
 */
exports.register = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      businessName,
      industry,
      businessEmail,
      businessPhone
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !businessName) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: firstName, lastName, email, password, businessName'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Step 1: Create a temporary user document to get the user ID
    const tempUser = new User({
      firstName,
      lastName,
      email,
      password,
      phone,
      role: 'owner'
    });

    // Save without validation to bypass the required business field
    await tempUser.save({ session, validateBeforeSave: false });

    // Step 2: Create business with the user's ID as owner
    const business = new Business({
      name: businessName,
      industry: industry || 'other',
      email: businessEmail || email,
      phone: businessPhone || phone,
      owner: tempUser._id
    });

    await business.save({ session });

    // Step 3: Update user with business reference
    tempUser.business = business._id;
    tempUser.lastLogin = new Date();

    // Now save with validation
    await tempUser.save({ session, validateBeforeSave: true });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // Generate token
    const token = generateToken(tempUser._id);

    logger.info(`New user registered: ${email}`);

    // Send response
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        token,
        user: tempUser.toPublicProfile(),
        business: business.toPublicProfile()
      }
    });
  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction();
    session.endSession();

    logger.error('Registration error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `A user with this ${field} already exists`
      });
    }

    next(error);
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 * @access Public
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user and include password field
    const user = await User.findOne({ email })
      .select('+password')
      .populate('business');

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if business exists
    if (!user.business) {
      return res.status(403).json({
        success: false,
        message: 'No business associated with this account. Please contact support.'
      });
    }

    // Check if business is active
    if (!user.business.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your business account is not active. Please contact support.'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    logger.info(`User logged in: ${email}`);

    // Remove password from user object
    user.password = undefined;

    // Send response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: user.toPublicProfile(),
        business: user.business.toPublicProfile()
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    next(error);
  }
};

/**
 * Get current logged in user
 * @route GET /api/auth/me
 * @access Private
 */
exports.getMe = async (req, res, next) => {
  try {
    // User is already attached to req by auth middleware
    const user = await User.findById(req.user.id)
      .populate('business')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: user.toPublicProfile(),
        business: user.business ? user.business.toPublicProfile() : null
      }
    });
  } catch (error) {
    logger.error('Get me error:', error);
    next(error);
  }
};

/**
 * Update user password
 * @route PUT /api/auth/update-password
 * @access Private
 */
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current password and new password'
      });
    }

    // Validate new password strength
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Generate new token
    const token = generateToken(user._id);

    logger.info(`Password updated for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
      data: {
        token
      }
    });
  } catch (error) {
    logger.error('Update password error:', error);
    next(error);
  }
};

/**
 * Logout user (client-side token removal)
 * @route POST /api/auth/logout
 * @access Private
 */
exports.logout = async (req, res, next) => {
  try {
    logger.info(`User logged out: ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};