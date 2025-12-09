/**
 * Event Logging and Notification Routes
 * 
 * Provides API endpoints for querying event logs, managing notifications,
 * and configuring notification preferences.
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const { eventLogger, EVENT_CATEGORIES, EVENT_SEVERITY, EVENT_TYPES } = require('../services/eventLogger');
const notificationService = require('../services/notificationService');
const { body, query, param, validationResult } = require('express-validator');

// ============================================================================
// EVENT LOGGING ENDPOINTS
// ============================================================================

/**
 * GET /api/logs/query
 * Query event logs with filtering and pagination
 */
router.get('/logs/query',
    requireAuth,
    requirePermission('LOG_VIEW'),
    [
        query('category').optional().isIn(Object.values(EVENT_CATEGORIES)),
        query('severity').optional().isIn(Object.values(EVENT_SEVERITY)),
        query('eventType').optional().isString(),
        query('actor').optional().isString(),
        query('target').optional().isString(),
        query('startDate').optional().isISO8601(),
        query('endDate').optional().isISO8601(),
        query('search').optional().isString(),
        query('limit').optional().isInt({ min: 1, max: 1000 }),
        query('offset').optional().isInt({ min: 0 }),
        query('sortBy').optional().isIn(['timestamp', 'severity', 'category', 'event_type']),
        query('sortOrder').optional().isIn(['asc', 'desc'])
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const result = eventLogger.queryEvents(req.query);
            res.json(result);
        } catch (error) {
            console.error('[Logs] Error querying events:', error);
            res.status(500).json({ error: 'Failed to query event logs' });
        }
    }
);

/**
 * GET /api/logs/recent
 * Get recent events
 */
router.get('/logs/recent',
    requireAuth,
    requirePermission('LOG_VIEW'),
    [
        query('limit').optional().isInt({ min: 1, max: 100 })
    ],
    (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const events = eventLogger.getRecentEvents(limit);
            res.json({ events });
        } catch (error) {
            console.error('[Logs] Error getting recent events:', error);
            res.status(500).json({ error: 'Failed to get recent events' });
        }
    }
);

/**
 * GET /api/logs/stats
 * Get event statistics
 */
router.get('/logs/stats',
    requireAuth,
    requirePermission('LOG_VIEW'),
    [
        query('startDate').optional().isISO8601(),
        query('endDate').optional().isISO8601()
    ],
    (req, res) => {
        try {
            const stats = eventLogger.getEventStats(req.query.startDate, req.query.endDate);
            res.json(stats);
        } catch (error) {
            console.error('[Logs] Error getting stats:', error);
            res.status(500).json({ error: 'Failed to get event statistics' });
        }
    }
);

/**
 * GET /api/logs/export
 * Export event logs
 */
router.get('/logs/export',
    requireAuth,
    requirePermission('LOG_EXPORT'),
    [
        query('format').optional().isIn(['json', 'csv']),
        query('category').optional().isIn(Object.values(EVENT_CATEGORIES)),
        query('severity').optional().isIn(Object.values(EVENT_SEVERITY)),
        query('startDate').optional().isISO8601(),
        query('endDate').optional().isISO8601()
    ],
    (req, res) => {
        try {
            const format = req.query.format || 'json';
            // NOTE: Export limit of 10,000 records is a balance between usability and resource usage
            // For very large datasets, users should use date filters to chunk exports
            // Future enhancement: implement streaming exports for unlimited dataset sizes
            const result = eventLogger.queryEvents({
                category: req.query.category,
                severity: req.query.severity,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                limit: 10000 // Higher limit for exports, but bounded to prevent memory issues
            });

            if (format === 'csv') {
                // Convert to CSV
                const headers = ['ID', 'Timestamp', 'Category', 'Severity', 'Event Type', 'Title', 'Message', 'Actor', 'Target'];
                const rows = result.events.map(e => [
                    e.id,
                    e.timestamp,
                    e.category,
                    e.severity,
                    e.event_type,
                    e.title,
                    e.message || '',
                    e.actor || '',
                    e.target || ''
                ]);

                const csv = [
                    headers.join(','),
                    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
                ].join('\n');

                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="event-logs-${new Date().toISOString()}.csv"`);
                res.send(csv);
            } else {
                // JSON format
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename="event-logs-${new Date().toISOString()}.json"`);
                res.json(result.events);
            }
        } catch (error) {
            console.error('[Logs] Error exporting logs:', error);
            res.status(500).json({ error: 'Failed to export logs' });
        }
    }
);

