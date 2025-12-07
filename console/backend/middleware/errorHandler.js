/**
 * Global error handling middleware
 * Should be placed after all routes
 */

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    error.status = 404;
    next(error);
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, _next) => {
    // Determine the appropriate status code
    // Priority: err.status > err.statusCode > existing res.statusCode (if not 200) > 500
    let statusCode = 500;
    
    if (err.status) {
        statusCode = err.status;
    } else if (err.statusCode) {
        statusCode = err.statusCode;
    } else if (res.statusCode && res.statusCode !== 200) {
        statusCode = res.statusCode;
    }
    
    // Log error details (but not in production with sensitive data)
    console.error('Error Handler:', {
        message: err.message,
        statusCode: statusCode,
        path: req.path,
        method: req.method,
        // Only log stack in development
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });

    // Set status code
    res.status(statusCode);

    // Send error response
    res.json({
        error: {
            message: err.message,
            // Only send stack trace in development
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
            // Add status code
            status: statusCode
        }
    });
};

/**
 * Async route handler wrapper to catch errors
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    notFoundHandler,
    errorHandler,
    asyncHandler
};
