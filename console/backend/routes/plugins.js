const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { requireAuth } = require('../auth/auth');
const { checkPermission } = require('../middleware/rbac');
const { PERMISSIONS } = require('../config/rbac');
const rateLimit = require('express-rate-limit');
const pluginManager = require('../services/pluginManager');

// Configure multer for file uploads
const upload = multer({
    dest: '/tmp/plugin-uploads/',
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max file size
        files: 1 // Only one file at a time
    },
    fileFilter: (req, file, cb) => {
        // Only accept .jar files
        if (path.extname(file.originalname).toLowerCase() === '.jar') {
            cb(null, true);
        } else {
            cb(new Error('Only .jar files are allowed'), false);
        }
    }
});

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
    const logInfo = {
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
    };
    
    // Development-only: Log detailed diagnostic information
    if (process.env.NODE_ENV === 'development') {
        logInfo.sessionData = req.session;
        logInfo.cookies = req.cookies;
        logInfo.headers = {
            'csrf-token': req.headers['csrf-token'],
            'x-csrf-token': req.headers['x-csrf-token'],
            'cookie': req.headers.cookie,
            'content-type': req.headers['content-type'],
            'user-agent': req.headers['user-agent'],
            host: req.headers.host,
            origin: req.headers.origin,
            referer: req.headers.referer
        };
    }
    
    console.log('[PLUGIN_INSTALL_API] Install request received:', logInfo);
    
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

/**
 * GET /api/plugins/:pluginName/updates
 * Check for updates for a specific plugin
 */
