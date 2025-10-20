/**
 * Product Controller
 * Handles product CRUD operations and inventory management
 */
const notificationService = require('../services/notificationService');
const Product = require('../models/Product');
const logger = require('../utils/logger');

/**
 * Create new product
 * @route POST /api/products
 * @access Private
 */
exports.createProduct = async (req, res, next) => {
  try {
    const {
      name,
      description,
      sku,
      barcode,
      category,
      type,
      unitType,
      unitPerCarton,
      buyingPricePerCarton,
      sellingPricePerPiece,
      quantityInStock,
      lowStockThreshold,
      expiryDate,
      manufacturingDate,
      serialNumber,
      images,
      tags,
      notes
    } = req.body;

    // Check if product with same name exists for this business
    const existingProduct = await Product.findOne({
      business: req.user.business._id,
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'A product with this name already exists in your inventory'
      });
    }

    // Create product
    const product = await Product.create({
      name,
      description,
      sku,
      barcode,
      category,
      type,
      unitType,
      unitPerCarton,
      buyingPricePerCarton,
      sellingPricePerPiece,
      quantityInStock: quantityInStock || 0,
      lowStockThreshold: lowStockThreshold || 10,
      expiryDate,
      manufacturingDate,
      serialNumber,
      images,
      tags,
      notes,
      business: req.user.business._id,
      createdBy: req.user.id
    });

    logger.info(`Product created: ${product.name} by ${req.user.email}`);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: {
        product: product.toDetailedInfo()
      }
    });
  } catch (error) {
    logger.error('Create product error:', error);
    next(error);
  }
};

/**
 * Get all products with filters, search, and pagination
 * @route GET /api/products
 * @access Private
 */
exports.getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      type,
      isActive,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    // Build query
    const query = { business: req.user.business._id };

    // Search by name, SKU, or barcode
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by type
    if (type) {
      query.type = type;
    }

    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    // Execute query
    const products = await Product.find(query)
      .sort({ [sortBy]: sortOrder })
      .limit(parseInt(limit))
      .skip(skip)
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    // Get total count
    const total = await Product.countDocuments(query);

    // Get summary statistics
    const stats = await Product.aggregate([
      { $match: { business: req.user.business._id } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          activeProducts: {
            $sum: { $cond: ['$isActive', 1, 0] }
          },
          lowStockProducts: {
            $sum: { $cond: ['$isLowStock', 1, 0] }
          },
          totalStockValue: {
            $sum: {
              $multiply: [
                '$quantityInStock',
                { $divide: ['$buyingPricePerCarton', '$unitPerCarton'] }
              ]
            }
          },
          totalPotentialRevenue: {
            $sum: { $multiply: ['$quantityInStock', '$sellingPricePerPiece'] }
          }
        }
      }
    ]);

    logger.info(`Products listed: ${products.length} products for ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      data: {
        products: products.map(p => p.toDetailedInfo()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        stats: stats[0] || {
          totalProducts: 0,
          activeProducts: 0,
          lowStockProducts: 0,
          totalStockValue: 0,
          totalPotentialRevenue: 0
        }
      }
    });
  } catch (error) {
    logger.error('Get products error:', error);
    next(error);
  }
};

/**
 * Get single product by ID
 * @route GET /api/products/:id
 * @access Private
 */
exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      business: req.user.business._id
    })
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        product: product.toDetailedInfo()
      }
    });
  } catch (error) {
    logger.error('Get product error:', error);
    next(error);
  }
};

/**
 * Update product
 * @route PUT /api/products/:id
 * @access Private
 */
exports.updateProduct = async (req, res, next) => {
  try {
    const {
      name,
      description,
      sku,
      barcode,
      category,
      type,
      unitType,
      unitPerCarton,
      buyingPricePerCarton,
      sellingPricePerPiece,
      quantityInStock,
      lowStockThreshold,
      isActive,
      expiryDate,
      manufacturingDate,
      serialNumber,
      images,
      tags,
      notes
    } = req.body;

    // Find product
    const product = await Product.findOne({
      _id: req.params.id,
      business: req.user.business._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if name is being changed and if it conflicts
    if (name && name !== product.name) {
      const existingProduct = await Product.findOne({
        business: req.user.business._id,
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: product._id }
      });

      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'A product with this name already exists'
        });
      }
    }

    // Update fields
    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (sku !== undefined) product.sku = sku;
    if (barcode !== undefined) product.barcode = barcode;
    if (category !== undefined) product.category = category;
    if (type !== undefined) product.type = type;
    if (unitType !== undefined) product.unitType = unitType;
    if (unitPerCarton !== undefined) product.unitPerCarton = unitPerCarton;
    if (buyingPricePerCarton !== undefined) product.buyingPricePerCarton = buyingPricePerCarton;
    if (sellingPricePerPiece !== undefined) product.sellingPricePerPiece = sellingPricePerPiece;
    if (quantityInStock !== undefined) product.quantityInStock = quantityInStock;
    if (lowStockThreshold !== undefined) product.lowStockThreshold = lowStockThreshold;
    if (isActive !== undefined) product.isActive = isActive;
    if (expiryDate !== undefined) product.expiryDate = expiryDate;
    if (manufacturingDate !== undefined) product.manufacturingDate = manufacturingDate;
    if (serialNumber !== undefined) product.serialNumber = serialNumber;
    if (images !== undefined) product.images = images;
    if (tags !== undefined) product.tags = tags;
    if (notes !== undefined) product.notes = notes;

    product.updatedBy = req.user.id;

    await product.save();

    logger.info(`Product updated: ${product.name} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: {
        product: product.toDetailedInfo()
      }
    });
  } catch (error) {
    logger.error('Update product error:', error);
    next(error);
  }
};

