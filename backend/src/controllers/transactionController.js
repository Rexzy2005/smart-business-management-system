/**
 * Transaction Controller
 * Handles cash flow income and expense tracking
 */

const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

/**
 * Create a new transaction (manual entry)
 * @route POST /api/transactions
 * @access Private
 */
exports.createTransaction = async (req, res, next) => {
  try {
    const {
      type,
      amount,
      category,
      description,
      transactionDate,
      paymentMethod,
      notes,
      tags
    } = req.body;

    // Create transaction
    const transaction = await Transaction.create({
      business: req.user.business._id,
      type,
      amount,
      category,
      description,
      transactionDate: transactionDate || new Date(),
      paymentMethod: paymentMethod || 'cash',
      referenceType: 'manual',
      notes,
      tags,
      recordedBy: req.user.id,
      status: 'completed'
    });

    logger.info(
      `Transaction created: ${type} - ₦${amount} (${category}) by ${req.user.email}`
    );

    res.status(201).json({
      success: true,
      message: 'Transaction recorded successfully',
      data: {
        transaction: transaction.toDetailedInfo()
      }
    });

  } catch (error) {
    logger.error('Create transaction error:', error);
    next(error);
  }
};

/**
 * Get all transactions with filters and pagination
 * @route GET /api/transactions
 * @access Private
 */
exports.getTransactions = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      category,
      startDate,
      endDate,
      sortBy = 'transactionDate',
      order = 'desc'
    } = req.query;

    // Build query
    const query = { 
      business: req.user.business._id,
      status: 'completed'
    };

    // Filter by type
    if (type) {
      query.type = type;
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) {
        query.transactionDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.transactionDate.$lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    // Execute query
    const transactions = await Transaction.find(query)
      .sort({ [sortBy]: sortOrder })
      .limit(parseInt(limit))
      .skip(skip)
      .populate('recordedBy', 'firstName lastName');

    // Get total count
    const total = await Transaction.countDocuments(query);

    logger.info(`Transactions listed: ${transactions.length} transactions`);

    res.status(200).json({
      success: true,
      message: 'Transactions retrieved successfully',
      data: {
        transactions: transactions.map(t => t.toDetailedInfo()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Get transactions error:', error);
    next(error);
  }
};

/**
 * Get single transaction by ID
 * @route GET /api/transactions/:id
 * @access Private
 */
exports.getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      business: req.user.business._id
    }).populate('recordedBy', 'firstName lastName email');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        transaction: transaction.toDetailedInfo()
      }
    });

  } catch (error) {
    logger.error('Get transaction error:', error);
    next(error);
  }
};

/**
 * Update transaction
 * @route PUT /api/transactions/:id
 * @access Private
 */
exports.updateTransaction = async (req, res, next) => {
  try {
    const {
      type,
      amount,
      category,
      description,
      transactionDate,
      paymentMethod,
      notes,
      tags
    } = req.body;

    const transaction = await Transaction.findOne({
      _id: req.params.id,
      business: req.user.business._id
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Don't allow updating auto-generated transactions
    if (transaction.referenceType === 'sale') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update automatically generated transactions'
      });
    }

    // Update fields
    if (type !== undefined) transaction.type = type;
    if (amount !== undefined) transaction.amount = amount;
    if (category !== undefined) transaction.category = category;
    if (description !== undefined) transaction.description = description;
    if (transactionDate !== undefined) transaction.transactionDate = transactionDate;
    if (paymentMethod !== undefined) transaction.paymentMethod = paymentMethod;
    if (notes !== undefined) transaction.notes = notes;
    if (tags !== undefined) transaction.tags = tags;

    await transaction.save();

    logger.info(`Transaction updated: ${transaction._id} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      data: {
        transaction: transaction.toDetailedInfo()
      }
    });

  } catch (error) {
    logger.error('Update transaction error:', error);
    next(error);
  }
};

/**
 * Delete transaction
 * @route DELETE /api/transactions/:id
 * @access Private (Owner/Admin only)
 */
exports.deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      business: req.user.business._id
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Don't allow deleting auto-generated transactions
    if (transaction.referenceType === 'sale') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete automatically generated transactions'
      });
    }

    // Soft delete by marking as cancelled
    transaction.status = 'cancelled';
    await transaction.save();

    logger.info(`Transaction deleted: ${transaction._id} by ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully'
    });

  } catch (error) {
    logger.error('Delete transaction error:', error);
    next(error);
  }
};

/**
 * Get cash flow summary
 * @route GET /api/transactions/summary
 * @access Private
 */
