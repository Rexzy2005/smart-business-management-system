/**
 * Sale Controller
 * Handles sales recording and management
 */

const Sale = require('../models/Sale');
const Product = require('../models/Product');
const logger = require('../utils/logger');
const mongoose = require('mongoose');
const notificationService = require('../services/notificationService');

/**
 * Record a new sale
 * @route POST /api/sales
 * @access Private
 */
exports.recordSale = async (req, res, next) => {
  // Start a session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      saleDate,
      items,
      discount,
      tax,
      paymentStatus,
      paymentMethod,
      amountPaid,
      notes,
      receiptNumber
    } = req.body;

    // Validate items array
    if (!items || !Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'At least one sale item is required'
      });
    }

    // Process each item and calculate totals
    const processedItems = [];
    let subtotal = 0;
    let totalCost = 0;
    let totalProfit = 0;

    for (const item of items) {
      // Find product
      const product = await Product.findOne({
        _id: item.productId,
        business: req.user.business._id,
        isActive: true
      }).session(session);

      if (!product) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.productId}`
        });
      }

      // Determine quantity in pieces
      let quantityInPieces;
      if (item.unitType === 'carton') {
        quantityInPieces = item.quantity * product.unitPerCarton;
      } else if (item.unitType === 'piece') {
        quantityInPieces = item.quantity;
      } else {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'Invalid unit type. Must be "piece" or "carton"'
        });
      }

      // Check stock availability
      if (product.quantityInStock < quantityInPieces) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.quantityInStock}, Required: ${quantityInPieces}`
        });
      }

      // Calculate prices
      const pricePerUnit = item.unitType === 'carton'
        ? product.sellingPricePerCarton
        : product.sellingPricePerPiece;

      const costPerUnit = item.unitType === 'carton'
        ? product.buyingPricePerCarton
        : (product.buyingPricePerCarton / product.unitPerCarton);

      const itemSubtotal = pricePerUnit * item.quantity;
      const itemCost = costPerUnit * item.quantity;
      const itemProfit = itemSubtotal - itemCost;

      // Add to totals
      subtotal += itemSubtotal;
      totalCost += itemCost;
      totalProfit += itemProfit;

      // Prepare item for sale record
      processedItems.push({
        product: product._id,
        productName: product.name,
        productSKU: product.sku,
        quantitySold: item.quantity,
        unitType: item.unitType,
        pricePerUnit: pricePerUnit,
        costPerUnit: costPerUnit,
        subtotal: itemSubtotal,
        profit: itemProfit
      });

      // Update product stock
      product.quantityInStock -= quantityInPieces;
      await product.save({ session });

      logger.info(
        `Stock updated: ${product.name} - Sold ${quantityInPieces} pieces, Remaining: ${product.quantityInStock}`
      );
    }

    // Apply discount and tax
    const discountAmount = discount || 0;
    const taxAmount = tax || 0;
    const total = subtotal - discountAmount + taxAmount;

    // Calculate amount due
    const paidAmount = amountPaid || total;
    const due = total - paidAmount;

    // Determine payment status
    let finalPaymentStatus = paymentStatus || 'paid';
    if (paidAmount === 0) {
      finalPaymentStatus = 'pending';
    } else if (paidAmount < total) {
      finalPaymentStatus = 'partial';
    } else {
      finalPaymentStatus = 'paid';
    }

    // Create sale record
    const sale = await Sale.create([{
      business: req.user.business._id,
      saleDate: saleDate || new Date(),
      items: processedItems,
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      total,
      totalCost,
      totalProfit,
      paymentStatus: finalPaymentStatus,
      paymentMethod: paymentMethod || 'cash',
      amountPaid: paidAmount,
      amountDue: due,
      notes,
      receiptNumber,
      status: 'completed',
      recordedBy: req.user.id
    }], { session });

    // ⭐ AUTO-CREATE INCOME TRANSACTION ⭐
    const transactionController = require('./transactionController');
    await transactionController.createTransactionFromSale(sale[0], session);

    // Commit transaction
    await session.commitTransaction();
    // ⭐ SEND SALE NOTIFICATION ⭐
    await notificationService.notifySaleCompleted(
      sale[0],
      req.user.business,
      req.user
    );

    logger.info(`Sale recorded: ${sale[0].saleNumber} by ${req.user.email}`);
    logger.info(
      `Sale recorded: ${sale[0].saleNumber} - Total: ₦${total} - Profit: ₦${totalProfit} by ${req.user.email}`
    );

    res.status(201).json({
      success: true,
      message: 'Sale recorded successfully',
      data: {
        sale: sale[0].toDetailedInfo()
      }
    });

  } catch (error) {
    await session.abortTransaction();
    logger.error('Record sale error:', error);
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * Get all sales with filters and pagination
 * @route GET /api/sales
 * @access Private
 */
exports.getSales = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      paymentStatus,
      status,
      sortBy = 'saleDate',
      order = 'desc'
    } = req.query;

    // Build query
    const query = { business: req.user.business._id };

    // Filter by date range
    if (startDate || endDate) {
      query.saleDate = {};
      if (startDate) {
        query.saleDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.saleDate.$lte = new Date(endDate);
      }
    }

    // Filter by payment status
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    // Execute query
    const sales = await Sale.find(query)
      .sort({ [sortBy]: sortOrder })
      .limit(parseInt(limit))
      .skip(skip)
      .populate('recordedBy', 'firstName lastName')
      .populate('items.product', 'name sku');

    // Get total count
    const total = await Sale.countDocuments(query);

    // Get summary statistics
    const stats = await Sale.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          totalProfit: { $sum: '$totalProfit' },
          totalCost: { $sum: '$totalCost' },
          averageSaleValue: { $avg: '$total' },
          completedSales: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pendingSales: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] }
          }
        }
      }
    ]);

    logger.info(`Sales listed: ${sales.length} sales for ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Sales retrieved successfully',
      data: {
        sales: sales.map(s => s.toDetailedInfo()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        stats: stats[0] || {
          totalSales: 0,
          totalRevenue: 0,
          totalProfit: 0,
          totalCost: 0,
          averageSaleValue: 0,
          completedSales: 0,
          pendingSales: 0
        }
      }
    });

  } catch (error) {
    logger.error('Get sales error:', error);
    next(error);
  }
};

/**
 * Get single sale by ID
 * @route GET /api/sales/:id
 * @access Private
 */
exports.getSale = async (req, res, next) => {
  try {
    const sale = await Sale.findOne({
      _id: req.params.id,
      business: req.user.business._id
    })
      .populate('recordedBy', 'firstName lastName email')
      .populate('items.product', 'name sku category unitType');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        sale: sale.toDetailedInfo()
      }
    });

  } catch (error) {
    logger.error('Get sale error:', error);
    next(error);
  }
};

/**
 * Update sale payment status
 * @route PATCH /api/sales/:id/payment
 * @access Private
 */
exports.updatePayment = async (req, res, next) => {
  try {
    const { amountPaid, paymentMethod } = req.body;

    const sale = await Sale.findOne({
      _id: req.params.id,
      business: req.user.business._id
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    if (sale.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update payment for cancelled sale'
      });
    }

    // Update payment information
    if (amountPaid !== undefined) {
      sale.amountPaid += amountPaid;
      sale.amountDue = sale.total - sale.amountPaid;

      // Update payment status
      if (sale.amountPaid >= sale.total) {
        sale.paymentStatus = 'paid';
        sale.amountDue = 0;
      } else if (sale.amountPaid > 0) {
        sale.paymentStatus = 'partial';
      } else {
        sale.paymentStatus = 'pending';
      }
    }

    if (paymentMethod) {
      sale.paymentMethod = paymentMethod;
    }

    await sale.save();

    logger.info(`Payment updated for sale ${sale.saleNumber}: ₦${amountPaid} paid`);

    res.status(200).json({
      success: true,
      message: 'Payment updated successfully',
      data: {
        sale: sale.toDetailedInfo()
      }
    });

  } catch (error) {
    logger.error('Update payment error:', error);
    next(error);
  }
};

/**
 * Cancel a sale
 * @route PATCH /api/sales/:id/cancel
 * @access Private (Owner/Admin only)
 */
exports.cancelSale = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { reason } = req.body;

    const sale = await Sale.findOne({
      _id: req.params.id,
      business: req.user.business._id
    }).session(session);

    if (!sale) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    if (sale.status === 'cancelled') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Sale is already cancelled'
      });
    }

    // Restore product stock
    for (const item of sale.items) {
      const product = await Product.findById(item.product).session(session);

      if (product) {
        // Calculate quantity in pieces
        const quantityInPieces = item.unitType === 'carton'
          ? item.quantitySold * product.unitPerCarton
          : item.quantitySold;

        product.quantityInStock += quantityInPieces;
        await product.save({ session });

        logger.info(
          `Stock restored: ${product.name} + ${quantityInPieces} pieces`
        );
      }
    }

    // Update sale status
    sale.status = 'cancelled';
    sale.cancelledAt = new Date();
    sale.cancelledBy = req.user.id;
    sale.cancellationReason = reason;

    await sale.save({ session });

    await session.commitTransaction();

    logger.info(`Sale cancelled: ${sale.saleNumber} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Sale cancelled successfully',
      data: {
        sale: sale.toDetailedInfo()
      }
    });

  } catch (error) {
    await session.abortTransaction();
    logger.error('Cancel sale error:', error);
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * Get sales statistics/analytics
 * @route GET /api/sales/stats
 * @access Private
 */
exports.getSalesStats = async (req, res, next) => {
  try {
    const { startDate, endDate, period = 'day' } = req.query;

    // Build base query
    const baseQuery = {
      business: req.user.business._id,
      status: 'completed'
    };

    // Add date filter if provided
    if (startDate || endDate) {
      baseQuery.saleDate = {};
      if (startDate) baseQuery.saleDate.$gte = new Date(startDate);
      if (endDate) baseQuery.saleDate.$lte = new Date(endDate);
    }

    // Overall statistics
    const overallStats = await Sale.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          totalProfit: { $sum: '$totalProfit' },
          totalCost: { $sum: '$totalCost' },
          averageSaleValue: { $avg: '$total' },
          averageProfit: { $avg: '$totalProfit' }
        }
      }
    ]);

    // Sales by payment method
    const paymentMethodStats = await Sale.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$total' }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    // Top selling products
    const topProducts = await Sale.aggregate([
      { $match: baseQuery },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$items.productName' },
          totalQuantity: { $sum: '$items.quantitySold' },
          totalRevenue: { $sum: '$items.subtotal' },
          totalProfit: { $sum: '$items.profit' }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);

    // Sales trend (by day/week/month)
    let groupByFormat;
    if (period === 'day') {
      groupByFormat = {
        year: { $year: '$saleDate' },
        month: { $month: '$saleDate' },
        day: { $dayOfMonth: '$saleDate' }
      };
    } else if (period === 'week') {
      groupByFormat = {
        year: { $year: '$saleDate' },
        week: { $week: '$saleDate' }
      };
    } else {
      groupByFormat = {
        year: { $year: '$saleDate' },
        month: { $month: '$saleDate' }
      };
    }

    const salesTrend = await Sale.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: groupByFormat,
          count: { $sum: 1 },
          revenue: { $sum: '$total' },
          profit: { $sum: '$totalProfit' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: overallStats[0] || {
          totalSales: 0,
          totalRevenue: 0,
          totalProfit: 0,
          totalCost: 0,
          averageSaleValue: 0,
          averageProfit: 0
        },
        byPaymentMethod: paymentMethodStats,
        topProducts,
        trend: salesTrend
      }
    });

  } catch (error) {
    logger.error('Get sales stats error:', error);
    next(error);
  }
};

/**
 * Get today's sales summary
 * @route GET /api/sales/today
 * @access Private
 */
exports.getTodaySales = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStats = await Sale.aggregate([
      {
        $match: {
          business: req.user.business._id,
          saleDate: { $gte: today, $lt: tomorrow },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          totalProfit: { $sum: '$totalProfit' },
          totalItemsSold: { $sum: { $size: '$items' } }
        }
      }
    ]);

    // Get recent sales
    const recentSales = await Sale.find({
      business: req.user.business._id,
      saleDate: { $gte: today, $lt: tomorrow }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('recordedBy', 'firstName lastName');

    res.status(200).json({
      success: true,
      data: {
        stats: todayStats[0] || {
          totalSales: 0,
          totalRevenue: 0,
          totalProfit: 0,
          totalItemsSold: 0
        },
        recentSales: recentSales.map(s => s.toSummary())
      }
    });

  } catch (error) {
    logger.error('Get today sales error:', error);
    next(error);
  }
};