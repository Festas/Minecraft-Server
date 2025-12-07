const session = require('express-session');

/**
 * Determine if secure cookies should be used.
 * 
 * Secure cookies (secure: true) are ONLY sent over HTTPS connections.
 * This is critical for production security but BREAKS all HTTP testing:
 * - Local development on http://localhost
 * - CI/CD workflows using plain HTTP
 * - curl/diagnostic scripts via HTTP
 * - Any non-HTTPS environment
 * 
 * When secure: true with HTTP requests:
 * - Browser/curl does NOT send the session cookie back to server
 * - Server sees no cookies, creates new session every request
 * - Session ID changes on every request
 * - Authentication always fails (authenticated: false)
 * - CSRF token never matches (different sessions)
 * - All authenticated API calls fail
 * 
 * Solution:
 * - secure: true ONLY for production with HTTPS/SSL
 * - secure: false for dev/test/CI using HTTP
 * - Override with COOKIE_SECURE=false env var for HTTP testing
 */
function shouldUseSecureCookies() {
    // Allow explicit override for testing/diagnostics
    if (process.env.COOKIE_SECURE !== undefined) {
        return process.env.COOKIE_SECURE === 'true';
    }
    
    // Only use secure cookies in production (assumes HTTPS/SSL is configured)
    // Development, test, and CI environments use HTTP and MUST have secure: false
    return process.env.NODE_ENV === 'production';
}

const useSecureCookies = shouldUseSecureCookies();

// Log cookie security configuration on startup
console.log('[Session] Cookie configuration:', {
    secure: useSecureCookies,
    nodeEnv: process.env.NODE_ENV || 'development',
    cookieSecureOverride: process.env.COOKIE_SECURE || 'not set',
    warning: useSecureCookies ? 'HTTPS/SSL required for cookies to work' : 'HTTP allowed - cookies work without SSL'
});

// Create session middleware instance (singleton for sharing with Socket.io)
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'your-secure-random-session-secret',
    resave: false,
    saveUninitialized: false,
    proxy: true, // Trust the reverse proxy
    name: 'console.sid', // Custom session cookie name to avoid conflicts
    cookie: {
        httpOnly: true,
        secure: useSecureCookies, // HTTPS only in production, HTTP allowed in dev/test/CI
        sameSite: 'lax', // More compatible with redirects and API calls
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/', // Ensure cookie is available for all paths
        // Don't set domain - let browser default to current domain
    }
});

/**
 * Get the session middleware instance
 * This is a singleton so it can be shared between Express and Socket.io
 */
function getSessionMiddleware() {
    return sessionMiddleware;
}

module.exports = {
    getSessionMiddleware,
    sessionMiddleware
};
