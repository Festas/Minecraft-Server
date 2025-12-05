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
    // Log error details (but not in production with sensitive data)
    console.error('Error:', {
        message: err.message,
        status: err.status || 500,
        path: req.path,
        method: req.method,
        // Only log stack in development
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });

    // Set status code
    const statusCode = err.status || res.statusCode !== 200 ? res.statusCode : 500;
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
