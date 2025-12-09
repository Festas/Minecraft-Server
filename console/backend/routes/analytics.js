/**
 * Analytics Routes
 * 
 * API endpoints for user analytics and server insights
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/auth');
const { requirePermission } = require('../middleware/rbac');
const analyticsService = require('../services/analyticsService');
const { body, query, validationResult } = require('express-validator');

/**
 * GET /api/analytics/dashboard
 * Get overview dashboard statistics
 */
router.get('/dashboard',
    requireAuth,
    requirePermission('ANALYTICS_VIEW'),
    [
        query('startDate').optional().isISO8601().withMessage('Invalid start date'),
        query('endDate').optional().isISO8601().withMessage('Invalid end date')
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }

        try {
            const { startDate, endDate } = req.query;
            const stats = analyticsService.getDashboardStats(startDate, endDate);
            
            res.json({
                success: true,
                stats,
                dateRange: {
                    start: startDate || null,
                    end: endDate || null
                }
            });
        } catch (error) {
            console.error('Error getting dashboard stats:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to retrieve dashboard statistics' 
            });
        }
    }
);

/**
 * GET /api/analytics/players
 * Get player activity analytics
 */
router.get('/players',
    requireAuth,
    requirePermission('ANALYTICS_VIEW'),
    [
        query('startDate').optional().isISO8601().withMessage('Invalid start date'),
        query('endDate').optional().isISO8601().withMessage('Invalid end date')
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }

        try {
            const { startDate, endDate } = req.query;
            const data = analyticsService.getPlayerActivity(startDate, endDate);
            
            res.json({
                success: true,
                data,
                dateRange: {
                    start: startDate || null,
                    end: endDate || null
                }
            });
        } catch (error) {
            console.error('Error getting player activity:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to retrieve player activity data' 
            });
        }
    }
);

/**
 * GET /api/analytics/server
 * Get server health analytics
 */
router.get('/server',
    requireAuth,
    requirePermission('ANALYTICS_VIEW'),
    [
        query('startDate').optional().isISO8601().withMessage('Invalid start date'),
        query('endDate').optional().isISO8601().withMessage('Invalid end date')
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }

        try {
            const { startDate, endDate } = req.query;
            const data = analyticsService.getServerHealth(startDate, endDate);
            
            res.json({
                success: true,
                data,
                dateRange: {
                    start: startDate || null,
                    end: endDate || null
                }
            });
        } catch (error) {
            console.error('Error getting server health:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to retrieve server health data' 
            });
        }
    }
);

/**
 * GET /api/analytics/plugins
 * Get plugin usage analytics
 */
router.get('/plugins',
    requireAuth,
    requirePermission('ANALYTICS_VIEW'),
    [
        query('startDate').optional().isISO8601().withMessage('Invalid start date'),
        query('endDate').optional().isISO8601().withMessage('Invalid end date')
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }

        try {
            const { startDate, endDate } = req.query;
            const data = analyticsService.getPluginUsage(startDate, endDate);
            
            res.json({
                success: true,
                data,
                dateRange: {
                    start: startDate || null,
                    end: endDate || null
                }
            });
        } catch (error) {
            console.error('Error getting plugin usage:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to retrieve plugin usage data' 
            });
        }
    }
);

/**
 * GET /api/analytics/export
 * Export analytics data
 */
router.get('/export',
    requireAuth,
    requirePermission('ANALYTICS_EXPORT'),
    [
        query('format').isIn(['json', 'csv']).withMessage('Format must be json or csv'),
        query('dataType').isIn(['dashboard', 'players', 'server', 'plugins']).withMessage('Invalid data type'),
        query('startDate').optional().isISO8601().withMessage('Invalid start date'),
        query('endDate').optional().isISO8601().withMessage('Invalid end date')
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }

        try {
            const { format, dataType, startDate, endDate } = req.query;
            const data = analyticsService.exportData(format, dataType, startDate, endDate);
            
            if (format === 'csv') {
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="analytics-${dataType}-${Date.now()}.csv"`);
                res.send(data);
            } else {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename="analytics-${dataType}-${Date.now()}.json"`);
                res.json(data);
            }
        } catch (error) {
            console.error('Error exporting analytics:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to export analytics data' 
            });
        }
    }
);

/**
 * GET /api/analytics/settings
 * Get privacy settings
 */
router.get('/settings',
    requireAuth,
    requirePermission('ANALYTICS_VIEW'),
    (req, res) => {
        try {
            const settings = analyticsService.getPrivacySettings();
            res.json({
                success: true,
                settings
            });
        } catch (error) {
            console.error('Error getting privacy settings:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to retrieve privacy settings' 
            });
        }
    }
);

/**
 * POST /api/analytics/settings
 * Update privacy settings
 */
router.post('/settings',
    requireAuth,
    requirePermission('ANALYTICS_MANAGE'),
    [
        body('collectPlayerData').optional().isBoolean().withMessage('collectPlayerData must be boolean'),
        body('collectServerMetrics').optional().isBoolean().withMessage('collectServerMetrics must be boolean'),
        body('collectPluginData').optional().isBoolean().withMessage('collectPluginData must be boolean'),
        body('retentionDays').optional().isInt({ min: 1, max: 365 }).withMessage('retentionDays must be between 1 and 365')
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }

        try {
            const settings = analyticsService.updatePrivacySettings(req.body);
            res.json({
                success: true,
                settings,
                message: 'Privacy settings updated successfully'
            });
        } catch (error) {
            console.error('Error updating privacy settings:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to update privacy settings' 
            });
        }
    }
);

module.exports = router;
