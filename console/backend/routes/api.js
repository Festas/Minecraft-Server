const express = require('express');
const router = express.Router();
const { verifyCredentials } = require('../auth/auth');
const { loginLimiter } = require('../middleware/rateLimiter');
const { validations } = require('../middleware/validation');

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

    if (!username || !password) {
        console.log('[LOGIN] Login failed: Missing credentials');
        return res.status(400).json({ error: 'Username and password required' });
    }

    try {
        const valid = await verifyCredentials(username, password);
        
        if (valid) {
            req.session.authenticated = true;
            req.session.username = username;
            
            // Force session save to ensure it's persisted before responding
            req.session.save((err) => {
                if (err) {
                    console.error('[LOGIN] Session save error:', err);
                    return res.status(500).json({ error: 'Failed to create session' });
                }
                
                console.log('[LOGIN] Login successful:', {
                    username,
                    sessionID: req.sessionID,
                    authenticated: req.session.authenticated,
                    cookieMaxAge: req.session.cookie.maxAge,
                    cookieExpires: req.session.cookie.expires
                });
                
                res.json({ 
                    success: true, 
                    message: 'Login successful',
                    sessionID: req.sessionID // Return session ID for debugging
                });
            });
        } else {
            console.log('[LOGIN] Login failed: Invalid credentials for user:', username);
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
router.post('/logout', (req, res) => {
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
        username: req.session?.username
    });
    
    if (req.session && req.session.authenticated) {
        res.json({ 
            authenticated: true, 
            username: req.session.username 
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
    const { requireAuth } = require('../auth/auth');
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
