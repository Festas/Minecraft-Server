/**
 * Webhooks Routes
 * 
 * API endpoints for managing outbound and inbound webhooks.
 * Includes RBAC enforcement and rate limiting.
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/auth');
const { requirePermission } = require('../middleware/rbac');
const { PERMISSIONS } = require('../config/rbac');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');
const webhookService = require('../services/webhookService');
const inboundWebhookService = require('../services/inboundWebhookService');
const crypto = require('crypto');

// Rate limiter for webhook operations
const webhookRateLimiter = rateLimit({
    windowMs: 60000, // 1 minute
    max: 60, // 60 requests per minute
    message: 'Too many webhook requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for inbound webhook receiver (more permissive)
const inboundWebhookRateLimiter = rateLimit({
    windowMs: 60000, // 1 minute
    max: 120, // 120 requests per minute
    message: 'Too many webhook requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Rate limit per webhook ID + IP
        return `${req.params.id || 'unknown'}-${req.ip}`;
    }
});

// ============================================================================
// OUTBOUND WEBHOOKS
// ============================================================================

/**
 * GET /api/webhooks
 * Get all outbound webhooks
 */
router.get('/', 
    requireAuth,
    webhookRateLimiter,
    requirePermission(PERMISSIONS.WEBHOOK_VIEW),
    async (req, res) => {
        try {
            const enabledOnly = req.query.enabled === 'true';
            const webhooks = webhookService.getAllWebhooks(enabledOnly);
            
            // Hide secrets from response
            const safeWebhooks = webhooks.map(w => ({
                ...w,
                secret: w.secret ? '***REDACTED***' : null
            }));
            
            res.json({ webhooks: safeWebhooks });
        } catch (error) {
            console.error('[Webhooks] Error getting webhooks:', error);
            res.status(500).json({ error: 'Failed to retrieve webhooks' });
        }
    }
);

/**
 * GET /api/webhooks/:id
 * Get specific webhook
 */
router.get('/:id',
    requireAuth,
    webhookRateLimiter,
    requirePermission(PERMISSIONS.WEBHOOK_VIEW),
    async (req, res) => {
        try {
            const webhook = webhookService.getWebhook(req.params.id);
            
            if (!webhook) {
                return res.status(404).json({ error: 'Webhook not found' });
            }
            
            // Hide secret from response
            const safeWebhook = {
                ...webhook,
                secret: webhook.secret ? '***REDACTED***' : null
            };
            
            res.json({ webhook: safeWebhook });
        } catch (error) {
            console.error('[Webhooks] Error getting webhook:', error);
            res.status(500).json({ error: 'Failed to retrieve webhook' });
        }
    }
);

/**
 * POST /api/webhooks
 * Create new webhook
 */
router.post('/',
    requireAuth,
    webhookRateLimiter,
    requirePermission(PERMISSIONS.WEBHOOK_CREATE),
    [
        body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required (1-100 characters)'),
        body('url').isURL().withMessage('Valid URL is required'),
        body('event_types').isArray({ min: 1 }).withMessage('At least one event type is required'),
        body('method').optional().isIn(['GET', 'POST', 'PUT', 'PATCH']).withMessage('Invalid HTTP method'),
        body('timeout_ms').optional().isInt({ min: 1000, max: 120000 }).withMessage('Timeout must be between 1000 and 120000 ms'),
        body('retry_count').optional().isInt({ min: 0, max: 10 }).withMessage('Retry count must be between 0 and 10')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const webhook = await webhookService.createWebhook(req.body, req.session.username);
            
            res.status(201).json({
                success: true,
                webhook: {
                    ...webhook,
                    secret: webhook.secret ? '***REDACTED***' : null
                }
            });
        } catch (error) {
            console.error('[Webhooks] Error creating webhook:', error);
            res.status(400).json({ error: error.message });
        }
    }
);

/**
 * PUT /api/webhooks/:id
 * Update webhook
 */
router.put('/:id',
    requireAuth,
    webhookRateLimiter,
    requirePermission(PERMISSIONS.WEBHOOK_EDIT),
    [
        param('id').trim().notEmpty().withMessage('Webhook ID is required'),
        body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
        body('url').optional().isURL().withMessage('Valid URL is required'),
        body('event_types').optional().isArray({ min: 1 }).withMessage('At least one event type is required'),
        body('method').optional().isIn(['GET', 'POST', 'PUT', 'PATCH']).withMessage('Invalid HTTP method'),
        body('enabled').optional().isBoolean().withMessage('Enabled must be a boolean'),
        body('timeout_ms').optional().isInt({ min: 1000, max: 120000 }).withMessage('Timeout must be between 1000 and 120000 ms'),
        body('retry_count').optional().isInt({ min: 0, max: 10 }).withMessage('Retry count must be between 0 and 10')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const webhook = await webhookService.updateWebhook(
                req.params.id,
                req.body,
                req.session.username
            );
            
            res.json({
                success: true,
                webhook: {
                    ...webhook,
                    secret: webhook.secret ? '***REDACTED***' : null
                }
            });
        } catch (error) {
            console.error('[Webhooks] Error updating webhook:', error);
            res.status(400).json({ error: error.message });
        }
    }
);

