/**
 * Business Controller
 * Handles business preferences management
 */

const Business = require('../models/Business');
const logger = require('../utils/logger');

/**
 * Get business preferences
 * @route GET /api/business/preferences
 * @access Private (Owner only)
 */
exports.getPreferences = async (req, res, next) => {
  try {
    // Get business from authenticated user
    const business = await Business.findById(req.user.business._id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Initialize preferences if not exists
    if (!business.preferences) {
      business.preferences = {
        categories: [],
        units: [],
        productTypes: []
      };
      await business.save();
    }

    logger.info(`Preferences retrieved for business: ${business.name}`);

    res.status(200).json({
      success: true,
      message: 'Preferences retrieved successfully',
      data: {
        preferences: business.preferences,
        stats: {
          totalCategories: business.preferences.categories?.length || 0,
          activeCategories: business.preferences.categories?.filter(c => c.isActive).length || 0,
          totalUnits: business.preferences.units?.length || 0,
          activeUnits: business.preferences.units?.filter(u => u.isActive).length || 0,
          totalProductTypes: business.preferences.productTypes?.length || 0,
          activeProductTypes: business.preferences.productTypes?.filter(pt => pt.isActive).length || 0
        }
      }
    });
  } catch (error) {
    logger.error('Get preferences error:', error);
    next(error);
  }
};

/**
 * Update business preferences
 * @route PUT /api/business/preferences
 * @access Private (Owner only)
 */
exports.updatePreferences = async (req, res, next) => {
  try {
    const { categories, units, productTypes } = req.body;

    // Get business from authenticated user
    const business = await Business.findById(req.user.business._id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Validate that at least one preference field is provided
    if (!categories && !units && !productTypes) {
      return res.status(400).json({
        success: false,
        message: 'At least one preference field (categories, units, or productTypes) must be provided'
      });
    }

    // Update categories if provided
    if (categories) {
      // Validate categories
      if (!Array.isArray(categories)) {
        return res.status(400).json({
          success: false,
          message: 'Categories must be an array'
        });
      }

      // Check for duplicate category names
      const categoryNames = categories.map(c => c.name?.toLowerCase().trim());
      const duplicates = categoryNames.filter((name, index) =>
        categoryNames.indexOf(name) !== index
      );

      if (duplicates.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Duplicate category names found: ${duplicates.join(', ')}`
        });
      }

      // Validate each category
      for (const category of categories) {
        if (!category.name || category.name.trim() === '') {
          return res.status(400).json({
            success: false,
            message: 'Each category must have a name'
          });
        }
      }

      business.preferences.categories = categories.map(cat => ({
        name: cat.name.trim(),
        description: cat.description?.trim() || '',
        icon: cat.icon?.trim() || '📦',
        color: cat.color?.trim() || '#6366f1',
        isActive: cat.isActive !== undefined ? cat.isActive : true,
        createdAt: cat.createdAt || new Date()
      }));
    }

    // Update units if provided
    if (units) {
      // Validate units
      if (!Array.isArray(units)) {
        return res.status(400).json({
          success: false,
          message: 'Units must be an array'
        });
      }

      // Check for duplicate unit abbreviations
      const unitAbbreviations = units.map(u => u.abbreviation?.toUpperCase().trim());
      const duplicates = unitAbbreviations.filter((abbr, index) =>
        unitAbbreviations.indexOf(abbr) !== index
      );

      if (duplicates.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Duplicate unit abbreviations found: ${duplicates.join(', ')}`
        });
      }

      // Validate each unit
      for (const unit of units) {
        if (!unit.name || unit.name.trim() === '') {
          return res.status(400).json({
            success: false,
            message: 'Each unit must have a name'
          });
        }
        if (!unit.abbreviation || unit.abbreviation.trim() === '') {
          return res.status(400).json({
            success: false,
            message: 'Each unit must have an abbreviation'
          });
        }
      }

      business.preferences.units = units.map(unit => ({
        name: unit.name.trim(),
        abbreviation: unit.abbreviation.toUpperCase().trim(),
        type: unit.type || 'quantity',
        isActive: unit.isActive !== undefined ? unit.isActive : true,
        createdAt: unit.createdAt || new Date()
      }));
    }

    // Update product types if provided
    if (productTypes) {
      // Validate product types
      if (!Array.isArray(productTypes)) {
        return res.status(400).json({
          success: false,
          message: 'Product types must be an array'
        });
      }

      // Check for duplicate product type names
      const typeNames = productTypes.map(pt => pt.name?.toLowerCase().trim());
      const duplicates = typeNames.filter((name, index) =>
        typeNames.indexOf(name) !== index
      );

      if (duplicates.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Duplicate product type names found: ${duplicates.join(', ')}`
        });
      }

      // Validate each product type
      for (const productType of productTypes) {
        if (!productType.name || productType.name.trim() === '') {
          return res.status(400).json({
            success: false,
            message: 'Each product type must have a name'
          });
        }
      }

      business.preferences.productTypes = productTypes.map(pt => ({
        name: pt.name.trim(),
        description: pt.description?.trim() || '',
        requiresSerialNumber: pt.requiresSerialNumber || false,
        requiresExpiryDate: pt.requiresExpiryDate || false,
        trackInventory: pt.trackInventory !== undefined ? pt.trackInventory : true,
        isActive: pt.isActive !== undefined ? pt.isActive : true,
        createdAt: pt.createdAt || new Date()
      }));
    }

    // Save updated business
    await business.save();

    logger.info(`Preferences updated for business: ${business.name}`);

    res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      data: {
        preferences: business.preferences,
        stats: {
          totalCategories: business.preferences.categories.length,
          activeCategories: business.preferences.categories.filter(c => c.isActive).length,
          totalUnits: business.preferences.units.length,
          activeUnits: business.preferences.units.filter(u => u.isActive).length,
          totalProductTypes: business.preferences.productTypes.length,
          activeProductTypes: business.preferences.productTypes.filter(pt => pt.isActive).length
        }
      }
    });
  } catch (error) {
    logger.error('Update preferences error:', error);
    next(error);
  }
};

/**
 * Get business profile
 * @route GET /api/business/profile
 * @access Private
 */
exports.getProfile = async (req, res, next) => {
  try {
    const business = await Business.findById(req.user.business._id)
      .populate('owner', 'firstName lastName email');

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        business: business.toPublicProfile(),
        owner: {
          name: `${business.owner.firstName} ${business.owner.lastName}`,
          email: business.owner.email
        }
      }
    });
  } catch (error) {
    logger.error('Get business profile error:', error);
    next(error);
  }
};

/**
 * Update business profile
 * @route PUT /api/business/profile
 * @access Private (Owner only)
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const {
      name,
      description,
      industry,
      email,
      phone,
      website,
      address,
      currency,
      timezone,
      registrationNumber,
      taxId
    } = req.body;

    const business = await Business.findById(req.user.business._id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Update fields if provided
    if (name) business.name = name;
    if (description !== undefined) business.description = description;
    if (industry) business.industry = industry;
    if (email) business.email = email;
    if (phone !== undefined) business.phone = phone;
    if (website !== undefined) business.website = website;
    if (address) business.address = { ...business.address, ...address };
    if (currency) business.currency = currency;
    if (timezone) business.timezone = timezone;
    if (registrationNumber !== undefined) business.registrationNumber = registrationNumber;
    if (taxId !== undefined) business.taxId = taxId;

    await business.save();

    logger.info(`Business profile updated: ${business.name}`);

    res.status(200).json({
      success: true,
      message: 'Business profile updated successfully',
      data: {
        business: business.toPublicProfile()
      }
    });
  } catch (error) {
    logger.error('Update business profile error:', error);
    next(error);
  }
};