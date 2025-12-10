const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/auth');
const { requirePermission } = require('../middleware/rbac');
const { PERMISSIONS } = require('../config/rbac');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');
const backupService = require('../services/backupService');
const { BACKUP_TYPES, JOB_STATUS } = require('../services/backupService');

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

/**
 * GET /backups/jobs
 * Get list of backup jobs with their status
 */
router.get('/jobs', requirePermission(PERMISSIONS.BACKUP_VIEW), async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        
        const jobs = backupService.getAllBackupJobs(limit, offset);
        
        res.json({ jobs, total: jobs.length });
    } catch (error) {
        console.error('Error listing backup jobs:', error);
        res.status(500).json({ error: 'Failed to list backup jobs' });
    }
});

/**
 * GET /backups/jobs/:id
 * Get details of a specific backup job
 */
router.get('/jobs/:id', requirePermission(PERMISSIONS.BACKUP_VIEW), async (req, res) => {
    try {
        const job = backupService.getBackupJob(req.params.id);
        
        if (!job) {
            return res.status(404).json({ error: 'Backup job not found' });
        }
        
        res.json({ job });
    } catch (error) {
        console.error('Error getting backup job:', error);
        res.status(500).json({ error: 'Failed to get backup job' });
    }
});

/**
 * POST /backups/create
 * Create a new backup
 */
router.post('/create', 
    requirePermission(PERMISSIONS.BACKUP_CREATE),
    [
        body('name').notEmpty().withMessage('Name is required'),
        body('type').optional().isIn(Object.values(BACKUP_TYPES)).withMessage('Invalid backup type'),
        body('retentionPolicy').optional().isIn(['daily', 'weekly', 'monthly', 'permanent'])
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { name, type, retentionPolicy } = req.body;
            const username = req.session.username;

            const result = await backupService.createBackup({
                name,
                type: type || BACKUP_TYPES.FULL,
                username,
                retentionPolicy: retentionPolicy || 'daily'
            });

            res.json(result);
        } catch (error) {
            console.error('Error creating backup:', error);
            res.status(500).json({ error: 'Failed to create backup: ' + error.message });
        }
    }
);

/**
 * GET /backups/preview/:id
 * Preview contents of a backup
 */
router.get('/preview/:id', requirePermission(PERMISSIONS.BACKUP_VIEW), async (req, res) => {
    try {
        const preview = await backupService.previewBackup(req.params.id);
        res.json(preview);
    } catch (error) {
        console.error('Error previewing backup:', error);
        res.status(500).json({ error: 'Failed to preview backup: ' + error.message });
    }
});

/**
 * POST /backups/restore
 * Restore from a backup
 */
router.post('/restore',
    requirePermission(PERMISSIONS.BACKUP_RESTORE),
    [
        body('backupId').notEmpty().withMessage('Backup ID is required'),
        body('createPreBackup').optional().isBoolean()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { backupId, createPreBackup } = req.body;
            const username = req.session.username;

            const result = await backupService.restoreBackup({
                backupId,
                username,
                createPreBackup: createPreBackup !== false
            });

            res.json(result);
        } catch (error) {
            console.error('Error restoring backup:', error);
            res.status(500).json({ error: 'Failed to restore backup: ' + error.message });
        }
    }
);

/**
 * DELETE /backups/:id
 * Delete a backup
 */
router.delete('/:id', requirePermission(PERMISSIONS.BACKUP_DELETE), async (req, res) => {
    try {
        const username = req.session.username;
        const result = await backupService.deleteBackup(req.params.id, username);
        
        res.json(result);
    } catch (error) {
        console.error('Error deleting backup:', error);
        res.status(500).json({ error: 'Failed to delete backup: ' + error.message });
    }
});

/**
 * GET /backups/download/:id
 * Download a backup file
 */
router.get('/download/:id', requirePermission(PERMISSIONS.BACKUP_DOWNLOAD), async (req, res) => {
    try {
        const job = backupService.getBackupJob(req.params.id);
        
        if (!job) {
            return res.status(404).json({ error: 'Backup not found' });
        }

        if (!job.file_path) {
            return res.status(404).json({ error: 'Backup file not found' });
        }

        const fileName = require('path').basename(job.file_path);
        res.download(job.file_path, fileName);
    } catch (error) {
        console.error('Error downloading backup:', error);
        res.status(500).json({ error: 'Failed to download backup: ' + error.message });
    }
});

/**
 * GET /backups/restore/jobs
 * Get list of restore jobs
 */
router.get('/restore/jobs', requirePermission(PERMISSIONS.BACKUP_VIEW), async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        
        const jobs = backupService.getAllRestoreJobs(limit, offset);
        
        res.json({ jobs, total: jobs.length });
    } catch (error) {
        console.error('Error listing restore jobs:', error);
        res.status(500).json({ error: 'Failed to list restore jobs' });
    }
});

/**
 * GET /backups/restore/jobs/:id
 * Get details of a specific restore job
 */
router.get('/restore/jobs/:id', requirePermission(PERMISSIONS.BACKUP_VIEW), async (req, res) => {
    try {
        const job = backupService.getRestoreJob(req.params.id);
        
        if (!job) {
            return res.status(404).json({ error: 'Restore job not found' });
        }
        
        res.json({ job });
    } catch (error) {
        console.error('Error getting restore job:', error);
        res.status(500).json({ error: 'Failed to get restore job' });
    }
});

/**
 * POST /backups/migrate/export
 * Export server data for migration
 */
router.post('/migrate/export',
    requirePermission(PERMISSIONS.BACKUP_MIGRATE_EXPORT),
    [
        body('name').optional().isString()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { name } = req.body;
            const username = req.session.username;

            const result = await backupService.exportForMigration({ name, username });

            res.json(result);
        } catch (error) {
            console.error('Error exporting for migration:', error);
            res.status(500).json({ error: 'Failed to export for migration: ' + error.message });
        }
    }
);

/**
 * POST /backups/migrate/import
 * Import server data from migration
 */
router.post('/migrate/import',
    requirePermission(PERMISSIONS.BACKUP_MIGRATE_IMPORT),
    [
        body('backupId').notEmpty().withMessage('Backup ID is required')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { backupId } = req.body;
            const username = req.session.username;

            const result = await backupService.importFromMigration({ backupId, username });

            res.json(result);
        } catch (error) {
            console.error('Error importing from migration:', error);
            res.status(500).json({ error: 'Failed to import from migration: ' + error.message });
        }
    }
);

/**
 * GET /backups/migrate/jobs
 * Get list of migration jobs
 */
router.get('/migrate/jobs', requirePermission(PERMISSIONS.BACKUP_VIEW), async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        
        const jobs = backupService.getAllMigrationJobs(limit, offset);
        
        res.json({ jobs, total: jobs.length });
    } catch (error) {
        console.error('Error listing migration jobs:', error);
        res.status(500).json({ error: 'Failed to list migration jobs' });
    }
});

module.exports = router;