/**
 * DELETE /api/webhooks/:id
 * Delete webhook
 */
router.delete('/:id',
    requireAuth,
    webhookRateLimiter,
    requirePermission(PERMISSIONS.WEBHOOK_DELETE),
    async (req, res) => {
        try {
            await webhookService.deleteWebhook(req.params.id, req.session.username);
            
            res.json({
                success: true,
                message: 'Webhook deleted successfully'
            });
        } catch (error) {
            console.error('[Webhooks] Error deleting webhook:', error);
            res.status(400).json({ error: error.message });
        }
    }
);

/**
 * POST /api/webhooks/:id/test
 * Test webhook with sample event
 */
router.post('/:id/test',
    requireAuth,
    webhookRateLimiter,
    requirePermission(PERMISSIONS.WEBHOOK_TRIGGER),
    async (req, res) => {
        try {
            const result = await webhookService.testWebhook(req.params.id);
            
            res.json({
                success: true,
                result
            });
        } catch (error) {
            console.error('[Webhooks] Error testing webhook:', error);
            res.status(400).json({ error: error.message });
        }
    }
);

/**
 * POST /api/webhooks/:id/trigger
 * Manually trigger webhook with custom event data
 */
router.post('/:id/trigger',
    requireAuth,
    webhookRateLimiter,
    requirePermission(PERMISSIONS.WEBHOOK_TRIGGER),
    [
        body('event_type').trim().notEmpty().withMessage('Event type is required'),
        body('data').optional().isObject().withMessage('Data must be an object')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const result = await webhookService.triggerWebhook(
                req.params.id,
                req.body,
                true
            );
            
            res.json({
                success: true,
                result
            });
        } catch (error) {
            console.error('[Webhooks] Error triggering webhook:', error);
            res.status(400).json({ error: error.message });
        }
    }
);

/**
 * GET /api/webhooks/:id/logs
 * Get webhook delivery logs
 */
router.get('/:id/logs',
    requireAuth,
    webhookRateLimiter,
    requirePermission(PERMISSIONS.WEBHOOK_LOGS),
    [
        query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('Limit must be between 1 and 500')
    ],
    async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 100;
            const logs = webhookService.getWebhookLogs({
                webhook_id: req.params.id,
                limit
            });
            
            res.json({ logs });
        } catch (error) {
            console.error('[Webhooks] Error getting webhook logs:', error);
            res.status(500).json({ error: 'Failed to retrieve webhook logs' });
        }
    }
);

/**
 * GET /api/webhooks/logs/all
 * Get all webhook delivery logs
 */
router.get('/logs/all',
    requireAuth,
    webhookRateLimiter,
    requirePermission(PERMISSIONS.WEBHOOK_LOGS),
    [
        query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('Limit must be between 1 and 500'),
        query('success').optional().isBoolean().withMessage('Success must be a boolean')
    ],
    async (req, res) => {
        try {
            const options = {
                limit: parseInt(req.query.limit) || 100
            };
            
            if (req.query.success !== undefined) {
                options.success = req.query.success === 'true';
            }
            
            const logs = webhookService.getWebhookLogs(options);
            
            res.json({ logs });
        } catch (error) {
            console.error('[Webhooks] Error getting all webhook logs:', error);
            res.status(500).json({ error: 'Failed to retrieve webhook logs' });
        }
    }
);

/**
 * GET /api/webhooks/templates
 * Get integration templates
 */
router.get('/templates/all',
    requireAuth,
    webhookRateLimiter,
    requirePermission(PERMISSIONS.WEBHOOK_VIEW),
    (req, res) => {
        try {
            const templates = webhookService.getAllIntegrationTemplates();
            res.json({ templates });
        } catch (error) {
            console.error('[Webhooks] Error getting templates:', error);
            res.status(500).json({ error: 'Failed to retrieve templates' });
        }
    }
);

// ============================================================================
// INBOUND WEBHOOKS
// ============================================================================

/**
 * GET /api/webhooks/inbound
 * Get all inbound webhooks
 */
router.get('/inbound/all',
    requireAuth,
    webhookRateLimiter,
    requirePermission(PERMISSIONS.INBOUND_WEBHOOK_VIEW),
    async (req, res) => {
        try {
            const enabledOnly = req.query.enabled === 'true';
            const webhooks = inboundWebhookService.getAllInboundWebhooks(enabledOnly);
            
            // Hide secrets from response
            const safeWebhooks = webhooks.map(w => ({
                ...w,
                secret: w.secret ? '***REDACTED***' : null
            }));
            
            res.json({ webhooks: safeWebhooks });
        } catch (error) {
            console.error('[InboundWebhooks] Error getting webhooks:', error);
            res.status(500).json({ error: 'Failed to retrieve inbound webhooks' });
        }
    }
);

/**
 * GET /api/webhooks/inbound/:id
 * Get specific inbound webhook
 */
