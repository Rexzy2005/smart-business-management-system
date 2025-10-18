/**
 * Validation Middleware
 * Validates request data using express-validator
 */

const { body, validationResult } = require('express-validator');

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