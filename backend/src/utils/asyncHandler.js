/**
 * Async Handler Utility
 * Wraps async route handlers to catch errors
 */

/**
 * Wraps async functions to catch errors and pass to error middleware
 * @param {Function} fn - Async function to wrap
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;