router.get('/inbound/:id',
    requireAuth,
    webhookRateLimiter,
    requirePermission(PERMISSIONS.INBOUND_WEBHOOK_VIEW),
    async (req, res) => {
        try {
            const webhook = inboundWebhookService.getInboundWebhook(req.params.id);
            
            if (!webhook) {
                return res.status(404).json({ error: 'Inbound webhook not found' });
            }
            
            // Hide secret from response
            const safeWebhook = {
                ...webhook,
                secret: webhook.secret ? '***REDACTED***' : null
            };
            
            res.json({ webhook: safeWebhook });
        } catch (error) {
            console.error('[InboundWebhooks] Error getting webhook:', error);
            res.status(500).json({ error: 'Failed to retrieve inbound webhook' });
        }
    }
);

/**
 * POST /api/webhooks/inbound
 * Create new inbound webhook
 */
router.post('/inbound',
    requireAuth,
    webhookRateLimiter,
    requirePermission(PERMISSIONS.INBOUND_WEBHOOK_CREATE),
    [
        body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required (1-100 characters)'),
        body('actions').isArray({ min: 1 }).withMessage('At least one action is required'),
        body('permissions_required').isArray().withMessage('Permissions array is required')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const webhook = await inboundWebhookService.createInboundWebhook(
                req.body,
                req.session.username
            );
            
            res.status(201).json({
                success: true,
                webhook: {
                    ...webhook,
                    secret: '***REDACTED***'
                }
            });
        } catch (error) {
            console.error('[InboundWebhooks] Error creating webhook:', error);
            res.status(400).json({ error: error.message });
        }
    }
);

/**
 * PUT /api/webhooks/inbound/:id
 * Update inbound webhook
 */
router.put('/inbound/:id',
    requireAuth,
    webhookRateLimiter,
    requirePermission(PERMISSIONS.INBOUND_WEBHOOK_EDIT),
    [
        param('id').trim().notEmpty().withMessage('Webhook ID is required'),
        body('name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
        body('actions').optional().isArray({ min: 1 }).withMessage('At least one action is required'),
        body('enabled').optional().isBoolean().withMessage('Enabled must be a boolean')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const webhook = await inboundWebhookService.updateInboundWebhook(
                req.params.id,
                req.body,
                req.session.username
            );
            
            res.json({
                success: true,
                webhook: {
                    ...webhook,
                    secret: webhook.secret ? '***REDACTED***' : null
                }
            });
        } catch (error) {
            console.error('[InboundWebhooks] Error updating webhook:', error);
            res.status(400).json({ error: error.message });
        }
    }
);

/**
 * DELETE /api/webhooks/inbound/:id
 * Delete inbound webhook
 */
router.delete('/inbound/:id',
    requireAuth,
    webhookRateLimiter,
    requirePermission(PERMISSIONS.INBOUND_WEBHOOK_DELETE),
    async (req, res) => {
        try {
            await inboundWebhookService.deleteInboundWebhook(
                req.params.id,
                req.session.username
            );
            
            res.json({
                success: true,
                message: 'Inbound webhook deleted successfully'
            });
        } catch (error) {
            console.error('[InboundWebhooks] Error deleting webhook:', error);
            res.status(400).json({ error: error.message });
        }
    }
);

/**
 * POST /api/webhooks/inbound/:id/regenerate-secret
 * Regenerate webhook secret
 */
router.post('/inbound/:id/regenerate-secret',
    requireAuth,
    webhookRateLimiter,
    requirePermission(PERMISSIONS.INBOUND_WEBHOOK_EDIT),
    async (req, res) => {
        try {
            const webhook = await inboundWebhookService.regenerateSecret(
                req.params.id,
                req.session.username
            );
            
            res.json({
                success: true,
                webhook: {
                    ...webhook,
                    secret: '***REDACTED***'
                },
                message: 'Secret regenerated successfully'
            });
        } catch (error) {
            console.error('[InboundWebhooks] Error regenerating secret:', error);
            res.status(400).json({ error: error.message });
        }
    }
);

/**
 * POST /api/webhooks/receive/:id
 * Public endpoint for receiving webhooks (no auth required)
 */
router.post('/receive/:id',
    inboundWebhookRateLimiter,
    async (req, res) => {
        try {
            const webhookId = req.params.id;
            const payload = req.body;
            const signature = req.headers['x-webhook-signature'] || 
                             req.headers['x-webhook-signature-256'] ||
                             req.headers['x-hub-signature-256'] ||
                             req.headers['x-hub-signature'];
            
            // Get client IP (handle proxy headers)
            const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                            req.headers['x-real-ip'] ||
                            req.ip ||
                            req.connection.remoteAddress;

            const result = await inboundWebhookService.processWebhook(
                webhookId,
                payload,
                signature,
                clientIp
            );
            
            res.json(result);
        } catch (error) {
            console.error('[InboundWebhooks] Error processing webhook:', error);
            res.status(400).json({ error: error.message });
        }
    }
);

module.exports = router;
