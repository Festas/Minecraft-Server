const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/auth');
const fs = require('fs').promises;
const path = require('path');

// All backup routes require authentication
router.use(requireAuth);

/**
 * GET /backups/list
 * Get list of available backups
 */
router.get('/list', async (req, res) => {
    try {
        const backupsDir = '/home/runner/work/Minecraft-Server/Minecraft-Server/backups';
        
        try {
            const files = await fs.readdir(backupsDir);
            const backups = [];
            
            for (const file of files) {
                if (file.endsWith('.tar.gz') || file.endsWith('.zip')) {
                    const stats = await fs.stat(path.join(backupsDir, file));
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