exports.getCashFlowSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // Build base query
    const baseQuery = {
      business: req.user.business._id,
      status: 'completed'
    };

    // Add date filter if provided
    if (startDate || endDate) {
      baseQuery.transactionDate = {};
      if (startDate) baseQuery.transactionDate.$gte = new Date(startDate);
      if (endDate) baseQuery.transactionDate.$lte = new Date(endDate);
    }

    // Calculate totals
    const summary = await Transaction.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Process results
    const income = summary.find(s => s._id === 'income') || { total: 0, count: 0 };
    const expense = summary.find(s => s._id === 'expense') || { total: 0, count: 0 };
    
    const totalIncome = income.total;
    const totalExpenses = expense.total;
    const netBalance = totalIncome - totalExpenses;

    // Get income by category
    const incomeByCategory = await Transaction.aggregate([
      { $match: { ...baseQuery, type: 'income' } },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Get expenses by category
    const expensesByCategory = await Transaction.aggregate([
      { $match: { ...baseQuery, type: 'expense' } },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Get recent transactions
    const recentTransactions = await Transaction.find(baseQuery)
      .sort({ transactionDate: -1 })
      .limit(10)
      .populate('recordedBy', 'firstName lastName');

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalIncome,
          totalExpenses,
          netBalance,
          incomeCount: income.count,
          expenseCount: expense.count,
          totalTransactions: income.count + expense.count
        },
        incomeByCategory: incomeByCategory.map(c => ({
          category: c._id,
          total: c.total,
          count: c.count
        })),
        expensesByCategory: expensesByCategory.map(c => ({
          category: c._id,
          total: c.total,
          count: c.count
        })),
        recentTransactions: recentTransactions.map(t => t.toSummary())
      }
    });

  } catch (error) {
    logger.error('Get cash flow summary error:', error);
    next(error);
  }
};

/**
 * Get cash flow trends (daily/weekly/monthly)
 * @route GET /api/transactions/trends
 * @access Private
 */
exports.getCashFlowTrends = async (req, res, next) => {
  try {
    const { period = 'day', startDate, endDate } = req.query;

    // Build base query
    const baseQuery = {
      business: req.user.business._id,
      status: 'completed'
    };

    // Add date filter
    if (startDate || endDate) {
      baseQuery.transactionDate = {};
      if (startDate) baseQuery.transactionDate.$gte = new Date(startDate);
      if (endDate) baseQuery.transactionDate.$lte = new Date(endDate);
    }

    // Determine grouping format
    let groupByFormat;
    if (period === 'day') {
      groupByFormat = {
        year: { $year: '$transactionDate' },
        month: { $month: '$transactionDate' },
        day: { $dayOfMonth: '$transactionDate' }
      };
    } else if (period === 'week') {
      groupByFormat = {
        year: { $year: '$transactionDate' },
        week: { $week: '$transactionDate' }
      };
    } else {
      groupByFormat = {
        year: { $year: '$transactionDate' },
        month: { $month: '$transactionDate' }
      };
    }

    // Get trends
    const trends = await Transaction.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: {
            date: groupByFormat,
            type: '$type'
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date.year': 1, '_id.date.month': 1, '_id.date.day': 1 } }
    ]);

    // Format trends data
    const formattedTrends = trends.reduce((acc, trend) => {
      const dateKey = JSON.stringify(trend._id.date);
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: trend._id.date,
          income: 0,
          expenses: 0,
          net: 0
        };
      }
      
      if (trend._id.type === 'income') {
        acc[dateKey].income = trend.total;
      } else {
        acc[dateKey].expenses = trend.total;
      }
      
      acc[dateKey].net = acc[dateKey].income - acc[dateKey].expenses;
      
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        period,
        trends: Object.values(formattedTrends)
      }
    });

  } catch (error) {
    logger.error('Get cash flow trends error:', error);
    next(error);
  }
};

/**
 * Get today's cash flow
 * @route GET /api/transactions/today
 * @access Private
 */
exports.getTodayCashFlow = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStats = await Transaction.aggregate([
      {
        $match: {
          business: req.user.business._id,
          transactionDate: { $gte: today, $lt: tomorrow },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const income = todayStats.find(s => s._id === 'income') || { total: 0, count: 0 };
    const expense = todayStats.find(s => s._id === 'expense') || { total: 0, count: 0 };

    res.status(200).json({
      success: true,
      data: {
        income: income.total,
        incomeCount: income.count,
        expenses: expense.total,
        expenseCount: expense.count,
        net: income.total - expense.total,
        totalTransactions: income.count + expense.count
      }
    });

  } catch (error) {
    logger.error('Get today cash flow error:', error);
    next(error);
  }
};

/**
 * Helper function to create transaction from sale
 * This is called internally when a sale is recorded
 */
exports.createTransactionFromSale = async (sale, session) => {
  try {
    const transaction = await Transaction.create([{
      business: sale.business,
      type: 'income',
      amount: sale.total,
      category: 'Sales',
      description: `Sale ${sale.saleNumber} - ${sale.items.length} item(s)`,
      transactionDate: sale.saleDate,
      paymentMethod: sale.paymentMethod,
      referenceType: 'sale',
      referenceId: sale._id,
      recordedBy: sale.recordedBy,
      status: 'completed'
    }], { session });

    logger.info(
      `Auto-created transaction for sale ${sale.saleNumber}: ₦${sale.total}`
    );

    return transaction[0];
  } catch (error) {
    logger.error('Create transaction from sale error:', error);
    throw error;
  }
};