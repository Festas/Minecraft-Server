const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/auth');
const rconService = require('../services/rcon');
const playerTracker = require('../services/playerTracker');

// All player routes require authentication
router.use(requireAuth);

/**
 * GET /players/list
 * Get list of online players
 */
router.get('/list', async (req, res) => {
    try {
        const players = await rconService.getPlayers();
        res.json(players);
    } catch (error) {
        console.error('Error getting players:', error);
        res.status(500).json({ error: 'Failed to get player list' });
    }
});

/**
 * GET /players/all
 * Get all players who have ever joined with their stats
 */
router.get('/all', async (req, res) => {
    try {
        const allPlayers = playerTracker.getAllPlayers();
        const onlinePlayers = playerTracker.getOnlinePlayers();
        
        // Get current server info for max players
        let maxPlayers = 20; // Default fallback
        try {
            const serverInfo = await rconService.getPlayers();
            maxPlayers = serverInfo.max || 20;
        } catch (error) {
            console.warn('Could not get max players from RCON, using default:', error.message);
        }
        
        // Sort by total playtime (descending)
        const sortedPlayers = allPlayers.sort((a, b) => 
            b.totalPlaytimeMs - a.totalPlaytimeMs
        );
        
        // Add online status and format playtime
        const playersWithStatus = sortedPlayers.map(player => ({
            ...player,
            isOnline: onlinePlayers.includes(player.username),
            formattedPlaytime: playerTracker.formatDuration(player.totalPlaytimeMs)
        }));
        
        res.json({
            success: true,
            players: playersWithStatus,
            totalPlayers: playersWithStatus.length,
            onlineCount: onlinePlayers.length,
            maxPlayers: maxPlayers
        });
    } catch (error) {
        console.error('Error getting all players:', error);
        res.status(500).json({ error: 'Failed to get player statistics' });
    }
});

/**
 * POST /players/kick
 * Kick a player
 */
router.post('/kick', async (req, res) => {
    const { player, reason } = req.body;

    if (!player) {
        return res.status(400).json({ error: 'Player name is required' });
    }

    const command = reason ? 
        `kick ${player} ${reason}` : 
        `kick ${player}`;

    try {
        const result = await rconService.executeCommand(command);
        res.json(result);
    } catch (error) {
        console.error('Error kicking player:', error);
        res.status(500).json({ error: 'Failed to kick player' });
    }
});

/**
 * POST /players/ban
 * Ban a player
 */
router.post('/ban', async (req, res) => {
    const { player, reason } = req.body;

    if (!player) {
        return res.status(400).json({ error: 'Player name is required' });
    }

    if (!req.body.confirmed) {
        return res.status(400).json({ 
            requiresConfirmation: true,
            message: 'Please confirm you want to ban this player.'
        });
    }

    const command = reason ? 
        `ban ${player} ${reason}` : 
        `ban ${player}`;

    try {
        const result = await rconService.executeCommand(command);
        res.json(result);
    } catch (error) {
        console.error('Error banning player:', error);
        res.status(500).json({ error: 'Failed to ban player' });
    }
});

/**
 * POST /players/pardon
 * Unban a player
 */
router.post('/pardon', async (req, res) => {
    const { player } = req.body;

    if (!player) {
        return res.status(400).json({ error: 'Player name is required' });
    }

    try {
        const result = await rconService.executeCommand(`pardon ${player}`);
        res.json(result);
    } catch (error) {
        console.error('Error unbanning player:', error);
        res.status(500).json({ error: 'Failed to unban player' });
    }
});

/**
 * POST /players/op
 * Give operator status
 */
router.post('/op', async (req, res) => {
    const { player } = req.body;

    if (!player) {
        return res.status(400).json({ error: 'Player name is required' });
    }

    try {
        const result = await rconService.executeCommand(`op ${player}`);
        res.json(result);
    } catch (error) {
        console.error('Error giving OP:', error);
        res.status(500).json({ error: 'Failed to give OP status' });
    }
});

/**
 * POST /players/deop
 * Remove operator status
 */
router.post('/deop', async (req, res) => {
    const { player } = req.body;

    if (!player) {
        return res.status(400).json({ error: 'Player name is required' });
    }

    try {
        const result = await rconService.executeCommand(`deop ${player}`);
        res.json(result);
    } catch (error) {
        console.error('Error removing OP:', error);
        res.status(500).json({ error: 'Failed to remove OP status' });
    }
});

/**
 * POST /players/gamemode
 * Change player gamemode
 */
router.post('/gamemode', async (req, res) => {
    const { player, mode } = req.body;

    if (!player || !mode) {
        return res.status(400).json({ error: 'Player and mode are required' });
    }

    const validModes = ['survival', 'creative', 'adventure', 'spectator'];
    if (!validModes.includes(mode.toLowerCase())) {
        return res.status(400).json({ error: 'Invalid gamemode' });
    }

    try {
        const result = await rconService.executeCommand(`gamemode ${mode} ${player}`);
        res.json(result);
    } catch (error) {
        console.error('Error changing gamemode:', error);
        res.status(500).json({ error: 'Failed to change gamemode' });
    }
});

/**
 * POST /players/teleport
 * Teleport player
 */
router.post('/teleport', async (req, res) => {
    const { player, target, x, y, z } = req.body;

    if (!player) {
        return res.status(400).json({ error: 'Player name is required' });
    }

    let command;
    if (target) {
        command = `tp ${player} ${target}`;
    } else if (x !== undefined && y !== undefined && z !== undefined) {
        command = `tp ${player} ${x} ${y} ${z}`;
    } else {
        return res.status(400).json({ error: 'Either target player or coordinates required' });
    }

    try {
        const result = await rconService.executeCommand(command);
        res.json(result);
    } catch (error) {
        console.error('Error teleporting player:', error);
        res.status(500).json({ error: 'Failed to teleport player' });
    }
});

module.exports = router;
