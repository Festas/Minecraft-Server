/**
 * Plugin Integration Routes
 * 
 * REST API endpoints for plugin integrations (Dynmap, EssentialsX, etc.)
 * Provides unified access to plugin data with authentication and access control.
 */

const express = require('express');
const router = express.Router();
const { requireAuthOrToken, skipCsrfForBearer } = require('../auth/bearerAuth');
const rateLimit = require('express-rate-limit');
const pluginGateway = require('../services/pluginGateway');
const { logAuditEvent, AUDIT_EVENTS, getClientIp } = require('../services/auditLog');

// Rate limiter for plugin integration endpoints
const pluginIntegrationRateLimiter = rateLimit({
    windowMs: 60000, // 1 minute
    max: 60, // 60 requests per minute
    message: 'Too many plugin integration requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply middleware
router.use(skipCsrfForBearer); // Skip CSRF for Bearer token requests
router.use(requireAuthOrToken); // Require authentication (session or Bearer)
router.use(pluginIntegrationRateLimiter); // Apply rate limiting

// ============================================================================
// DYNMAP ENDPOINTS
// ============================================================================

/**
 * GET /api/plugins/dynmap/players
 * Get current online players from Dynmap
 */
router.get('/dynmap/players', async (req, res) => {
    try {
        const players = await pluginGateway.call('dynmap', 'getPlayers');
        
        // Log access
        await logAuditEvent(
            AUDIT_EVENTS.API_ACCESS,
            req.session?.username || 'api',
            { endpoint: '/api/plugins/dynmap/players', playerCount: players.length },
            getClientIp(req)
        );
        
        res.json({
            success: true,
            plugin: 'dynmap',
            data: {
                players,
                count: players.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[PluginIntegrations] Dynmap players error:', error.message);
        
        res.status(error.message.includes('not ready') ? 503 : 500).json({
            success: false,
            error: error.message,
            plugin: 'dynmap'
        });
    }
});

/**
 * GET /api/plugins/dynmap/worlds
 * Get list of available worlds from Dynmap
 */
router.get('/dynmap/worlds', async (req, res) => {
    try {
        const worlds = await pluginGateway.call('dynmap', 'getWorlds');
        
        res.json({
            success: true,
            plugin: 'dynmap',
            data: {
                worlds,
                count: worlds.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[PluginIntegrations] Dynmap worlds error:', error.message);
        
        res.status(error.message.includes('not ready') ? 503 : 500).json({
            success: false,
            error: error.message,
            plugin: 'dynmap'
        });
    }
});

/**
 * GET /api/plugins/dynmap/world/:worldName
 * Get data for a specific world
 */
router.get('/dynmap/world/:worldName', async (req, res) => {
    try {
        const { worldName } = req.params;
        const worldData = await pluginGateway.call('dynmap', 'getWorldData', { worldName });
        
        res.json({
            success: true,
            plugin: 'dynmap',
            data: worldData,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[PluginIntegrations] Dynmap world error:', error.message);
        
        res.status(error.message.includes('not ready') ? 503 : 500).json({
            success: false,
            error: error.message,
            plugin: 'dynmap'
        });
    }
});

/**
 * GET /api/plugins/dynmap/markers/:worldName
 * Get markers for a specific world
 */
router.get('/dynmap/markers/:worldName?', async (req, res) => {
    try {
        const worldName = req.params.worldName || 'world';
        const markers = await pluginGateway.call('dynmap', 'getMarkers', { worldName });
        
        res.json({
            success: true,
            plugin: 'dynmap',
            data: markers,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[PluginIntegrations] Dynmap markers error:', error.message);
        
        res.status(error.message.includes('not ready') ? 503 : 500).json({
            success: false,
            error: error.message,
            plugin: 'dynmap'
        });
    }
});

/**
 * GET /api/plugins/dynmap/health
 * Check Dynmap adapter health
 */
router.get('/dynmap/health', async (req, res) => {
    try {
        const health = await pluginGateway.checkHealth('dynmap');
        
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json({
            success: health.status === 'healthy',
            plugin: 'dynmap',
            health,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[PluginIntegrations] Dynmap health error:', error.message);
        
        res.status(500).json({
            success: false,
            error: error.message,
            plugin: 'dynmap'
        });
    }
});

// ============================================================================
// ESSENTIALSX ENDPOINTS
// ============================================================================

/**
 * GET /api/plugins/essentialsx/status
 * Get EssentialsX server status
 */
router.get('/essentialsx/status', async (req, res) => {
    try {
        const status = await pluginGateway.call('essentialsx', 'getServerStatus');
        
        // Log access
        await logAuditEvent(
            AUDIT_EVENTS.API_ACCESS,
            req.session?.username || 'api',
            { endpoint: '/api/plugins/essentialsx/status' },
            getClientIp(req)
        );
        
        res.json({
            success: true,
            plugin: 'essentialsx',
            data: status,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[PluginIntegrations] EssentialsX status error:', error.message);
        
        res.status(error.message.includes('not ready') ? 503 : 500).json({
            success: false,
            error: error.message,
            plugin: 'essentialsx'
        });
    }
});

/**
 * GET /api/plugins/essentialsx/players
 * Get all players from EssentialsX
 */
router.get('/essentialsx/players', async (req, res) => {
    try {
        const players = await pluginGateway.call('essentialsx', 'getPlayers');
        
        res.json({
            success: true,
            plugin: 'essentialsx',
            data: {
                players,
                count: players.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[PluginIntegrations] EssentialsX players error:', error.message);
        
        res.status(error.message.includes('not ready') ? 503 : 500).json({
            success: false,
            error: error.message,
            plugin: 'essentialsx'
        });
    }
});

/**
 * GET /api/plugins/essentialsx/players/online
 * Get online players from EssentialsX
 */
router.get('/essentialsx/players/online', async (req, res) => {
    try {
        const players = await pluginGateway.call('essentialsx', 'getOnlinePlayers');
        
        res.json({
            success: true,
            plugin: 'essentialsx',
            data: {
                players,
                count: players.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[PluginIntegrations] EssentialsX online players error:', error.message);
        
        res.status(error.message.includes('not ready') ? 503 : 500).json({
            success: false,
            error: error.message,
            plugin: 'essentialsx'
        });
    }
});

/**
 * GET /api/plugins/essentialsx/player/:identifier
 * Get specific player information
 */
router.get('/essentialsx/player/:identifier', async (req, res) => {
    try {
        const { identifier } = req.params;
        const player = await pluginGateway.call('essentialsx', 'getPlayer', { playerIdentifier: identifier });
        
        res.json({
            success: true,
            plugin: 'essentialsx',
            data: player,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[PluginIntegrations] EssentialsX player error:', error.message);
        
        const statusCode = error.message.includes('not found') ? 404 :
                           error.message.includes('not ready') ? 503 : 500;
        
        res.status(statusCode).json({
            success: false,
            error: error.message,
            plugin: 'essentialsx'
        });
    }
});

/**
 * GET /api/plugins/essentialsx/warps
 * Get list of warps
 */
router.get('/essentialsx/warps', async (req, res) => {
    try {
        const warps = await pluginGateway.call('essentialsx', 'getWarps');
        
        res.json({
            success: true,
            plugin: 'essentialsx',
            data: {
                warps,
                count: warps.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[PluginIntegrations] EssentialsX warps error:', error.message);
        
        res.status(error.message.includes('not ready') ? 503 : 500).json({
            success: false,
            error: error.message,
            plugin: 'essentialsx'
        });
    }
});

/**
 * GET /api/plugins/essentialsx/kits
 * Get list of kits
 */
router.get('/essentialsx/kits', async (req, res) => {
    try {
        const kits = await pluginGateway.call('essentialsx', 'getKits');
        
        res.json({
            success: true,
            plugin: 'essentialsx',
            data: {
                kits,
                count: kits.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[PluginIntegrations] EssentialsX kits error:', error.message);
        
        res.status(error.message.includes('not ready') ? 503 : 500).json({
            success: false,
            error: error.message,
            plugin: 'essentialsx'
        });
    }
});

/**
 * GET /api/plugins/essentialsx/health
 * Check EssentialsX adapter health
 */
router.get('/essentialsx/health', async (req, res) => {
    try {
        const health = await pluginGateway.checkHealth('essentialsx');
        
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json({
            success: health.status === 'healthy',
            plugin: 'essentialsx',
            health,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[PluginIntegrations] EssentialsX health error:', error.message);
        
        res.status(500).json({
            success: false,
            error: error.message,
            plugin: 'essentialsx'
        });
    }
});

// ============================================================================
// GENERAL PLUGIN ENDPOINTS
// ============================================================================

/**
 * GET /api/plugins/integrations
 * Get list of all registered plugin integrations
 */
router.get('/integrations', async (req, res) => {
    try {
        const adapters = pluginGateway.getRegisteredAdapters();
        
        res.json({
            success: true,
            data: {
                adapters,
                count: adapters.length
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[PluginIntegrations] List adapters error:', error.message);
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/plugins/integrations/health
 * Check health of all plugin integrations
 */
router.get('/integrations/health', async (req, res) => {
    try {
        const health = await pluginGateway.checkAllHealth();
        
        const statusCode = health.healthy ? 200 : 503;
        res.status(statusCode).json({
            success: health.healthy,
            data: health,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[PluginIntegrations] Health check error:', error.message);
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
