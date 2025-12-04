const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/auth');
const fs = require('fs').promises;
const path = require('path');

// All file routes require authentication
router.use(requireAuth);

/**
 * GET /files/server-properties
 * Get server.properties content
 */
router.get('/server-properties', async (req, res) => {
    try {
        const serverPropsPath = '/home/runner/work/Minecraft-Server/Minecraft-Server/server.properties';
        const content = await fs.readFile(serverPropsPath, 'utf8');
        res.json({ content });
    } catch (error) {
        console.error('Error reading server.properties:', error);
        res.status(500).json({ error: 'Failed to read server.properties' });
    }
});

/**
 * POST /files/server-properties
 * Update server.properties (with backup)
 */
router.post('/server-properties', async (req, res) => {
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ error: 'Content is required' });
    }

    try {
        const serverPropsPath = '/home/runner/work/Minecraft-Server/Minecraft-Server/server.properties';
        
        // Create backup
        const backupPath = `${serverPropsPath}.backup.${Date.now()}`;
        await fs.copyFile(serverPropsPath, backupPath);
        
        // Write new content
        await fs.writeFile(serverPropsPath, content);
        
        res.json({ success: true, message: 'server.properties updated successfully' });
    } catch (error) {
        console.error('Error updating server.properties:', error);
        res.status(500).json({ error: 'Failed to update server.properties' });
    }
});

/**
 * GET /files/logs
 * Get list of available log files
 */
router.get('/logs', async (req, res) => {
    try {
        const logsDir = '/data/logs';
        const files = await fs.readdir(logsDir);
        
        const logFiles = files.filter(f => f.endsWith('.log') || f.endsWith('.log.gz'));
        
        res.json({ files: logFiles });
    } catch (error) {
        console.error('Error listing logs:', error);
        res.json({ files: [] });
    }
});

/**
 * GET /files/logs/:filename
 * Get specific log file content
 */
router.get('/logs/:filename', async (req, res) => {
    const { filename } = req.params;
    
    // Sanitize filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
        return res.status(400).json({ error: 'Invalid filename' });
    }

    try {
        const logPath = path.join('/data/logs', filename);
        const content = await fs.readFile(logPath, 'utf8');
        res.json({ content });
    } catch (error) {
        console.error('Error reading log file:', error);
        res.status(500).json({ error: 'Failed to read log file' });
    }
});

module.exports = router;
