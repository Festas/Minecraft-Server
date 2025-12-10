/**
 * Bearer Token Authentication Middleware
 * Supports stateless Bearer token authentication for plugin API and API keys
 */

const apiKeyService = require('../services/apiKeyService');

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
 * Verify API key from Authorization header
 * @param {object} req - Express request object
 * @returns {object|null} API key data if valid, null otherwise
 */
function verifyApiKey(req) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Check if it's an API key (starts with 'mcs_')
    if (!token.startsWith('mcs_')) {
        return null;
    }
    
    // Validate the API key
    const keyData = apiKeyService.validateApiKey(token);
    
    if (!keyData) {
        console.log('[BearerAuth] Invalid or expired API key');
        return null;
    }
    
    // Log minimal key info (avoid exposing sensitive scope details in production)
    if (process.env.NODE_ENV === 'development') {
        console.log('[BearerAuth] Valid API key:', {
            id: keyData.id,
            name: keyData.name,
            prefix: keyData.key_prefix,
            scopes: keyData.scopes
        });
    } else {
        console.log('[BearerAuth] Valid API key:', {
            id: keyData.id,
            name: keyData.name,
            prefix: keyData.key_prefix
        });
    }
    
    return keyData;
}

/**
 * Authentication middleware that supports session, Bearer token, and API keys
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
    
    // Check API key first (most specific)
    const apiKeyData = verifyApiKey(req);
    if (apiKeyData) {
        console.log('[Auth] API key authentication successful');
        req.authenticatedVia = 'apiKey';
        req.apiKey = apiKeyData;
        return next();
    }
    
    // Check Bearer token (for plugin admin)
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
    console.log('[Auth] Authentication failed: no valid API key, Bearer token, or session');
    res.status(401).json({ 
        error: 'Authentication required',
        message: 'Provide a valid API key, Bearer token, or authenticated session'
    });
}

/**
 * Middleware to skip CSRF for Bearer token and API key requests
 */
function skipCsrfForBearer(req, res, next) {
    // If authenticated via Bearer token or API key, skip CSRF
    if (req.headers.authorization?.startsWith('Bearer ')) {
        if (verifyBearerToken(req) || verifyApiKey(req)) {
            req.skipCsrf = true;
        }
    }
    next();
}

/**
 * Middleware to require specific API key scope
 * @param {string} scope - Required scope (e.g., 'server:read')
 * @returns {Function} Express middleware
 */
function requireApiScope(scope) {
    return (req, res, next) => {
        // Only check scope for API key authentication
        if (req.authenticatedVia !== 'apiKey') {
            return next();
        }

        if (!req.apiKey) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'API key authentication required'
            });
        }

        if (!apiKeyService.hasScope(req.apiKey, scope)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: `API key lacks required scope: ${scope}`
            });
        }

        next();
    };
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
    verifyApiKey,
    skipCsrfForBearer,
    requireApiScope,
    validateTokenConfiguration
};
