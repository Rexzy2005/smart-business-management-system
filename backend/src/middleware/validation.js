/**
 * Validation Middleware
 * Validates request data using express-validator
 */

const { body, param, query, validationResult } = require('express-validator');


/**
 * Handle validation errors
 */
exports.validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }

  next();
};

/**
 * Registration validation rules
 */
exports.registerValidation = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters'),

  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('businessName')
    .trim()
    .notEmpty().withMessage('Business name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Business name must be between 2 and 100 characters'),

  body('industry')
    .optional()
    .isIn(['retail', 'restaurant', 'services', 'manufacturing', 'technology', 'healthcare', 'education', 'real-estate', 'finance', 'other'])
    .withMessage('Invalid industry type')
];

/**
 * Login validation rules
 */
exports.loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
];

/**
 * Business preferences validation rules
 */
exports.preferencesValidation = [
  body('categories')
    .optional()
    .isArray().withMessage('Categories must be an array'),

  body('categories.*.name')
    .if(body('categories').exists())
    .notEmpty().withMessage('Category name is required')
    .isLength({ max: 100 }).withMessage('Category name cannot exceed 100 characters'),

  body('units')
    .optional()
    .isArray().withMessage('Units must be an array'),

  body('units.*.name')
    .if(body('units').exists())
    .notEmpty().withMessage('Unit name is required'),

  body('units.*.abbreviation')
    .if(body('units').exists())
    .notEmpty().withMessage('Unit abbreviation is required')
    .isLength({ max: 10 }).withMessage('Unit abbreviation cannot exceed 10 characters'),

  body('units.*.type')
    .if(body('units').exists())
    .optional()
    .isIn(['weight', 'volume', 'length', 'quantity', 'other'])
    .withMessage('Invalid unit type'),

  body('productTypes')
    .optional()
    .isArray().withMessage('Product types must be an array'),

  body('productTypes.*.name')
    .if(body('productTypes').exists())
    .notEmpty().withMessage('Product type name is required')
    .isLength({ max: 100 }).withMessage('Product type name cannot exceed 100 characters')
];

/**
 * Product creation validation rules
 */
exports.createProductValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ min: 2, max: 200 }).withMessage('Product name must be between 2 and 200 characters'),

  body('category')
    .trim()
    .notEmpty().withMessage('Category is required'),

  body('type')
    .trim()
    .notEmpty().withMessage('Product type is required'),

  body('unitType')
    .trim()
    .notEmpty().withMessage('Unit type is required'),

  body('unitPerCarton')
    .isInt({ min: 1 }).withMessage('Unit per carton must be at least 1'),

  body('buyingPricePerCarton')
    .isFloat({ min: 0 }).withMessage('Buying price must be a positive number'),

  body('sellingPricePerPiece')
    .isFloat({ min: 0 }).withMessage('Selling price must be a positive number'),

  body('quantityInStock')
    .optional()
    .isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),

  body('lowStockThreshold')
    .optional()
    .isInt({ min: 0 }).withMessage('Low stock threshold must be a non-negative integer')
];

/**
 * Product update validation rules
 */
exports.updateProductValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage('Product name must be between 2 and 200 characters'),

  body('unitPerCarton')
    .optional()
    .isInt({ min: 1 }).withMessage('Unit per carton must be at least 1'),

  body('buyingPricePerCarton')
    .optional()
    .isFloat({ min: 0 }).withMessage('Buying price must be a positive number'),

  body('sellingPricePerPiece')
    .optional()
    .isFloat({ min: 0 }).withMessage('Selling price must be a positive number'),

  body('quantityInStock')
    .optional()
    .isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer')
];

/**
 * Stock update validation rules
 */
exports.updateStockValidation = [
  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isInt().withMessage('Quantity must be an integer')
    .custom((value) => value !== 0).withMessage('Quantity cannot be zero'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Reason cannot exceed 100 characters')
];

/**
 * Product ID validation
 */
exports.productIdValidation = [
  param('id')
    .isMongoId().withMessage('Invalid product ID')
];

/**
 * Query parameter validation
 */
exports.queryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

  query('threshold')
    .optional()
    .isInt({ min: 0 }).withMessage('Threshold must be a non-negative integer')
];

