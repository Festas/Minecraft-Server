const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/auth');
const rateLimit = require('express-rate-limit');
const pluginManager = require('../services/pluginManager');

// Rate limiter for plugin operations
const pluginRateLimiter = rateLimit({
    windowMs: 60000, // 1 minute
    max: 20, // 20 requests per minute
    message: 'Too many plugin requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// All plugin routes require authentication and rate limiting
router.use(requireAuth);
router.use(pluginRateLimiter);

/**
 * GET /api/plugins
 * Get list of all plugins from plugins.json
 * Always returns {plugins: []} even on errors, with optional error field
 */
router.get('/', async (req, res) => {
    try {
        const plugins = await pluginManager.getAllPlugins();
        
        // Add backup status to each plugin
        const pluginsWithBackup = plugins.map(plugin => ({
            ...plugin,
            hasBackup: pluginManager.hasBackup(plugin.name)
        }));
        
        res.json({ plugins: pluginsWithBackup });
    } catch (error) {
        console.error('Error fetching plugins:', error);
        // Always return plugins array, even if empty, with error message
        res.json({ 
            plugins: [], 
            error: 'Failed to load plugins. Please check the server logs for details.' 
        });
    }
});

/**
 * POST /api/plugins/parse-url
 * Parse a URL to detect type and get download information
 */
router.post('/parse-url', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        const urlInfo = await pluginManager.parseUrl(url);
        res.json(urlInfo);
    } catch (error) {
        console.error('Error parsing URL:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/plugins/install
 * Install plugin from URL
 */
router.post('/install', async (req, res) => {
    // Log the incoming request for debugging with CSRF details
    console.log('[PLUGIN_INSTALL_API] Install request received:', {
        url: req.body.url,
        customName: req.body.customName,
        selectedOption: req.body.selectedOption,
        sessionID: req.sessionID,
        authenticated: req.session?.authenticated || false,
        username: req.session?.username || 'NOT_SET',
        csrf: {
            headerValue: req.headers['csrf-token'] || req.headers['x-csrf-token'] || 'MISSING',
            cookieValue: (req.cookies && req.cookies['csrf-token']) || 'MISSING',
            headerPresent: !!(req.headers['csrf-token'] || req.headers['x-csrf-token']),
            cookiePresent: !!(req.cookies && req.cookies['csrf-token'])
        },
        timestamp: new Date().toISOString()
    });
    
    try {
        const { url, customName, selectedOption } = req.body;
        
        if (!url) {
            console.log('[PLUGIN_INSTALL_API] Install request failed: URL is required');
            return res.status(400).json({ 
                error: 'URL is required',
                details: 'The url field is required in the request body'
            });
        }
        
        // If a specific option was selected (from multiple JARs)
        const installUrl = selectedOption || url;
        
        const result = await pluginManager.installFromUrl(installUrl, customName, (progress) => {
            // Could emit progress via websocket here
            console.log(`Download progress: ${progress.percentage}%`);
        });
        
        console.log('[PLUGIN_INSTALL_API] Install request succeeded:', {
            url,
            status: result.status,
            pluginName: result.pluginName,
            version: result.version
        });
        
        res.json(result);
    } catch (error) {
        console.error('[PLUGIN_INSTALL_API] Install request failed with error:', {
            url: req.body.url,
            error: error.message,
            stack: error.stack
        });
        
        // Determine appropriate status code based on error type
        let statusCode = 500;
        let errorDetails = error.message;
        
        if (error.message.includes('not accessible or not writable')) {
            statusCode = 500;
            errorDetails = 'Permission error: Unable to write to plugins directory or plugins.json. Check server permissions.';
        } else if (error.message.includes('Invalid plugin file')) {
            statusCode = 400;
            errorDetails = 'The downloaded file is not a valid Minecraft plugin JAR file.';
        } else if (error.message.includes('timeout')) {
            statusCode = 504;
            errorDetails = 'Plugin download timed out. Please try again or check the URL.';
        }
        
        res.status(statusCode).json({ 
            error: errorDetails,
            originalError: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/plugins/proceed-install
 * Proceed with installation after conflict detection
 */
router.post('/proceed-install', async (req, res) => {
    // Log the incoming request for debugging
    console.log('[PLUGIN_INSTALL_API] Proceed-install request received:', {
        url: req.body.url,
        pluginName: req.body.pluginName,
        action: req.body.action,
        timestamp: new Date().toISOString()
    });
    
    try {
        const { url, pluginName, action } = req.body;
        
        if (!url || !pluginName || !action) {
            console.log('[PLUGIN_INSTALL_API] Proceed-install request failed: Missing required fields');
            return res.status(400).json({ 
                error: 'URL, pluginName, and action are required',
                details: 'All three fields (url, pluginName, action) must be provided'
            });
        }
        
        if (!['update', 'downgrade', 'reinstall'].includes(action)) {
            console.log('[PLUGIN_INSTALL_API] Proceed-install request failed: Invalid action');
            return res.status(400).json({ 
                error: 'Invalid action',
                details: 'Action must be one of: update, downgrade, reinstall'
            });
        }
        
        const result = await pluginManager.proceedWithInstall(url, pluginName, action, (progress) => {
            console.log(`Download progress: ${progress.percentage}%`);
        });
        
        console.log('[PLUGIN_INSTALL_API] Proceed-install request succeeded:', {
            url,
            pluginName,
            action,
            status: result.status,
            version: result.version
        });
        
        res.json(result);
    } catch (error) {
        console.error('[PLUGIN_INSTALL_API] Proceed-install request failed with error:', {
            url: req.body.url,
            pluginName: req.body.pluginName,
            action: req.body.action,
            error: error.message,
            stack: error.stack
        });
        
        // Determine appropriate status code based on error type
        let statusCode = 500;
        let errorDetails = error.message;
        
        if (error.message.includes('Invalid plugin file')) {
            statusCode = 400;
            errorDetails = 'The downloaded file is not a valid Minecraft plugin JAR file.';
        } else if (error.message.includes('timeout')) {
            statusCode = 504;
            errorDetails = 'Plugin download timed out. Please try again or check the URL.';
        }
        
        res.status(statusCode).json({ 
            error: errorDetails,
            originalError: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/plugins/uninstall
 * Uninstall a plugin
 */
router.post('/uninstall', async (req, res) => {
    try {
        const { pluginName, deleteConfigs } = req.body;
        
        if (!pluginName) {
            return res.status(400).json({ error: 'Plugin name is required' });
        }
        
        const result = await pluginManager.uninstallPlugin(pluginName, deleteConfigs || false);
        res.json(result);
    } catch (error) {
        console.error('Error uninstalling plugin:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/plugins/toggle
 * Enable or disable a plugin
 */
router.post('/toggle', async (req, res) => {
    try {
        const { pluginName, enabled } = req.body;
        
        if (!pluginName || typeof enabled !== 'boolean') {
            return res.status(400).json({ error: 'Plugin name and enabled status are required' });
        }
        
        const result = await pluginManager.togglePlugin(pluginName, enabled);
        res.json(result);
    } catch (error) {
        console.error('Error toggling plugin:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/plugins/rollback
 * Rollback plugin to backup version
 */
router.post('/rollback', async (req, res) => {
    try {
        const { pluginName } = req.body;
        
        if (!pluginName) {
            return res.status(400).json({ error: 'Plugin name is required' });
        }
        
        const result = await pluginManager.rollbackPlugin(pluginName);
        res.json(result);
    } catch (error) {
        console.error('Error rolling back plugin:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/plugins/history
 * Get installation history
 */
router.get('/history', async (req, res) => {
    try {
        const history = await pluginManager.getHistory();
        res.json({ history });
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/plugins/health
 * Health check for plugin manager
 * Returns 200 if plugins.json is parseable and plugins folder is writable
 */
router.get('/health', async (req, res) => {
    try {
        const health = await pluginManager.checkHealth();
        
        if (health.healthy) {
            res.status(200).json({
                status: 'healthy',
                checks: health.checks
            });
        } else {
            res.status(503).json({
                status: 'unhealthy',
                checks: health.checks
            });
        }
    } catch (error) {
        console.error('Error checking plugin manager health:', error);
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

module.exports = router;