/**
 * GET /api/logs/types
 * Get available event types and categories
 */
router.get('/logs/types',
    requireAuth,
    requirePermission('LOG_VIEW'),
    (req, res) => {
        res.json({
            categories: Object.values(EVENT_CATEGORIES),
            severities: Object.values(EVENT_SEVERITY),
            eventTypes: Object.values(EVENT_TYPES)
        });
    }
);

// ============================================================================
// NOTIFICATION ENDPOINTS
// ============================================================================

/**
 * GET /api/notifications
 * Get notifications for current user
 */
router.get('/notifications',
    requireAuth,
    [
        query('status').optional().isIn(['unread', 'read', 'archived']),
        query('category').optional().isIn(Object.values(EVENT_CATEGORIES)),
        query('severity').optional().isIn(Object.values(EVENT_SEVERITY)),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('offset').optional().isInt({ min: 0 })
    ],
    (req, res) => {
        try {
            const userId = req.session.username;
            const result = notificationService.getUserNotifications(userId, req.query);
            res.json(result);
        } catch (error) {
            console.error('[Notifications] Error getting notifications:', error);
            res.status(500).json({ error: 'Failed to get notifications' });
        }
    }
);

/**
 * GET /api/notifications/unread-count
 * Get unread notification count for current user
 */
router.get('/notifications/unread-count',
    requireAuth,
    (req, res) => {
        try {
            const userId = req.session.username;
            const count = notificationService.getUnreadCount(userId);
            res.json({ count });
        } catch (error) {
            console.error('[Notifications] Error getting unread count:', error);
            res.status(500).json({ error: 'Failed to get unread count' });
        }
    }
);

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put('/notifications/:id/read',
    requireAuth,
    [
        param('id').isInt()
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const userId = req.session.username;
            const success = notificationService.markAsRead(parseInt(req.params.id), userId);
            
            if (success) {
                res.json({ success: true });
            } else {
                res.status(404).json({ error: 'Notification not found' });
            }
        } catch (error) {
            console.error('[Notifications] Error marking as read:', error);
            res.status(500).json({ error: 'Failed to mark notification as read' });
        }
    }
);

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put('/notifications/read-all',
    requireAuth,
    (req, res) => {
        try {
            const userId = req.session.username;
            const count = notificationService.markAllAsRead(userId);
            res.json({ success: true, count });
        } catch (error) {
            console.error('[Notifications] Error marking all as read:', error);
            res.status(500).json({ error: 'Failed to mark all as read' });
        }
    }
);

/**
 * DELETE /api/notifications/:id
 * Delete notification
 */
router.delete('/notifications/:id',
    requireAuth,
    [
        param('id').isInt()
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const userId = req.session.username;
            const success = notificationService.deleteNotification(parseInt(req.params.id), userId);
            
            if (success) {
                res.json({ success: true });
            } else {
                res.status(404).json({ error: 'Notification not found' });
            }
        } catch (error) {
            console.error('[Notifications] Error deleting notification:', error);
            res.status(500).json({ error: 'Failed to delete notification' });
        }
    }
);

/**
 * GET /api/notifications/preferences
 * Get notification preferences for current user
 */
router.get('/notifications/preferences',
    requireAuth,
    (req, res) => {
        try {
            const userId = req.session.username;
            const preferences = notificationService.getUserPreferences(userId);
            res.json(preferences);
        } catch (error) {
            console.error('[Notifications] Error getting preferences:', error);
            res.status(500).json({ error: 'Failed to get preferences' });
        }
    }
);

/**
 * PUT /api/notifications/preferences
 * Update notification preferences for current user
 */
router.put('/notifications/preferences',
    requireAuth,
    [
        body('enabled').optional().isBoolean(),
        body('channels').optional().isArray(),
        body('categories').optional().isArray(),
        body('severity_filter').optional().isIn(Object.values(EVENT_SEVERITY)),
        body('quiet_hours_start').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        body('quiet_hours_end').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const userId = req.session.username;
            const preferences = notificationService.updateUserPreferences(userId, req.body);
            res.json(preferences);
        } catch (error) {
            console.error('[Notifications] Error updating preferences:', error);
            res.status(500).json({ error: 'Failed to update preferences' });
        }
    }
);

module.exports = router;