/**
 * Record sale validation rules
 */
exports.recordSaleValidation = [
  body('items')
    .isArray({ min: 1 }).withMessage('At least one item is required')
    .custom((items) => {
      for (const item of items) {
        if (!item.productId || !item.quantity || !item.unitType) {
          throw new Error('Each item must have productId, quantity, and unitType');
        }
        if (item.quantity <= 0) {
          throw new Error('Quantity must be greater than 0');
        }
        if (!['piece', 'carton'].includes(item.unitType)) {
          throw new Error('Unit type must be either "piece" or "carton"');
        }
      }
      return true;
    }),

  body('saleDate')
    .optional()
    .isISO8601().withMessage('Invalid date format'),

  body('discount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Discount cannot be negative'),

  body('tax')
    .optional()
    .isFloat({ min: 0 }).withMessage('Tax cannot be negative'),

  body('paymentStatus')
    .optional()
    .isIn(['paid', 'pending', 'partial']).withMessage('Invalid payment status'),

  body('paymentMethod')
    .optional()
    .isIn(['cash', 'card', 'transfer', 'pos', 'mobile_money', 'other'])
    .withMessage('Invalid payment method'),

  body('amountPaid')
    .optional()
    .isFloat({ min: 0 }).withMessage('Amount paid cannot be negative'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
];

/**
 * Update payment validation rules
 */
exports.updatePaymentValidation = [
  body('amountPaid')
    .notEmpty().withMessage('Amount paid is required')
    .isFloat({ min: 0 }).withMessage('Amount paid must be a positive number'),

  body('paymentMethod')
    .optional()
    .isIn(['cash', 'card', 'transfer', 'pos', 'mobile_money', 'other'])
    .withMessage('Invalid payment method')
];

/**
 * Sale ID validation
 */
exports.saleIdValidation = [
  param('id')
    .isMongoId().withMessage('Invalid sale ID')
];

/**
 * Create transaction validation rules
 */
exports.createTransactionValidation = [
  body('type')
    .isIn(['income', 'expense']).withMessage('Type must be either income or expense'),

  body('amount')
    .isFloat({ min: 0 }).withMessage('Amount must be a positive number'),

  body('category')
    .trim()
    .notEmpty().withMessage('Category is required')
    .isLength({ max: 100 }).withMessage('Category cannot exceed 100 characters'),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),

  body('transactionDate')
    .optional()
    .isISO8601().withMessage('Invalid date format'),

  body('paymentMethod')
    .optional()
    .isIn(['cash', 'card', 'transfer', 'pos', 'mobile_money', 'other'])
    .withMessage('Invalid payment method'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Notes cannot exceed 1000 characters')
];

/**
 * Update transaction validation rules
 */
exports.updateTransactionValidation = [
  body('type')
    .optional()
    .isIn(['income', 'expense']).withMessage('Type must be either income or expense'),

  body('amount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Amount must be a positive number'),

  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Category cannot exceed 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters')
];

/**
 * Transaction ID validation
 */
exports.transactionIdValidation = [
  param('id')
    .isMongoId().withMessage('Invalid transaction ID')
];

/**
 * Send notification validation rules
 */
exports.sendNotificationValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),

  body('message')
    .trim()
    .notEmpty().withMessage('Message is required')
    .isLength({ max: 1000 }).withMessage('Message cannot exceed 1000 characters'),

  body('type')
    .optional()
    .isIn(['low_stock', 'out_of_stock', 'sale_completed', 'payment_received', 'payment_due', 'daily_summary', 'system', 'other'])
    .withMessage('Invalid notification type'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level'),

  body('userId')
    .optional()
    .isMongoId().withMessage('Invalid user ID'),

  body('sendEmail')
    .optional()
    .isBoolean().withMessage('sendEmail must be a boolean')
];

/**
 * Notification ID validation
 */
exports.notificationIdValidation = [
  param('id')
    .isMongoId().withMessage('Invalid notification ID')
];