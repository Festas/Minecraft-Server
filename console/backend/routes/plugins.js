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
        res.status(500).json({ error: error.message });
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
    try {
        const { url, customName, selectedOption } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        // If a specific option was selected (from multiple JARs)
        const installUrl = selectedOption || url;
        
        const result = await pluginManager.installFromUrl(installUrl, customName, (progress) => {
            // Could emit progress via websocket here
            console.log(`Download progress: ${progress.percentage}%`);
        });
        
        res.json(result);
    } catch (error) {
        console.error('Error installing plugin:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/plugins/proceed-install
 * Proceed with installation after conflict detection
 */
router.post('/proceed-install', async (req, res) => {
    try {
        const { url, pluginName, action } = req.body;
        
        if (!url || !pluginName || !action) {
            return res.status(400).json({ error: 'URL, pluginName, and action are required' });
        }
        
        if (!['update', 'downgrade', 'reinstall'].includes(action)) {
            return res.status(400).json({ error: 'Invalid action' });
        }
        
        const result = await pluginManager.proceedWithInstall(url, pluginName, action, (progress) => {
            console.log(`Download progress: ${progress.percentage}%`);
        });
        
        res.json(result);
    } catch (error) {
        console.error('Error proceeding with install:', error);
        res.status(500).json({ error: error.message });
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

module.exports = router;
