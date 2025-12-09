/**
 * Audit Log Routes
 * 
 * API endpoints for viewing and exporting audit logs.
 * These endpoints are restricted to Owner role only.
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/auth');
const { requireOwner } = require('../middleware/rbac');
const { getAuditLogs } = require('../services/auditLog');

/**
 * GET /api/audit/logs
 * Get audit logs with optional filtering
 * Requires: Owner role
 * 
 * Query parameters:
 * - limit: Maximum number of entries (default: 100)
 * - username: Filter by username
 * - eventType: Filter by event type
 * - startDate: Filter by start date (ISO 8601)
 * - endDate: Filter by end date (ISO 8601)
 */
router.get('/logs', requireAuth, requireOwner, async (req, res) => {
    try {
        const { limit, username, eventType, startDate, endDate } = req.query;
        
        const options = {};
        
        if (limit) {
            options.limit = parseInt(limit, 10);
            if (isNaN(options.limit) || options.limit < 1) {
                return res.status(400).json({ 
                    error: 'Invalid limit',
                    message: 'Limit must be a positive integer' 
                });
            }
        } else {
            options.limit = 100; // Default limit
        }
        
        if (username) {
            options.username = username;
        }
        
        if (eventType) {
            options.eventType = eventType;
        }
        
        if (startDate) {
            options.startDate = new Date(startDate);
            if (isNaN(options.startDate.getTime())) {
                return res.status(400).json({ 
                    error: 'Invalid startDate',
                    message: 'Start date must be a valid ISO 8601 date' 
                });
            }
        }
        
        if (endDate) {
            options.endDate = new Date(endDate);
            if (isNaN(options.endDate.getTime())) {
                return res.status(400).json({ 
                    error: 'Invalid endDate',
                    message: 'End date must be a valid ISO 8601 date' 
                });
            }
        }
        
        const logs = await getAuditLogs(options);
        
        res.json({ 
            logs,
            count: logs.length,
            filters: options
        });
    } catch (error) {
        console.error('[Audit API] Error fetching audit logs:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

/**
 * GET /api/audit/export
 * Export audit logs as JSON file
 * Requires: Owner role
 * 
 * Query parameters: Same as /api/audit/logs
 */
router.get('/export', requireAuth, requireOwner, async (req, res) => {
    try {
        const { limit, username, eventType, startDate, endDate } = req.query;
        
        const options = {};
        
        if (limit) {
            options.limit = parseInt(limit, 10);
        }
        
        if (username) {
            options.username = username;
        }
        
        if (eventType) {
            options.eventType = eventType;
        }
        
        if (startDate) {
            options.startDate = new Date(startDate);
        }
        
        if (endDate) {
            options.endDate = new Date(endDate);
        }
        
        const logs = await getAuditLogs(options);
        
        // Set headers for file download
        const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        res.json({ 
            exportDate: new Date().toISOString(),
            filters: options,
            count: logs.length,
            logs
        });
    } catch (error) {
        console.error('[Audit API] Error exporting audit logs:', error);
        res.status(500).json({ error: 'Failed to export audit logs' });
    }
});

module.exports = router;
