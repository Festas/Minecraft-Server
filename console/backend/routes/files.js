const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/auth');
const rateLimit = require('express-rate-limit');
const fs = require('fs').promises;
const path = require('path');

// Rate limiter for file operations
const fileRateLimiter = rateLimit({
    windowMs: 60000, // 1 minute
    max: 30, // 30 requests per minute
    message: 'Too many file operations, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// All file routes require authentication and rate limiting
router.use(requireAuth);
router.use(fileRateLimiter);

// Get base paths from environment or use defaults
const SERVER_PROPS_PATH = process.env.SERVER_PROPS_PATH || path.join(process.cwd(), '../../server.properties');
const LOGS_DIR = process.env.LOGS_DIR || '/data/logs';

/**
 * GET /files/server-properties
 * Get server.properties content
 */
router.get('/server-properties', async (req, res) => {
    try {
        const content = await fs.readFile(SERVER_PROPS_PATH, 'utf8');
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
        // Create backup
        const backupPath = `${SERVER_PROPS_PATH}.backup.${Date.now()}`;
        await fs.copyFile(SERVER_PROPS_PATH, backupPath);
        
        // Write new content
        await fs.writeFile(SERVER_PROPS_PATH, content);
        
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
        const files = await fs.readdir(LOGS_DIR);
        
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
        const logPath = path.join(LOGS_DIR, filename);
        const content = await fs.readFile(logPath, 'utf8');
        res.json({ content });
    } catch (error) {
        console.error('Error reading log file:', error);
        res.status(500).json({ error: 'Failed to read log file' });
    }
});

module.exports = router;
