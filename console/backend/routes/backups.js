const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/auth');
const { requirePermission } = require('../middleware/rbac');
const { PERMISSIONS } = require('../config/rbac');
const rateLimit = require('express-rate-limit');
const fs = require('fs').promises;
const path = require('path');

// Rate limiter for backup operations
const backupRateLimiter = rateLimit({
    windowMs: 60000, // 1 minute
    max: 10, // 10 requests per minute
    message: 'Too many backup requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// All backup routes require authentication and rate limiting
router.use(requireAuth);
router.use(backupRateLimiter);

// Get backups directory from environment or use default
const BACKUPS_DIR = process.env.BACKUPS_DIR || path.join(process.cwd(), '../../backups');

/**
 * GET /backups/list
 * Get list of available backups
 */
router.get('/list', requirePermission(PERMISSIONS.BACKUP_VIEW), async (req, res) => {
    try {
        try {
            const files = await fs.readdir(BACKUPS_DIR);
            const backups = [];
            
            for (const file of files) {
                if (file.endsWith('.tar.gz') || file.endsWith('.zip')) {
                    const stats = await fs.stat(path.join(BACKUPS_DIR, file));
                    backups.push({
                        filename: file,
                        size: stats.size,
                        created: stats.mtime
                    });
                }
            }
            
            // Sort by date, newest first
            backups.sort((a, b) => b.created - a.created);
            
            res.json({ backups });
        } catch (error) {
            // Backups directory doesn't exist
            res.json({ backups: [] });
        }
    } catch (error) {
        console.error('Error listing backups:', error);
        res.status(500).json({ error: 'Failed to list backups' });
    }
});

module.exports = router;
