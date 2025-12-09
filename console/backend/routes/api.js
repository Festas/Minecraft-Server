const express = require('express');
const router = express.Router();
const { verifyCredentials, updateLastLogin } = require('../auth/auth');
const { loginLimiter } = require('../middleware/rateLimiter');
const { validations } = require('../middleware/validation');
const { logAuditEvent, AUDIT_EVENTS, getClientIp } = require('../services/auditLog');

/**
 * POST /api/login
 * Authenticate user
 */
router.post('/login', loginLimiter, validations.login, async (req, res) => {
    const { username, password } = req.body;

    console.log('[LOGIN] Login attempt:', {
        username,
        sessionID: req.sessionID,
        hasSession: !!req.session,
        timestamp: new Date().toISOString()
    });

    // Defensive check: Ensure session middleware is initialized
    if (!req.session) {
        console.error('[LOGIN] FATAL: Session middleware not initialized - req.session is undefined');
        console.error('[LOGIN] This indicates session middleware was not applied before routes');
        console.error('[LOGIN] Check server.js initialization order');
        return res.status(500).json({ 
            error: 'Session system not available',
            message: 'The session system is not properly initialized. Please contact the administrator.'
        });
    }

    if (!username || !password) {
        console.log('[LOGIN] Login failed: Missing credentials');
        return res.status(400).json({ error: 'Username and password required' });
    }

    try {
        const user = await verifyCredentials(username, password);
        
        if (user) {
            req.session.authenticated = true;
            req.session.username = user.username;
            req.session.role = user.role;
            
            // Update last login timestamp
            await updateLastLogin(user.username);
            
            // Log successful login
            await logAuditEvent(
                AUDIT_EVENTS.LOGIN_SUCCESS,
                user.username,
                { role: user.role },
                getClientIp(req)
            );
            
            // Force session save to ensure it's persisted before responding
            req.session.save((err) => {
                if (err) {
                    console.error('[LOGIN] Session save error:', err);
                    return res.status(500).json({ error: 'Failed to create session' });
                }
                
                console.log('[LOGIN] Login successful:', {
                    username: user.username,
                    role: user.role,
                    sessionID: process.env.NODE_ENV === 'development' ? req.sessionID : '[REDACTED]',
                    authenticated: req.session.authenticated,
                    cookieMaxAge: req.session.cookie.maxAge,
                    cookieExpires: req.session.cookie.expires
                });
                
                res.json({ 
                    success: true, 
                    message: 'Login successful',
                    user: {
                        username: user.username,
                        role: user.role
                    }
                });
            });
        } else {
            console.log('[LOGIN] Login failed: Invalid credentials for user:', username);
            
            // Log failed login attempt
            await logAuditEvent(
                AUDIT_EVENTS.LOGIN_FAILURE,
                username,
                { reason: 'invalid_credentials' },
                getClientIp(req)
            );
            
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('[LOGIN] Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/logout
 * Logout user
 */
router.post('/logout', async (req, res) => {
    const username = req.session?.username;
    
    // Log logout event
    if (username) {
        await logAuditEvent(
            AUDIT_EVENTS.LOGOUT,
            username,
            {},
            getClientIp(req)
        );
    }
    
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to logout' });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

/**
 * GET /api/session
 * Check if user is authenticated
 */
router.get('/session', (req, res) => {
    console.log('[SESSION] Session check:', {
        sessionID: req.sessionID,
        authenticated: req.session?.authenticated || false,
        username: req.session?.username,
        role: req.session?.role
    });
    
    if (req.session && req.session.authenticated) {
        res.json({ 
            authenticated: true, 
            username: req.session.username,
            role: req.session.role
        });
    } else {
        res.json({ authenticated: false });
    }
});

/**
 * GET /api/debug/logs
 * Get debug logs for diagnostics (requires authentication)
 * This endpoint helps diagnose session and CSRF issues
 */
router.get('/debug/logs', async (req, res) => {
    const { getDebugLogs } = require('../middleware/debugLogger');
    
    // Check authentication
    if (!req.session || !req.session.authenticated) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
        const logs = await getDebugLogs(1000); // Get last 1000 lines
        res.type('text/plain').send(logs);
    } catch (error) {
        console.error('Error fetching debug logs:', error);
        res.status(500).json({ error: 'Failed to fetch debug logs' });
    }
});

module.exports = router;
