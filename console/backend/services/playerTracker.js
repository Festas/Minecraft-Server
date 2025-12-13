const EventEmitter = require('events');
const database = require('./database');
const mojangService = require('./mojang');

/**
 * Player Tracking Service
 * Tracks all players who have joined the server, their playtime, and last seen timestamp
 * Uses SQLite database for persistence and Mojang API for UUID tracking
 */
class PlayerTrackerService extends EventEmitter {
    constructor() {
        super();
        this.activeSessions = new Map(); // uuid -> { username, startTime }
        this.heartbeatInterval = null;
        
        // Heartbeat interval - check active sessions and run watchdog
        this.heartbeatIntervalMs = parseInt(process.env.PLAYER_HEARTBEAT_INTERVAL_MS) || 60000; // Default: 60 seconds
        
        // Session timeout - how long before a session is considered stale
        this.sessionTimeoutMs = parseInt(process.env.PLAYER_SESSION_TIMEOUT_MS) || 180000; // Default: 3 minutes
    }

    /**
     * Initialize the player tracker
     */
    async initialize() {
        try {
            // Initialize database
            database.initialize();
            
            // Start heartbeat timer
            this.startHeartbeat();
            
            const playerCount = database.getPlayerCount();
            console.log(`Player tracker initialized with ${playerCount} players`);
            console.log(`Watchdog enabled: heartbeat=${this.heartbeatIntervalMs / 1000}s, timeout=${this.sessionTimeoutMs / 1000}s`);
        } catch (error) {
            console.error('Error initializing player tracker:', error);
            throw error;
        }
    }

    /**
     * Start periodic heartbeat to update active sessions
     */
    startHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        this.heartbeatInterval = setInterval(() => {
            this.updateActiveSessions();
        }, this.heartbeatIntervalMs);

        console.log(`Player heartbeat started (interval: ${this.heartbeatIntervalMs}ms)`);
    }

    /**
     * Stop heartbeat timer
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Update all active sessions (called by heartbeat)
     */
    updateActiveSessions() {
        // Update last_seen for all active sessions
        for (const [uuid, session] of this.activeSessions) {
            try {
                database.updateLastSeen(uuid);
            } catch (error) {
                console.error(`Error updating session for ${session.username}:`, error);
            }
        }

        if (this.activeSessions.size > 0) {
            console.log(`Heartbeat: Updated ${this.activeSessions.size} active session(s)`);
        }

        // Watchdog: Check for stale sessions and remove them
        this.checkForStaleSessions();
    }

    /**
     * Watchdog: Check for stale sessions and automatically remove them
     * This handles cases where players disconnect without a proper leave event
     * (e.g., crash, network loss, or abrupt connection termination)
     */
    checkForStaleSessions() {
        try {
            const stalePlayers = database.getPlayersWithStaleSessions(this.sessionTimeoutMs);
            
            for (const player of stalePlayers) {
                console.warn(`Watchdog: Detected stale session for ${player.username} (last seen: ${player.last_seen})`);
                
                // Automatically call playerLeft to clean up the session
                this.playerLeft(player.username).catch(error => {
                    console.error(`Watchdog: Error removing stale session for ${player.username}:`, error);
                });
                
                console.log(`Watchdog: Automatically removed ${player.username} due to session timeout`);
            }
        } catch (error) {
            console.error('Watchdog: Error checking for stale sessions:', error);
        }
    }

    /**
     * Handle player join event
     * @param {string} username - Player username
     */
    async playerJoined(username) {
        try {
            // Get UUID from Mojang API
            const uuid = await mojangService.getUuid(username);
            if (!uuid) {
                console.error(`Failed to get UUID for ${username}`);
                return;
            }

            const now = new Date().toISOString();
            const sessionStart = Date.now();

            // Upsert player record
            database.upsertPlayer(uuid, username, now);

            // Start session
            database.startSession(uuid, sessionStart);

            // Track active session
            this.activeSessions.set(uuid, { username, startTime: sessionStart });

            this.emit('player-joined', { username, uuid });

            console.log(`Player joined: ${username} (UUID: ${uuid})`);
        } catch (error) {
            console.error(`Error handling player join for ${username}:`, error);
        }
    }

    /**
     * Handle player leave event
     * @param {string} username - Player username
     */
    async playerLeft(username) {
        try {
            // Find UUID from active sessions or database
            let uuid = null;
            for (const [sessionUuid, session] of this.activeSessions) {
                if (session.username === username) {
                    uuid = sessionUuid;
                    break;
                }
            }

            if (!uuid) {
                // Try to get from database
                const player = database.getPlayerByUsername(username);
                if (player) {
                    uuid = player.uuid;
                } else {
                    console.warn(`Player left but no session found: ${username}`);
                    return;
                }
            }

            // End session and calculate duration
            const sessionDuration = database.endSession(uuid);

            // Remove from active sessions
            this.activeSessions.delete(uuid);

            this.emit('player-left', { username, uuid, sessionDuration });

            console.log(`Player left: ${username} (session: ${this.formatDuration(sessionDuration)})`);
        } catch (error) {
            console.error(`Error handling player leave for ${username}:`, error);
        }
    }

    /**
     * Get all tracked players
     * @returns {Array} Array of player objects
     */
    getAllPlayers() {
        return database.getAllPlayers();
    }

    /**
     * Get currently online players (by UUID)
     * @returns {Array} Array of UUIDs currently online
     */
    getOnlinePlayers() {
        return Array.from(this.activeSessions.keys());
    }

    /**
     * Get currently online player usernames
     * @returns {Array} Array of usernames currently online
     */
    getOnlinePlayerUsernames() {
        return Array.from(this.activeSessions.values()).map(s => s.username);
    }

    /**
     * Get player statistics by username
     * @param {string} username - Player username
     * @returns {Object|null} Player data or null if not found
     */
    getPlayerStats(username) {
        return database.getPlayerByUsername(username);
    }

    /**
     * Get watchdog configuration
     * @returns {Object} Watchdog configuration
     */
    getWatchdogConfig() {
        return {
            heartbeatIntervalMs: this.heartbeatIntervalMs,
            sessionTimeoutMs: this.sessionTimeoutMs,
            heartbeatIntervalSeconds: this.heartbeatIntervalMs / 1000,
            sessionTimeoutSeconds: this.sessionTimeoutMs / 1000
        };
    }

    /**
     * Set session timeout (for configuration or testing)
     * @param {number} timeoutMs - Timeout in milliseconds
     */
    setSessionTimeout(timeoutMs) {
        if (timeoutMs < 1000) {
            throw new Error('Session timeout must be at least 1000ms (1 second)');
        }
        this.sessionTimeoutMs = timeoutMs;
        console.log(`Session timeout updated to ${timeoutMs}ms (${timeoutMs / 1000}s)`);
    }

    /**
     * Format duration in milliseconds to human-readable string
     * @param {number} ms - Duration in milliseconds
     * @returns {string} Formatted duration
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days}d ${hours % 24}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Shutdown - close database and stop heartbeat
     */
    async shutdown() {
        try {
            // Stop heartbeat
            this.stopHeartbeat();

            // End all active sessions
            for (const [uuid, session] of this.activeSessions) {
                try {
                    database.endSession(uuid);
                    console.log(`Ended session for ${session.username}`);
                } catch (error) {
                    console.error(`Error ending session for ${session.username}:`, error);
                }
            }

            // Clear active sessions
            this.activeSessions.clear();

            // Close database
            database.close();

            console.log('Player tracker shutdown complete');
        } catch (error) {
            console.error('Error during player tracker shutdown:', error);
        }
    }
}

module.exports = new PlayerTrackerService();
