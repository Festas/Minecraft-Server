const session = require('express-session');

// Create session middleware instance (singleton for sharing with Socket.io)
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'your-secure-random-session-secret',
    resave: false,
    saveUninitialized: false,
    proxy: true, // Trust the reverse proxy
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'lax', // More compatible with redirects
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
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
