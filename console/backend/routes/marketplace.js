const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/auth');
const { checkPermission } = require('../middleware/rbac');
const rateLimit = require('express-rate-limit');
const marketplaceService = require('../services/marketplaceService');
const { PERMISSIONS } = require('../config/rbac');

// Rate limiter for marketplace operations
const marketplaceRateLimiter = rateLimit({
    windowMs: 60000, // 1 minute
    max: 30, // 30 requests per minute (higher than plugin ops since it's read-heavy)
    message: 'Too many marketplace requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// All marketplace routes require authentication and view permission
router.use(requireAuth);
router.use(checkPermission(PERMISSIONS.PLUGIN_VIEW));
router.use(marketplaceRateLimiter);

/**
 * GET /api/marketplace/search
 * Search for plugins across marketplaces
 * Query params:
 *   - q: search query
 *   - platform: all, modrinth, hangar (default: all)
 *   - category: category filter
 *   - version: minecraft version filter
 *   - limit: results per page (default: 20)
 *   - offset: pagination offset (default: 0)
 *   - sortBy: relevance, downloads, updated, newest (default: relevance)
 */
router.get('/search', async (req, res) => {
    try {
        const {
            q = '',
            platform = 'all',
            category = null,
            version = null,
            limit = 20,
            offset = 0,
            sortBy = 'relevance'
        } = req.query;

        const results = await marketplaceService.searchPlugins(q, {
            platform,
            category,
            version,
            limit: parseInt(limit),
            offset: parseInt(offset),
            sortBy
        });

        res.json({
            success: true,
            ...results
        });
    } catch (error) {
        console.error('Error searching marketplace:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search marketplace',
            message: error.message
        });
    }
});

/**
 * GET /api/marketplace/plugin/:platform/:pluginId
 * Get detailed information about a specific plugin
 * Path params:
 *   - platform: modrinth, hangar
 *   - pluginId: plugin identifier
 */
router.get('/plugin/:platform/:pluginId', async (req, res) => {
    try {
        const { platform, pluginId } = req.params;

        if (!['modrinth', 'hangar'].includes(platform)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid platform. Must be modrinth or hangar'
            });
        }

        const details = await marketplaceService.getPluginDetails(pluginId, platform);

        res.json({
            success: true,
            plugin: details
        });
    } catch (error) {
        console.error('Error fetching plugin details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch plugin details',
            message: error.message
        });
    }
});

/**
 * GET /api/marketplace/plugin/:platform/:pluginId/versions
 * Get available versions for a plugin
 * Path params:
 *   - platform: modrinth, hangar
 *   - pluginId: plugin identifier
 * Query params:
 *   - gameVersion: minecraft version filter (optional)
 */
router.get('/plugin/:platform/:pluginId/versions', async (req, res) => {
    try {
        const { platform, pluginId } = req.params;
        const { gameVersion = null } = req.query;

        if (!['modrinth', 'hangar'].includes(platform)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid platform. Must be modrinth or hangar'
            });
        }

        const versions = await marketplaceService.getPluginVersions(
            pluginId,
            platform,
            gameVersion
        );

        res.json({
            success: true,
            versions
        });
    } catch (error) {
        console.error('Error fetching plugin versions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch plugin versions',
            message: error.message
        });
    }
});

/**
 * GET /api/marketplace/featured
 * Get featured/popular plugins
 * Query params:
 *   - limit: number of results (default: 10)
 *   - category: category filter
 *   - version: minecraft version filter
 */
router.get('/featured', async (req, res) => {
    try {
        const {
            limit = 10,
            category = null,
            version = null
        } = req.query;

        const plugins = await marketplaceService.getFeaturedPlugins({
            limit: parseInt(limit),
            category,
            version
        });

        res.json({
            success: true,
            plugins
        });
    } catch (error) {
        console.error('Error fetching featured plugins:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch featured plugins',
            message: error.message
        });
    }
});

/**
 * GET /api/marketplace/categories
 * Get available plugin categories
 */
router.get('/categories', async (req, res) => {
    try {
        const categories = await marketplaceService.getCategories();

        res.json({
            success: true,
            categories
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch categories',
            message: error.message
        });
    }
});

module.exports = router;
