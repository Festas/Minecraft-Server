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

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    try {
        const valid = await verifyCredentials(username, password);
        
        if (valid) {
            req.session.authenticated = true;
            req.session.username = username;
            res.json({ success: true, message: 'Login successful' });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
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
    if (req.session && req.session.authenticated) {
        res.json({ 
            authenticated: true, 
            username: req.session.username 
        });
    } else {
        res.json({ authenticated: false });
    }
});

module.exports = router;
