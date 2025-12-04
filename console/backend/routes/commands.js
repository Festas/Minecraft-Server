const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/auth');
const rconService = require('../services/rcon');

// All command routes require authentication
router.use(requireAuth);

/**
 * POST /commands/execute
 * Execute a Minecraft command via RCON
 */
router.post('/execute', async (req, res) => {
    const { command } = req.body;

    if (!command) {
        return res.status(400).json({ error: 'Command is required' });
    }

    // Input sanitization - basic validation
    const sanitizedCommand = command.trim();
    
    // Dangerous commands that require confirmation
    const dangerousCommands = ['stop', 'kill', 'ban', 'pardon', 'whitelist'];
    const isDangerous = dangerousCommands.some(cmd => 
        sanitizedCommand.toLowerCase().startsWith(cmd)
    );

    if (isDangerous && !req.body.confirmed) {
        return res.status(400).json({ 
            requiresConfirmation: true,
            message: 'This is a potentially dangerous command. Please confirm.'
        });
    }

    try {
        const result = await rconService.executeCommand(sanitizedCommand);
        res.json(result);
    } catch (error) {
        console.error('Error executing command:', error);
        res.status(500).json({ error: 'Failed to execute command' });
    }
});

/**
 * GET /commands/history
 * Get command history (from session)
 */
router.get('/history', (req, res) => {
    const history = req.session.commandHistory || [];
    res.json({ history });
});

/**
 * POST /commands/history
 * Add command to history
 */
router.post('/history', (req, res) => {
    const { command } = req.body;
    
    if (!command) {
        return res.status(400).json({ error: 'Command is required' });
    }

    if (!req.session.commandHistory) {
        req.session.commandHistory = [];
    }

    req.session.commandHistory.push({
        command,
        timestamp: new Date().toISOString()
    });

    // Keep only last 50 commands
    if (req.session.commandHistory.length > 50) {
        req.session.commandHistory.shift();
    }

    res.json({ success: true });
});

/**
 * GET /commands/favorites
 * Get favorite commands
 */
router.get('/favorites', (req, res) => {
    const favorites = req.session.favoriteCommands || [];
    res.json({ favorites });
});

/**
 * POST /commands/favorites
 * Add command to favorites
 */
router.post('/favorites', (req, res) => {
    const { command, label } = req.body;
    
    if (!command) {
        return res.status(400).json({ error: 'Command is required' });
    }

    if (!req.session.favoriteCommands) {
        req.session.favoriteCommands = [];
    }

    req.session.favoriteCommands.push({
        command,
        label: label || command,
        id: Date.now().toString()
    });

    res.json({ success: true });
});

/**
 * DELETE /commands/favorites/:id
 * Remove command from favorites
 */
router.delete('/favorites/:id', (req, res) => {
    const { id } = req.params;
    
    if (req.session.favoriteCommands) {
        req.session.favoriteCommands = req.session.favoriteCommands.filter(
            fav => fav.id !== id
        );
    }

    res.json({ success: true });
});

module.exports = router;
