# Brillix Backend Setup Guide

## 📁 Folder Structure

```
brillix-backend/
├── src/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   └── healthController.js
│   ├── models/
│   │   └── (your models will go here)
│   ├── routes/
│   │   └── index.js
│   ├── middleware/
│   │   └── errorHandler.js
│   ├── utils/
│   │   └── logger.js
│   └── app.js
├── .env
├── .env.example
├── .gitignore
├── server.js
└── package.json
```

---

## 📦 Package Installation

```bash
npm init -y
npm install express mongoose dotenv cors
npm install --save-dev nodemon
```

---

## 📄 File Contents

### **package.json**

```json
{
  "name": "brillix-backend",
  "version": "1.0.0",
  "description": "Backend for Brillix Business Management Platform",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "keywords": ["business", "management", "api"],
  "author": "Your Name",
  "license": "ISC",
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.0",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

---

### **.env.example**

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/brillix

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

---

### **.env**

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/brillix
CORS_ORIGIN=http://localhost:3000
```

---

### **.gitignore**

```
# Dependencies
node_modules/

# Environment variables
.env

# Logs
logs/
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Build files
dist/
build/
```

---

### **server.js**

```javascript
/**
 * Server Entry Point
 * This file starts the Express server and connects to MongoDB
 */

require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/database');
const logger = require('./src/utils/logger');

// Configuration
const PORT = process.env.PORT || 5000;

/**
 * Initialize Server
 * Connects to database and starts listening on specified port
 */
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Start Express server
    app.listen(PORT, () => {
      logger.info(`🚀 Brillix server running on port ${PORT}`);
      logger.info(`📝 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🌐 Access server at: http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('❌ Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Start the server
startServer();
```

---

### **src/app.js**

```javascript
/**
 * Express Application Configuration
 * Sets up middleware, routes, and error handling
 */

const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

// Initialize Express app
const app = express();

/**
 * Middleware Configuration
 */

// Enable CORS with configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parser middleware
// Parse JSON request bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

/**
 * API Routes
 */
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Brillix API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      documentation: '/api/docs'
    }
  });
});

/**
 * Error Handling Middleware
 * Must be defined after all routes
 */
app.use(errorHandler);

// Handle 404 - Route not found
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

module.exports = app;
```

---

### **src/config/database.js**

```javascript
/**
 * MongoDB Database Configuration
 * Handles connection to MongoDB using Mongoose
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Connect to MongoDB
 * @returns {Promise} Resolves when connection is successful
 */
const connectDB = async () => {
  try {
    // Mongoose connection options
    const options = {
      // Use new URL parser
      useNewUrlParser: true,
      // Use unified topology for connection management
      useUnifiedTopology: true,
      // Set timeout for initial connection
      serverSelectionTimeoutMS: 5000,
      // Set timeout for socket operations
      socketTimeoutMS: 45000,
    };

    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
    logger.info(`📊 Database: ${conn.connection.name}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    logger.error('❌ MongoDB connection failed:', error.message);
    throw error;
  }
};

/**
 * Graceful shutdown of database connection
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error);
    throw error;
  }
};

// Export functions
module.exports = connectDB;
module.exports.disconnectDB = disconnectDB;
```

---

### **src/routes/index.js**

```javascript
/**
 * Main Routes Index
 * Combines all route modules
 */

const express = require('express');
const healthController = require('../controllers/healthController');

const router = express.Router();

/**
 * Health Check Routes
 */
router.get('/health', healthController.healthCheck);
router.get('/health/db', healthController.databaseHealth);

/**
 * Add your other routes here
 * Example:
 * const userRoutes = require('./userRoutes');
 * router.use('/users', userRoutes);
 */

module.exports = router;
```

---

### **src/controllers/healthController.js**

```javascript
/**
 * Health Check Controller
 * Provides endpoints to check API and database health
 */

const mongoose = require('mongoose');

/**
 * Basic Health Check
 * @route GET /api/health
 * @access Public
 */
exports.healthCheck = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Brillix API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
};

/**
 * Database Health Check
 * @route GET /api/health/db
 * @access Public
 */
exports.databaseHealth = async (req, res) => {
  try {
    // Check MongoDB connection state
    const dbState = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    // If connected, perform a simple database operation
    if (dbState === 1) {
      await mongoose.connection.db.admin().ping();
      
      res.status(200).json({
        success: true,
        message: 'Database connection is healthy',
        database: {
          status: states[dbState],
          name: mongoose.connection.name,
          host: mongoose.connection.host,
          port: mongoose.connection.port
        },
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'Database connection is not healthy',
        database: {
          status: states[dbState]
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Database health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
```

---

### **src/middleware/errorHandler.js**

```javascript
/**
 * Global Error Handling Middleware
 * Catches and formats errors throughout the application
 */

const logger = require('../utils/logger');

/**
 * Error Handler Middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Log error details
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(e => e.message).join(', ');
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyPattern)[0];
    message = `Duplicate value for field: ${field}`;
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && {
      error: err.message,
      stack: err.stack
    })
  });
};

module.exports = errorHandler;
```

---

### **src/utils/logger.js**

```javascript
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
```

---

## 🚀 Getting Started

### 1. Create the folder structure
```bash
mkdir -p src/{config,controllers,models,routes,middleware,utils}
```

### 2. Create all the files and copy the content above

### 3. Install dependencies
```bash
npm install
```

### 4. Set up your environment variables
- Copy `.env.example` to `.env`
- Update the values as needed

### 5. Start MongoDB
Make sure MongoDB is running locally or update `MONGODB_URI` with your MongoDB Atlas connection string.

### 6. Run the server
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

---

## 🧪 Testing the API

### Health Check
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Brillix API is running",
  "timestamp": "2025-10-17T...",
  "uptime": 12.345,
  "environment": "development"
}
```

### Database Health Check
```bash
curl http://localhost:5000/api/health/db
```

---

## 📝 Next Steps

1. **Create Models**: Add your Mongoose schemas in `src/models/`
2. **Add Routes**: Create route files in `src/routes/` for different resources
3. **Build Controllers**: Implement business logic in `src/controllers/`
4. **Add Authentication**: Implement JWT-based authentication
5. **Add Validation**: Use libraries like `express-validator` or `joi`
6. **Add API Documentation**: Consider using Swagger/OpenAPI

---

## 🎯 Key Features

✅ Modular and scalable structure  
✅ Environment-based configuration  
✅ Comprehensive error handling  
✅ MongoDB connection with reconnection logic  
✅ CORS enabled with configuration  
✅ Request body parsing  
✅ Custom logger utility  
✅ Health check endpoints  
✅ Development and production modes  
✅ Graceful shutdown handling