const session = require('express-session');
const { shouldUseSecureCookies, logCookieConfiguration } = require('../utils/cookieSecurity');

const useSecureCookies = shouldUseSecureCookies();

// Log cookie security configuration on startup
logCookieConfiguration('Session', useSecureCookies);

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
