/**
 * API Key Routes
 * 
 * Routes for managing API keys for external integrations
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/auth');
const { requirePermission } = require('../middleware/rbac');
const apiKeyService = require('../services/apiKeyService');
const { body, query, validationResult } = require('express-validator');

/**
 * GET /api/api-keys
 * List all API keys
 */
router.get('/',
    requireAuth,
    requirePermission('API_KEY_VIEW'),
    (req, res) => {
        try {
            const keys = apiKeyService.listApiKeys();
            
            res.json({
                success: true,
                api_keys: keys
            });
        } catch (error) {
            console.error('Error listing API keys:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to list API keys'
            });
        }
    }
);

/**
 * GET /api/api-keys/scopes
 * Get available API scopes
 */
router.get('/scopes',
    requireAuth,
    requirePermission('API_KEY_VIEW'),
    (req, res) => {
        try {
            const scopes = apiKeyService.getAvailableScopes();
            
            res.json({
                success: true,
                scopes
            });
        } catch (error) {
            console.error('Error getting scopes:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get available scopes'
            });
        }
    }
);

/**
 * GET /api/api-keys/:id
 * Get specific API key details
 */
router.get('/:id',
    requireAuth,
    requirePermission('API_KEY_VIEW'),
    (req, res) => {
        try {
            const { id } = req.params;
            const apiKey = apiKeyService.getApiKey(id);
            
            if (!apiKey) {
                return res.status(404).json({
                    success: false,
                    error: 'API key not found'
                });
            }
            
            res.json({
                success: true,
                api_key: apiKey
            });
        } catch (error) {
            console.error('Error getting API key:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get API key'
            });
        }
    }
);

/**
 * POST /api/api-keys
 * Create a new API key
 */
router.post('/',
    requireAuth,
    requirePermission('API_KEY_CREATE'),
    [
        body('name').notEmpty().withMessage('Name is required'),
        body('scopes').isArray({ min: 1 }).withMessage('At least one scope is required'),
        body('rate_limit_per_hour').optional().isInt({ min: 1 }).withMessage('Rate limit must be a positive integer'),
        body('expires_at').optional().isISO8601().withMessage('Invalid expiration date')
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        try {
            const { name, scopes, rate_limit_per_hour, expires_at } = req.body;
            
            const apiKey = apiKeyService.createApiKey({
                name,
                scopes,
                rate_limit_per_hour,
                expires_at,
                created_by: req.session.username
            });
            
            res.status(201).json({
                success: true,
                message: 'API key created successfully',
                api_key: apiKey,
                warning: 'Save this API key securely. It will not be shown again.'
            });
        } catch (error) {
            console.error('Error creating API key:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to create API key'
            });
        }
    }
);

/**
 * PATCH /api/api-keys/:id
 * Update an API key
 */
router.patch('/:id',
    requireAuth,
    requirePermission('API_KEY_EDIT'),
    [
        body('name').optional().notEmpty().withMessage('Name cannot be empty'),
        body('scopes').optional().isArray({ min: 1 }).withMessage('At least one scope is required'),
        body('rate_limit_per_hour').optional().isInt({ min: 1 }).withMessage('Rate limit must be a positive integer'),
        body('enabled').optional().isBoolean().withMessage('Enabled must be a boolean'),
        body('expires_at').optional().isISO8601().withMessage('Invalid expiration date')
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        try {
            const { id } = req.params;
            const updates = req.body;
            
            const updatedKey = apiKeyService.updateApiKey(id, updates);
            
            if (!updatedKey) {
                return res.status(404).json({
                    success: false,
                    error: 'API key not found'
                });
            }
            
            res.json({
                success: true,
                message: 'API key updated successfully',
                api_key: updatedKey
            });
        } catch (error) {
            console.error('Error updating API key:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to update API key'
            });
        }
    }
);

/**
 * DELETE /api/api-keys/:id
 * Revoke (delete) an API key
 */
router.delete('/:id',
    requireAuth,
    requirePermission('API_KEY_REVOKE'),
    (req, res) => {
        try {
            const { id } = req.params;
            
            const success = apiKeyService.revokeApiKey(id);
            
            if (!success) {
                return res.status(404).json({
                    success: false,
                    error: 'API key not found'
                });
            }
            
            res.json({
                success: true,
                message: 'API key revoked successfully'
            });
        } catch (error) {
            console.error('Error revoking API key:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to revoke API key'
            });
        }
    }
);

/**
 * GET /api/api-keys/:id/logs
 * Get usage logs for an API key
 */
router.get('/:id/logs',
    requireAuth,
    requirePermission('API_KEY_STATS'),
    [
        query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000')
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        try {
            const { id } = req.params;
            const limit = parseInt(req.query.limit) || 100;
            
            const logs = apiKeyService.getUsageLogs(id, limit);
            
            res.json({
                success: true,
                logs
            });
        } catch (error) {
            console.error('Error getting API key logs:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get API key logs'
            });
        }
    }
);

/**
 * GET /api/api-keys/:id/stats
 * Get usage statistics for an API key
 */
router.get('/:id/stats',
    requireAuth,
    requirePermission('API_KEY_STATS'),
    [
        query('start_date').optional().isISO8601().withMessage('Invalid start date'),
        query('end_date').optional().isISO8601().withMessage('Invalid end date')
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        try {
            const { id } = req.params;
            const startDate = req.query.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const endDate = req.query.end_date || new Date().toISOString();
            
            const stats = apiKeyService.getUsageStats(id, startDate, endDate);
            
            res.json({
                success: true,
                stats,
                date_range: {
                    start: startDate,
                    end: endDate
                }
            });
        } catch (error) {
            console.error('Error getting API key stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get API key statistics'
            });
        }
    }
);

module.exports = router;
