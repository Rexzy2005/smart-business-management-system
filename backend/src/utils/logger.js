/**
 * Custom Logger Utility
 * Provides consistent logging throughout the application
 */

/**
 * Log levels with colors for console output
 */
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Format timestamp
 */
const getTimestamp = () => {
  return new Date().toISOString();
};

/**
 * Logger object with different log levels
 */
const logger = {
  /**
   * Info level logging
   */
  info: (message, ...args) => {
    console.log(
      `${colors.cyan}[INFO]${colors.reset} ${getTimestamp()} - ${message}`,
      ...args
    );
  },

  /**
   * Error level logging
   */
  error: (message, ...args) => {
    console.error(
      `${colors.red}[ERROR]${colors.reset} ${getTimestamp()} - ${message}`,
      ...args
    );
  },

  /**
   * Warning level logging
   */
  warn: (message, ...args) => {
    console.warn(
      `${colors.yellow}[WARN]${colors.reset} ${getTimestamp()} - ${message}`,
      ...args
    );
  },

  /**
   * Debug level logging (only in development)
   */
  debug: (message, ...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `${colors.magenta}[DEBUG]${colors.reset} ${getTimestamp()} - ${message}`,
        ...args
      );
    }
  },

  /**
   * Success level logging
   */
  success: (message, ...args) => {
    console.log(
      `${colors.green}[SUCCESS]${colors.reset} ${getTimestamp()} - ${message}`,
      ...args
    );
  }
};

module.exports = logger;