/**
 * Delete product
 * @route DELETE /api/products/:id
 * @access Private (Owner/Admin only)
 */
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      business: req.user.business._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Soft delete by deactivating
    product.isActive = false;
    await product.save();

    logger.info(`Product deleted: ${product.name} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    logger.error('Delete product error:', error);
    next(error);
  }
};

/**
 * Get low stock products
 * @route GET /api/products/low-stock
 * @access Private
 */
exports.getLowStockProducts = async (req, res, next) => {
  try {
    const { threshold } = req.query;
    const customThreshold = threshold ? parseInt(threshold) : null;

    // Build query
    const query = {
      business: req.user.business._id,
      isActive: true
    };

    // Use custom threshold if provided, otherwise use product's own threshold
    if (customThreshold !== null) {
      query.quantityInStock = { $lte: customThreshold };
    } else {
      query.isLowStock = true;
    }

    // Get low stock products
    const products = await Product.find(query)
      .sort({ quantityInStock: 1 })
      .populate('createdBy', 'firstName lastName');

    logger.info(`Low stock products retrieved: ${products.length} products`);

    res.status(200).json({
      success: true,
      message: 'Low stock products retrieved successfully',
      data: {
        products: products.map(p => p.toDetailedInfo()),
        count: products.length,
        threshold: customThreshold || 'individual thresholds'
      }
    });
  } catch (error) {
    logger.error('Get low stock products error:', error);
    next(error);
  }
};

/**
 * Update product stock
 * @route PATCH /api/products/:id/stock
 * @access Private
 */
exports.updateStock = async (req, res, next) => {
  try {
    const { quantity, reason } = req.body;

    if (!quantity || quantity === 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity is required and must not be zero'
      });
    }

    const product = await Product.findOne({
      _id: req.params.id,
      business: req.user.business._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Update stock
    try {
      await product.updateStock(quantity, reason);
      
      // ⭐ CHECK FOR STOCK ALERTS ⭐
      if (product.quantityInStock === 0) {
        await notificationService.notifyOutOfStock(product, req.user.business);
      } else if (product.isLowStock && quantity < 0) {
        await notificationService.notifyLowStock(product, req.user.business);
      }

      logger.info(
        `Stock updated for ${product.name}: ${quantity > 0 ? '+' : ''}${quantity} (${reason})`
      );

      res.status(200).json({
        success: true,
        message: 'Stock updated successfully',
        data: {
          product: product.toDetailedInfo(),
          change: quantity
        }
      });
    } catch (stockError) {
      return res.status(400).json({
        success: false,
        message: stockError.message
      });
    }
  } catch (error) {
    logger.error('Update stock error:', error);
    next(error);
  }
};

/**
 * Get product statistics
 * @route GET /api/products/stats
 * @access Private
 */
exports.getProductStats = async (req, res, next) => {
  try {
    const stats = await Product.aggregate([
      { $match: { business: req.user.business._id, isActive: true } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalQuantity: { $sum: '$quantityInStock' },
          lowStockCount: {
            $sum: { $cond: ['$isLowStock', 1, 0] }
          },
          totalStockValue: {
            $sum: {
              $multiply: [
                '$quantityInStock',
                { $divide: ['$buyingPricePerCarton', '$unitPerCarton'] }
              ]
            }
          },
          totalPotentialRevenue: {
            $sum: { $multiply: ['$quantityInStock', '$sellingPricePerPiece'] }
          }
        }
      }
    ]);

    // Get category breakdown
    const categoryStats = await Product.aggregate([
      { $match: { business: req.user.business._id, isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantityInStock' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: stats[0] || {
          totalProducts: 0,
          totalQuantity: 0,
          lowStockCount: 0,
          totalStockValue: 0,
          totalPotentialRevenue: 0
        },
        byCategory: categoryStats
      }
    });
  } catch (error) {
    logger.error('Get product stats error:', error);
    next(error);
  }
};