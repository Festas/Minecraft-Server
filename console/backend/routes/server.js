const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/auth');
const dockerService = require('../services/docker');
const rconService = require('../services/rcon');
const statsService = require('../services/stats');
const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const execPromise = util.promisify(exec);

// All server routes require authentication
router.use(requireAuth);

/**
 * GET /server/status
 * Get server status
 */
router.get('/status', async (req, res) => {
    try {
        const stats = await statsService.getServerStats();
        res.json(stats);
    } catch (error) {
        console.error('Error getting server status:', error);
        res.status(500).json({ error: 'Failed to get server status' });
    }
});

/**
 * POST /server/start
 * Start the Minecraft server
 */
router.post('/start', async (req, res) => {
    try {
        const result = await dockerService.startServer();
        
        // Clear stats cache
        statsService.clearCache();
        
        res.json(result);
    } catch (error) {
        console.error('Error starting server:', error);
        res.status(500).json({ error: 'Failed to start server' });
    }
});

/**
 * POST /server/stop
 * Stop the Minecraft server gracefully
 */
router.post('/stop', async (req, res) => {
    if (!req.body.confirmed) {
        return res.status(400).json({ 
            requiresConfirmation: true,
            message: 'Please confirm you want to stop the server.'
        });
    }

    try {
        // Save all first
        await rconService.saveAll();
        
        // Send stop command via RCON
        await rconService.stopServer();
        
        // Clear stats cache
        statsService.clearCache();
        
        res.json({ success: true, message: 'Server stopping...' });
    } catch (error) {
        console.error('Error stopping server:', error);
        res.status(500).json({ error: 'Failed to stop server' });
    }
});

/**
 * POST /server/restart
 * Restart the Minecraft server
 */
router.post('/restart', async (req, res) => {
    if (!req.body.confirmed) {
        return res.status(400).json({ 
            requiresConfirmation: true,
            message: 'Please confirm you want to restart the server.'
        });
    }

    try {
        // Save all first
        await rconService.saveAll();
        
        // Restart via Docker
        const result = await dockerService.restartServer();
        
        // Clear stats cache
        statsService.clearCache();
        
        res.json(result);
    } catch (error) {
        console.error('Error restarting server:', error);
        res.status(500).json({ error: 'Failed to restart server' });
    }
});

/**
 * POST /server/kill
 * Force kill the Minecraft server (emergency only)
 */
router.post('/kill', async (req, res) => {
    if (!req.body.confirmed) {
        return res.status(400).json({ 
            requiresConfirmation: true,
            message: 'WARNING: This will force kill the server without saving. Confirm?'
        });
    }

    try {
        const result = await dockerService.killServer();
        
        // Clear stats cache
        statsService.clearCache();
        
        res.json(result);
    } catch (error) {
        console.error('Error killing server:', error);
        res.status(500).json({ error: 'Failed to kill server' });
    }
});

/**
 * POST /server/save
 * Save all worlds
 */
router.post('/save', async (req, res) => {
    try {
        const result = await rconService.saveAll();
        res.json(result);
    } catch (error) {
        console.error('Error saving worlds:', error);
        res.status(500).json({ error: 'Failed to save worlds' });
    }
});

/**
 * POST /server/save-off
 * Disable auto-save
 */
router.post('/save-off', async (req, res) => {
    try {
        const result = await rconService.saveOff();
        res.json(result);
    } catch (error) {
        console.error('Error disabling auto-save:', error);
        res.status(500).json({ error: 'Failed to disable auto-save' });
    }
});

/**
 * POST /server/save-on
 * Enable auto-save
 */
router.post('/save-on', async (req, res) => {
    try {
        const result = await rconService.saveOn();
        res.json(result);
    } catch (error) {
        console.error('Error enabling auto-save:', error);
        res.status(500).json({ error: 'Failed to enable auto-save' });
    }
});

/**
 * POST /server/backup
 * Trigger manual backup
 */
router.post('/backup', async (req, res) => {
    try {
        // Disable auto-save
        await rconService.saveOff();
        await rconService.saveAll();
        
        // Run backup script - use environment variable for path
        const backupScript = process.env.BACKUP_SCRIPT_PATH || path.join(process.cwd(), '../../backup.sh');
        await execPromise(backupScript);
        
        // Re-enable auto-save
        await rconService.saveOn();
        
        res.json({ success: true, message: 'Backup completed successfully' });
    } catch (error) {
        console.error('Error creating backup:', error);
        
        // Try to re-enable auto-save
        try {
            await rconService.saveOn();
        } catch (e) {
            console.error('Failed to re-enable auto-save:', e);
        }
        
        res.status(500).json({ error: 'Failed to create backup' });
    }
});

module.exports = router;
