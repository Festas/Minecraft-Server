const session = require('express-session');

/**
 * Configure session middleware
 */
function configureSession() {
    return session({
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
}

module.exports = {
    configureSession
};
