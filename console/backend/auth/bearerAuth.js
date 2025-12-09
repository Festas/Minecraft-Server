/**
 * Bearer Token Authentication Middleware
 * Supports stateless Bearer token authentication for plugin API
 */

/**
 * Verify Bearer token from Authorization header
 */
function verifyBearerToken(req) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const expectedToken = process.env.PLUGIN_ADMIN_TOKEN;
    
    if (!expectedToken) {
        console.error('[BearerAuth] PLUGIN_ADMIN_TOKEN not configured');
        return false;
    }
    
    // Constant-time comparison to prevent timing attacks
    if (token.length !== expectedToken.length) {
        return false;
    }
    
    let mismatch = 0;
    for (let i = 0; i < token.length; i++) {
        mismatch |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i);
    }
    
    return mismatch === 0;
}

/**
 * Authentication middleware that supports both session and Bearer token
 */
function requireAuthOrToken(req, res, next) {
    // Log authentication attempt
    console.log('[Auth] Authentication check:', {
        path: req.path,
        method: req.method,
        hasBearerToken: req.headers.authorization?.startsWith('Bearer '),
        hasSession: !!req.session,
        sessionAuthenticated: req.session?.authenticated || false
    });
    
    // Check Bearer token first (stateless, preferred for API)
    if (verifyBearerToken(req)) {
        console.log('[Auth] Bearer token authentication successful');
        req.authenticatedVia = 'bearer';
        return next();
    }
    
    // Fall back to session-based authentication
    if (req.session && req.session.authenticated) {
        console.log('[Auth] Session authentication successful:', req.session.username);
        req.authenticatedVia = 'session';
        return next();
    }
    
    // Neither auth method succeeded
    console.log('[Auth] Authentication failed: no valid Bearer token or session');
    res.status(401).json({ 
        error: 'Authentication required',
        message: 'Provide a valid Bearer token or authenticated session'
    });
}

/**
 * Middleware to skip CSRF for Bearer token requests
 */
function skipCsrfForBearer(req, res, next) {
    // If authenticated via Bearer token, skip CSRF
    if (req.headers.authorization?.startsWith('Bearer ') && verifyBearerToken(req)) {
        req.skipCsrf = true;
    }
    next();
}

/**
 * Validate PLUGIN_ADMIN_TOKEN is configured
 */
function validateTokenConfiguration() {
    const token = process.env.PLUGIN_ADMIN_TOKEN;
    
    if (!token) {
        console.warn('⚠️  WARNING: PLUGIN_ADMIN_TOKEN not set - Bearer token authentication disabled');
        console.warn('⚠️  Set PLUGIN_ADMIN_TOKEN in .env for stateless API authentication');
        return false;
    }
    
    // Check token strength (minimum 32 characters)
    if (token.length < 32) {
        console.warn('⚠️  WARNING: PLUGIN_ADMIN_TOKEN is too short (minimum 32 characters recommended)');
        console.warn('⚠️  Current length:', token.length);
        return false;
    }
    
    console.log('✓ Bearer token authentication configured');
    console.log('  Token length:', token.length, 'characters');
    console.log('  Token prefix:', token.substring(0, 8) + '...');
    
    return true;
}

module.exports = {
    requireAuthOrToken,
    verifyBearerToken,
    skipCsrfForBearer,
    validateTokenConfiguration
};