router.get('/:pluginName/updates', async (req, res) => {
    try {
        const { pluginName } = req.params;
        
        if (!pluginName) {
            return res.status(400).json({ error: 'Plugin name is required' });
        }
        
        const updateInfo = await pluginManager.checkForUpdates(pluginName);
        res.json({ success: true, ...updateInfo });
    } catch (error) {
        console.error('Error checking for updates:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/plugins/updates/check-all
 * Check for updates for all installed plugins
 */
router.get('/updates/check-all', async (req, res) => {
    try {
        const updates = await pluginManager.checkAllUpdates();
        res.json({ success: true, updates });
    } catch (error) {
        console.error('Error checking all updates:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/plugins/:pluginName/config
 * Get plugin configuration preview
 */
router.get('/:pluginName/config', async (req, res) => {
    try {
        const { pluginName } = req.params;
        
        if (!pluginName) {
            return res.status(400).json({ error: 'Plugin name is required' });
        }
        
        const config = await pluginManager.getPluginConfig(pluginName);
        res.json({ success: true, ...config });
    } catch (error) {
        console.error('Error getting plugin config:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/plugins/upload
 * Upload a custom plugin JAR file
 * Requires PLUGIN_INSTALL permission
 */
router.post('/upload', checkPermission(PERMISSIONS.PLUGIN_INSTALL), upload.single('plugin'), async (req, res) => {
    let uploadedFilePath = null;
    
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({ 
                error: 'No file uploaded',
                details: 'Please select a .jar file to upload'
            });
        }
        
        uploadedFilePath = req.file.path;
        const originalName = req.file.originalname;
        
        console.log('[PLUGIN_UPLOAD] File uploaded:', {
            originalName,
            size: req.file.size,
            path: uploadedFilePath,
            user: req.session.username
        });
        
        // Validate JAR file
        const { isValidJar } = require('../services/pluginParser');
        const isValid = await isValidJar(uploadedFilePath);
        
        if (!isValid) {
            // Clean up uploaded file
            await fs.unlink(uploadedFilePath);
            return res.status(400).json({
                error: 'Invalid plugin file',
                details: 'The uploaded file is not a valid Minecraft plugin JAR file. It must contain a valid plugin.yml.'
            });
        }
        
        // Parse plugin metadata
        const { parsePluginYml } = require('../services/pluginParser');
        const metadata = await parsePluginYml(uploadedFilePath);
        
        if (!metadata || !metadata.name) {
            // Clean up uploaded file
            await fs.unlink(uploadedFilePath);
            return res.status(400).json({
                error: 'Invalid plugin metadata',
                details: 'The plugin.yml file is missing required fields (name is required).'
            });
        }
        
        console.log('[PLUGIN_UPLOAD] Plugin validated:', metadata);
        
        // Install the plugin using pluginManager
        const PLUGINS_DIR = process.env.PLUGINS_DIR || path.join(process.cwd(), '../../plugins');
        const targetPath = path.join(PLUGINS_DIR, `${metadata.name}.jar`);
        
        // Check if plugin already exists
        const existingPlugin = await pluginManager.findPlugin(metadata.name);
        
        if (existingPlugin) {
            // Create backup before overwriting
            const backupPath = path.join(PLUGINS_DIR, `${metadata.name}.jar.backup.${Date.now()}`);
            const currentPath = path.join(PLUGINS_DIR, `${metadata.name}.jar`);
            
            try {
                await fs.copyFile(currentPath, backupPath);
                console.log('[PLUGIN_UPLOAD] Backup created:', backupPath);
            } catch (backupError) {
                console.warn('[PLUGIN_UPLOAD] Backup failed (file may not exist):', backupError.message);
            }
        }
        
        // Move uploaded file to plugins directory
        await fs.rename(uploadedFilePath, targetPath);
        console.log('[PLUGIN_UPLOAD] Plugin moved to:', targetPath);
        
        // Update plugins.json
        const PLUGINS_JSON = process.env.PLUGINS_JSON || path.join(process.cwd(), '../../plugins.json');
        let pluginsData = { plugins: [] };
        
        try {
            const data = await fs.readFile(PLUGINS_JSON, 'utf8');
            pluginsData = JSON.parse(data);
        } catch (error) {
            console.warn('[PLUGIN_UPLOAD] plugins.json not found or invalid, creating new');
        }
        
        // Update or add plugin entry
        const pluginIndex = pluginsData.plugins.findIndex(p => p.name === metadata.name);
        const pluginEntry = {
            name: metadata.name,
            version: metadata.version || 'unknown',
            description: metadata.description || '',
            author: metadata.author || (metadata.authors ? metadata.authors.join(', ') : ''),
            enabled: true,
            category: 'custom',
            source: 'upload',
            uploaded_at: new Date().toISOString(),
            uploaded_by: req.session.username,
            ...metadata
        };
        
        if (pluginIndex >= 0) {
            pluginsData.plugins[pluginIndex] = pluginEntry;
        } else {
            pluginsData.plugins.push(pluginEntry);
        }
        
        await fs.writeFile(PLUGINS_JSON, JSON.stringify(pluginsData, null, 2));
        
        // Add to history
        const HISTORY_FILE = path.join(__dirname, '../data/plugin-history.json');
        let history = [];
        
        try {
            const historyData = await fs.readFile(HISTORY_FILE, 'utf8');
            history = JSON.parse(historyData);
        } catch (error) {
            // History file doesn't exist or is invalid
        }
        
        history.unshift({
            pluginName: metadata.name,
            action: existingPlugin ? 'update_upload' : 'install_upload',
            timestamp: new Date().toISOString(),
            user: req.session.username,
            version: metadata.version,
            status: 'success'
        });
        
        // Keep only last 100 entries
        history = history.slice(0, 100);
        
        await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
        
        res.json({
            success: true,
            status: existingPlugin ? 'updated' : 'installed',
            pluginName: metadata.name,
            version: metadata.version,
            message: existingPlugin 
                ? `Plugin ${metadata.name} updated successfully via upload`
                : `Plugin ${metadata.name} installed successfully via upload`,
            metadata
        });
        
    } catch (error) {
        // Clean up uploaded file on error
        if (uploadedFilePath) {
            try {
                await fs.unlink(uploadedFilePath);
            } catch (cleanupError) {
                console.error('[PLUGIN_UPLOAD] Failed to cleanup uploaded file:', cleanupError);
            }
        }
        
        console.error('[PLUGIN_UPLOAD] Upload failed:', error);
        
        // Handle multer errors
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    error: 'File too large',
                    details: 'Plugin file must be smaller than 100MB'
                });
            }
            return res.status(400).json({
                error: 'Upload error',
                details: error.message
            });
        }
        
        res.status(500).json({ 
            error: 'Upload failed',
            details: error.message
        });
    }
});

module.exports = router;
