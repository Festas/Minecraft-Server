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
    // skipSuccessfulRequests: Reset counter on successful login (2xx response)
    // Security rationale: This is the intended behavior for login rate limiting.
    // - Failed logins still count toward the limit (protects against brute force)
    // - Successful logins reset the counter (prevents locking out legitimate users)
    // - If attacker has valid credentials, they don't need to brute force
    // - This is standard practice for login rate limiting (OWASP recommendation)
    skipSuccessfulRequests: true,
    // Enhanced handler to log rate-limiting events
    handler: (req, res, next, options) => {
        console.error('[RATE_LIMIT] Login rate limit exceeded:', {
            ip: req.ip,
            username: req.body?.username || 'UNKNOWN',
            sessionID: req.sessionID,
            userAgent: req.get('user-agent'),
            timestamp: new Date().toISOString(),
            retryAfter: res.getHeader('Retry-After'),
            limit: options.max,
            windowMs: options.windowMs
        });
        
        res.status(429).json({
            error: 'Too many login attempts',
            message: 'You have exceeded the maximum number of login attempts. Please try again later.',
            retryAfter: res.getHeader('Retry-After'),
            limit: options.max,
            windowMinutes: options.windowMs / (60 * 1000)
        });
    }
});

// Moderate rate limiting for command execution
const commandLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 commands per minute
    message: 'Too many commands, please slow down',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, _next, _options) => {
        console.warn('[RATE_LIMIT] Command rate limit exceeded:', {
            ip: req.ip,
            sessionID: req.sessionID,
            timestamp: new Date().toISOString()
        });
        
        res.status(429).json({
            error: 'Too many commands',
            message: 'You are sending commands too quickly. Please slow down.',
            retryAfter: res.getHeader('Retry-After')
        });
    }
});

// Moderate rate limiting for server control operations
const serverControlLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute
    message: 'Too many server control requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, _next, _options) => {
        console.warn('[RATE_LIMIT] Server control rate limit exceeded:', {
            ip: req.ip,
            path: req.path,
            sessionID: req.sessionID,
            timestamp: new Date().toISOString()
        });
        
        res.status(429).json({
            error: 'Too many server control requests',
            message: 'You are sending too many server control requests. Please try again later.',
            retryAfter: res.getHeader('Retry-After')
        });
    }
});

// Strict rate limiting for backup operations
const backupLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 2, // 2 backups per 5 minutes
    message: 'Too many backup requests. Please wait before creating another backup.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        console.warn('[RATE_LIMIT] Backup rate limit exceeded:', {
            ip: req.ip,
            sessionID: req.sessionID,
            timestamp: new Date().toISOString()
        });
        
        res.status(429).json({
            error: 'Too many backup requests',
            message: 'You are creating backups too frequently. Please wait before creating another backup.',
            retryAfter: res.getHeader('Retry-After'),
            windowMinutes: options.windowMs / (60 * 1000)
        });
    }
});

// General API rate limiting
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, _next, _options) => {
        console.warn('[RATE_LIMIT] API rate limit exceeded:', {
            ip: req.ip,
            path: req.path,
            method: req.method,
            sessionID: req.sessionID,
            timestamp: new Date().toISOString()
        });
        
        res.status(429).json({
            error: 'Too many requests',
            message: 'You are sending too many API requests. Please try again later.',
            retryAfter: res.getHeader('Retry-After')
        });
    }
});

module.exports = {
    loginLimiter,
    commandLimiter,
    serverControlLimiter,
    backupLimiter,
    apiLimiter
};
