const EventEmitter = require('events');
const database = require('./database');
const mojangService = require('./mojang');
const rconService = require('./rcon');

/**
 * Player Tracking Service
 * Tracks all players who have joined the server, their playtime, and last seen timestamp
 * Uses SQLite database for persistence and Mojang API for UUID tracking
 * 
 * RCON Integration:
 * - Polls RCON /list command periodically to get actual online players
 * - Only updates last_seen for RCON-confirmed online players
 * - Automatically removes zombie/ghost sessions that are not on the server
 * - Includes error tolerance to prevent false removals during RCON failures
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
        
        // RCON polling configuration
        this.rconPollIntervalMs = parseInt(process.env.RCON_POLL_INTERVAL_MS) || 60000; // Default: 60 seconds (same as heartbeat)
        this.rconPollInterval = null;
        
        // RCON error tolerance - allow N consecutive failures before giving up on RCON
        this.rconMaxFailures = parseInt(process.env.RCON_MAX_FAILURES) || 3; // Default: 3 failures
        this.rconConsecutiveFailures = 0;
        this.rconLastSuccessTime = null;
        
        // Cache of RCON-confirmed online players (usernames)
        this.rconOnlinePlayers = new Set();
        this.rconLastPollTime = null;
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
            
            // Start RCON polling
            this.startRconPolling();
            
            const playerCount = database.getPlayerCount();
            console.log(`Player tracker initialized with ${playerCount} players`);
            console.log(`Watchdog enabled: heartbeat=${this.heartbeatIntervalMs / 1000}s, timeout=${this.sessionTimeoutMs / 1000}s`);
            console.log(`RCON polling enabled: interval=${this.rconPollIntervalMs / 1000}s, max_failures=${this.rconMaxFailures}`);
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
     * Start RCON polling to get actual online players
     */
    startRconPolling() {
        if (this.rconPollInterval) {
            clearInterval(this.rconPollInterval);
        }

        // Do an immediate poll
        this.pollRconOnlinePlayers();

        this.rconPollInterval = setInterval(() => {
            this.pollRconOnlinePlayers();
        }, this.rconPollIntervalMs);

        console.log(`RCON polling started (interval: ${this.rconPollIntervalMs}ms)`);
    }

    /**
     * Stop RCON polling timer
     */
    stopRconPolling() {
        if (this.rconPollInterval) {
            clearInterval(this.rconPollInterval);
            this.rconPollInterval = null;
        }
    }

    /**
     * Poll RCON for actual online players
     * Updates the rconOnlinePlayers cache with current server player list
     */
    async pollRconOnlinePlayers() {
        try {
            // Check if RCON is connected
            if (!rconService.isConnected()) {
                this.rconConsecutiveFailures++;
                console.warn(`RCON polling: Not connected (failure ${this.rconConsecutiveFailures}/${this.rconMaxFailures})`);
                return;
            }

            // Get player list from RCON
            const playerList = await rconService.getPlayers();
            
            if (!playerList || !Array.isArray(playerList.players)) {
                this.rconConsecutiveFailures++;
                console.warn(`RCON polling: Invalid response (failure ${this.rconConsecutiveFailures}/${this.rconMaxFailures})`);
                return;
            }

            // Success! Reset failure counter and update cache
            this.rconConsecutiveFailures = 0;
            this.rconLastSuccessTime = Date.now();
            this.rconLastPollTime = Date.now();
            
            // Update online players cache
            this.rconOnlinePlayers.clear();
            playerList.players.forEach(username => {
                this.rconOnlinePlayers.add(username);
            });

            const onlineCount = this.rconOnlinePlayers.size;
            if (onlineCount > 0) {
                console.log(`RCON polling: ${onlineCount} player(s) online: ${Array.from(this.rconOnlinePlayers).join(', ')}`);
            } else {
                console.log(`RCON polling: No players online`);
            }

        } catch (error) {
            this.rconConsecutiveFailures++;
            console.error(`RCON polling error (failure ${this.rconConsecutiveFailures}/${this.rconMaxFailures}):`, error.message);
        }
    }

    /**
     * Check if RCON data is reliable
     * Returns false if we've had too many consecutive failures
     */
    isRconReliable() {
        return this.rconConsecutiveFailures < this.rconMaxFailures;
    }

    /**
     * Update all active sessions (called by heartbeat)
     * Now only updates last_seen for RCON-confirmed online players
     */
    updateActiveSessions() {
        // Check if RCON data is reliable
        if (!this.isRconReliable()) {
            console.warn(`Heartbeat: RCON unreliable (${this.rconConsecutiveFailures} failures), skipping last_seen updates`);
            // Don't update anyone's last_seen if RCON is failing
            // This prevents false timeouts during temporary RCON issues
            return;
        }

        // Only update last_seen for players confirmed by RCON
        let updatedCount = 0;
        let skippedCount = 0;

        for (const [uuid, session] of this.activeSessions) {
            try {
                // Only update if player is in RCON's online list
                if (this.rconOnlinePlayers.has(session.username)) {
                    database.updateLastSeen(uuid);
                    updatedCount++;
                } else {
                    // Player is in our sessions but not in RCON list
                    // Don't update their last_seen - let the watchdog handle it
                    skippedCount++;
                    console.log(`Heartbeat: Skipping ${session.username} (not in RCON list)`);
                }
            } catch (error) {
                console.error(`Error updating session for ${session.username}:`, error);
            }
        }

        if (updatedCount > 0 || skippedCount > 0) {
            console.log(`Heartbeat: Updated ${updatedCount} session(s), skipped ${skippedCount}`);
        }

        // Watchdog: Check for stale sessions and remove them
        this.checkForStaleSessions();
    }

    /**
     * Watchdog: Check for stale sessions and automatically remove them
     * This handles cases where players disconnect without a proper leave event
     * (e.g., crash, network loss, or abrupt connection termination)
     * 
     * Enhanced with RCON integration:
     * - Players not in RCON list stop getting last_seen updates
     * - After timeout period, they are automatically removed
     * - Comprehensive logging for troubleshooting
     */
    checkForStaleSessions() {
        try {
            const stalePlayers = database.getPlayersWithStaleSessions(this.sessionTimeoutMs);
            
            if (stalePlayers.length === 0) {
                return; // No stale sessions, nothing to do
            }

            console.log(`Watchdog: Found ${stalePlayers.length} stale session(s) to clean up`);
            
            for (const player of stalePlayers) {
                const lastSeenDate = new Date(player.last_seen);
                const timeSinceLastSeen = Date.now() - lastSeenDate.getTime();
                const minutesSinceLastSeen = Math.floor(timeSinceLastSeen / 60000);
                
                console.warn(`Watchdog: Removing stale session for player "${player.username}":`);
                console.warn(`  - UUID: ${player.uuid}`);
                console.warn(`  - Last seen: ${player.last_seen} (${minutesSinceLastSeen} minutes ago)`);
                console.warn(`  - Timeout threshold: ${this.sessionTimeoutMs / 60000} minutes`);
                console.warn(`  - Reason: Player not confirmed by RCON, last_seen exceeded timeout`);
                
                // Automatically call playerLeft to clean up the session
                this.playerLeft(player.username)
                    .then(() => {
                        console.log(`✓ Watchdog: Successfully removed "${player.username}" (zombie session cleanup)`);
                    })
                    .catch(error => {
                        console.error(`✗ Watchdog: Error removing stale session for ${player.username}:`, error);
                    });
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
            sessionTimeoutSeconds: this.sessionTimeoutMs / 1000,
            rconPollIntervalMs: this.rconPollIntervalMs,
            rconPollIntervalSeconds: this.rconPollIntervalMs / 1000,
            rconMaxFailures: this.rconMaxFailures,
            rconConsecutiveFailures: this.rconConsecutiveFailures,
            rconReliable: this.isRconReliable(),
            rconLastPollTime: this.rconLastPollTime,
            rconLastSuccessTime: this.rconLastSuccessTime,
            rconOnlineCount: this.rconOnlinePlayers.size
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

            // Stop RCON polling
            this.stopRconPolling();

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
