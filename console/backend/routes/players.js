const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/auth');
const { checkPermission } = require('../middleware/rbac');
const { PERMISSIONS } = require('../config/rbac');
const rconService = require('../services/rcon');
const playerTracker = require('../services/playerTracker');
const database = require('../services/database');
const mojangService = require('../services/mojang');
const { logAuditEvent, AUDIT_EVENTS, getClientIp } = require('../services/auditLog');

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
 * 
 * Response format:
 * {
 *   success: true,
 *   players: [
 *     {
 *       uuid: string,
 *       username: string,
 *       avatar: string (URL),
 *       first_seen: ISO timestamp,
 *       last_seen: ISO timestamp,
 *       total_playtime_ms: number,
 *       session_count: number,
 *       isOnline: boolean,
 *       formattedPlaytime: string
 *     }
 *   ],
 *   totalPlayers: number,
 *   onlineCount: number,
 *   maxPlayers: number
 * }
 */
router.get('/all', async (req, res) => {
    try {
        const allPlayers = playerTracker.getAllPlayers();
        const onlinePlayerUuids = playerTracker.getOnlinePlayers();
        
        // Get current server info for max players
        let maxPlayers = 20; // Default fallback
        try {
            const serverInfo = await rconService.getPlayers();
            maxPlayers = serverInfo.max || 20;
        } catch (error) {
            console.warn('Could not get max players from RCON, using default:', error.message);
        }
        
        // Add online status, format playtime, and add avatar URLs
        const playersWithStatus = allPlayers.map(player => ({
            uuid: player.uuid,
            username: player.username,
            avatar: `https://mc-heads.net/avatar/${player.username}/48`,
            first_seen: player.first_seen,
            last_seen: player.last_seen,
            total_playtime_ms: player.total_playtime_ms,
            session_count: player.session_count,
            isOnline: onlinePlayerUuids.includes(player.uuid),
            formattedPlaytime: playerTracker.formatDuration(player.total_playtime_ms)
        }));
        
        res.json({
            success: true,
            players: playersWithStatus,
            totalPlayers: playersWithStatus.length,
            onlineCount: onlinePlayerUuids.length,
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
router.post('/kick', checkPermission(PERMISSIONS.PLAYER_KICK), async (req, res) => {
    const { player, reason } = req.body;

    if (!player) {
        return res.status(400).json({ error: 'Player name is required' });
    }

    const command = reason ? 
        `kick ${player} ${reason}` : 
        `kick ${player}`;

    try {
        const result = await rconService.executeCommand(command);
        
        // Record action in history
        const playerUuid = await mojangService.getUuid(player);
        if (playerUuid) {
            database.recordPlayerAction(
                playerUuid,
                player,
                'kick',
                req.session.username,
                reason
            );
        }
        
        // Audit log
        await logAuditEvent(
            AUDIT_EVENTS.COMMAND_EXECUTED,
            req.session.username,
            { action: 'kick', player, reason },
            getClientIp(req)
        );
        
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
router.post('/ban', checkPermission(PERMISSIONS.PLAYER_BAN), async (req, res) => {
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
        
        // Record action in history
        const playerUuid = await mojangService.getUuid(player);
        if (playerUuid) {
            database.recordPlayerAction(
                playerUuid,
                player,
                'ban',
                req.session.username,
                reason
            );
        }
        
        // Audit log
        await logAuditEvent(
            AUDIT_EVENTS.COMMAND_EXECUTED,
            req.session.username,
            { action: 'ban', player, reason },
            getClientIp(req)
        );
        
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
router.post('/teleport', checkPermission(PERMISSIONS.PLAYER_TELEPORT), async (req, res) => {
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
        
        // Record action in history
        const playerUuid = await mojangService.getUuid(player);
        if (playerUuid) {
            database.recordPlayerAction(
                playerUuid,
                player,
                'teleport',
                req.session.username,
                null,
                { target, coordinates: { x, y, z } }
            );
        }
        
        // Audit log
        await logAuditEvent(
            AUDIT_EVENTS.COMMAND_EXECUTED,
            req.session.username,
            { action: 'teleport', player, target, coordinates: { x, y, z } },
            getClientIp(req)
        );
        
        res.json(result);
    } catch (error) {
        console.error('Error teleporting player:', error);
        res.status(500).json({ error: 'Failed to teleport player' });
    }
});

/**
 * POST /players/warn
 * Warn a player
 */
router.post('/warn', checkPermission(PERMISSIONS.PLAYER_WARN), async (req, res) => {
    const { player, reason } = req.body;

    if (!player) {
        return res.status(400).json({ error: 'Player name is required' });
    }

    if (!reason) {
        return res.status(400).json({ error: 'Reason is required for warnings' });
    }

    try {
        // Send warning message to player
        const message = `§eYou have been warned: §f${reason}`;
        const result = await rconService.executeCommand(`tellraw ${player} {"text":"${message}","color":"yellow"}`);
        
        // Record action in history
        const playerUuid = await mojangService.getUuid(player);
        if (playerUuid) {
            database.recordPlayerAction(
                playerUuid,
                player,
                'warn',
                req.session.username,
                reason
            );
        }
        
        // Audit log
        await logAuditEvent(
            AUDIT_EVENTS.COMMAND_EXECUTED,
            req.session.username,
            { action: 'warn', player, reason },
            getClientIp(req)
        );
        
        res.json({ 
            success: true, 
            message: `Warned ${player}`,
            ...result
        });
    } catch (error) {
        console.error('Error warning player:', error);
        res.status(500).json({ error: 'Failed to warn player' });
    }
});

/**
 * POST /players/mute
 * Mute a player (requires EssentialsX or similar plugin)
 */
router.post('/mute', checkPermission(PERMISSIONS.PLAYER_MUTE), async (req, res) => {
    const { player, reason, duration } = req.body;

    if (!player) {
        return res.status(400).json({ error: 'Player name is required' });
    }

    try {
        // Build mute command - works with EssentialsX
        let command = `mute ${player}`;
        if (duration) {
            command += ` ${duration}`;
        }
        if (reason) {
            command += ` ${reason}`;
        }

        const result = await rconService.executeCommand(command);
        
        // Record action in history
        const playerUuid = await mojangService.getUuid(player);
        if (playerUuid) {
            database.recordPlayerAction(
                playerUuid,
                player,
                'mute',
                req.session.username,
                reason,
                { duration }
            );
        }
        
        // Audit log
        await logAuditEvent(
            AUDIT_EVENTS.COMMAND_EXECUTED,
            req.session.username,
            { action: 'mute', player, reason, duration },
            getClientIp(req)
        );
        
        res.json(result);
    } catch (error) {
        console.error('Error muting player:', error);
        res.status(500).json({ error: 'Failed to mute player' });
    }
});

/**
 * POST /players/unmute
 * Unmute a player
 */
router.post('/unmute', checkPermission(PERMISSIONS.PLAYER_UNMUTE), async (req, res) => {
    const { player } = req.body;

    if (!player) {
        return res.status(400).json({ error: 'Player name is required' });
    }

    try {
        const result = await rconService.executeCommand(`unmute ${player}`);
        
        // Record action in history
        const playerUuid = await mojangService.getUuid(player);
        if (playerUuid) {
            database.recordPlayerAction(
                playerUuid,
                player,
                'unmute',
                req.session.username
            );
        }
        
        // Audit log
        await logAuditEvent(
            AUDIT_EVENTS.COMMAND_EXECUTED,
            req.session.username,
            { action: 'unmute', player },
            getClientIp(req)
        );
        
        res.json(result);
    } catch (error) {
        console.error('Error unmuting player:', error);
        res.status(500).json({ error: 'Failed to unmute player' });
    }
});

/**
 * GET /players/:uuid/details
 * Get detailed information about a specific player
 */
router.get('/:uuid/details', checkPermission(PERMISSIONS.PLAYER_VIEW_DETAILS), async (req, res) => {
    const { uuid } = req.params;

    try {
        const player = database.getPlayerByUuid(uuid);
        
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        // Get action history
        const actionHistory = database.getPlayerActionHistory(uuid, 20);
        
        // Check if online
        const onlinePlayerUuids = playerTracker.getOnlinePlayers();
        const isOnline = onlinePlayerUuids.includes(uuid);

        res.json({
            success: true,
            player: {
                uuid: player.uuid,
                username: player.username,
                avatar: `https://mc-heads.net/avatar/${player.username}/128`,
                first_seen: player.first_seen,
                last_seen: player.last_seen,
                total_playtime_ms: player.total_playtime_ms,
                formattedPlaytime: playerTracker.formatDuration(player.total_playtime_ms),
                session_count: player.session_count,
                isOnline
            },
            actionHistory
        });
    } catch (error) {
        console.error('Error getting player details:', error);
        res.status(500).json({ error: 'Failed to get player details' });
    }
});

/**
 * GET /players/:uuid/history
 * Get action history for a specific player
 */
router.get('/:uuid/history', checkPermission(PERMISSIONS.PLAYER_ACTION_HISTORY), async (req, res) => {
    const { uuid } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    try {
        const actionHistory = database.getPlayerActionHistory(uuid, limit);
        
        res.json({
            success: true,
            uuid,
            actions: actionHistory,
            count: actionHistory.length
        });
    } catch (error) {
        console.error('Error getting action history:', error);
        res.status(500).json({ error: 'Failed to get action history' });
    }
});

/**
 * GET /players/actions/all
 * Get all player actions (admin audit)
 */
router.get('/actions/all', checkPermission(PERMISSIONS.PLAYER_ACTION_HISTORY), async (req, res) => {
    const limit = parseInt(req.query.limit) || 100;

    try {
        const actions = database.getAllPlayerActions(limit);
        
        res.json({
            success: true,
            actions,
            count: actions.length
        });
    } catch (error) {
        console.error('Error getting all actions:', error);
        res.status(500).json({ error: 'Failed to get action history' });
    }
});

/**
 * GET /players/whitelist
 * Get whitelist entries
 */
router.get('/whitelist', checkPermission(PERMISSIONS.PLAYER_WHITELIST), async (req, res) => {
    try {
        const whitelist = database.getActiveWhitelist();
        
        res.json({
            success: true,
            whitelist,
            count: whitelist.length
        });
    } catch (error) {
        console.error('Error getting whitelist:', error);
        res.status(500).json({ error: 'Failed to get whitelist' });
    }
});

/**
 * POST /players/whitelist/add
 * Add a player to the whitelist
 */
router.post('/whitelist/add', checkPermission(PERMISSIONS.PLAYER_WHITELIST), async (req, res) => {
    const { player, notes } = req.body;

    if (!player) {
        return res.status(400).json({ error: 'Player name is required' });
    }

    try {
        // Get player UUID
        const playerUuid = await mojangService.getUuid(player);
        if (!playerUuid) {
            return res.status(404).json({ error: 'Player not found' });
        }

        // Add to Minecraft whitelist via RCON
        const result = await rconService.executeCommand(`whitelist add ${player}`);
        
        // Add to database
        database.addToWhitelist(playerUuid, player, req.session.username, notes);
        
        // Record action
        database.recordPlayerAction(
            playerUuid,
            player,
            'whitelist_add',
            req.session.username,
            notes
        );
        
        // Audit log
        await logAuditEvent(
            AUDIT_EVENTS.COMMAND_EXECUTED,
            req.session.username,
            { action: 'whitelist_add', player, notes },
            getClientIp(req)
        );
        
        res.json({ 
            success: true, 
            message: `Added ${player} to whitelist`,
            ...result
        });
    } catch (error) {
        console.error('Error adding to whitelist:', error);
        res.status(500).json({ error: 'Failed to add to whitelist' });
    }
});

/**
 * POST /players/whitelist/remove
 * Remove a player from the whitelist
 */
router.post('/whitelist/remove', checkPermission(PERMISSIONS.PLAYER_WHITELIST), async (req, res) => {
    const { player } = req.body;

    if (!player) {
        return res.status(400).json({ error: 'Player name is required' });
    }

    try {
        // Get player UUID
        const playerUuid = await mojangService.getUuid(player);
        if (!playerUuid) {
            return res.status(404).json({ error: 'Player not found' });
        }

        // Remove from Minecraft whitelist via RCON
        const result = await rconService.executeCommand(`whitelist remove ${player}`);
        
        // Update database
        database.removeFromWhitelist(playerUuid);
        
        // Record action
        database.recordPlayerAction(
            playerUuid,
            player,
            'whitelist_remove',
            req.session.username
        );
        
        // Audit log
        await logAuditEvent(
            AUDIT_EVENTS.COMMAND_EXECUTED,
            req.session.username,
            { action: 'whitelist_remove', player },
            getClientIp(req)
        );
        
        res.json({ 
            success: true, 
            message: `Removed ${player} from whitelist`,
            ...result
        });
    } catch (error) {
        console.error('Error removing from whitelist:', error);
        res.status(500).json({ error: 'Failed to remove from whitelist' });
    }
});

module.exports = router;
