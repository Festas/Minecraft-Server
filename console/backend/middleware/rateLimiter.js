const rateLimit = require('express-rate-limit');

/**
 * Rate limiting configurations for different endpoint types
 */

// Strict rate limiting for login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many login attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false
});

// Moderate rate limiting for command execution
const commandLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 commands per minute
    message: 'Too many commands, please slow down',
    standardHeaders: true,
    legacyHeaders: false
});

// Moderate rate limiting for server control operations
const serverControlLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute
    message: 'Too many server control requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false
});

// Strict rate limiting for backup operations
const backupLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 2, // 2 backups per 5 minutes
    message: 'Too many backup requests. Please wait before creating another backup.',
    standardHeaders: true,
    legacyHeaders: false
});

// General API rate limiting
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    loginLimiter,
    commandLimiter,
    serverControlLimiter,
    backupLimiter,
    apiLimiter
};
