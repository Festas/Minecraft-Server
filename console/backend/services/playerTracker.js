const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

/**
 * Player Tracking Service
 * Tracks all players who have joined the server, their playtime, and last seen timestamp
 */
class PlayerTrackerService extends EventEmitter {
    constructor() {
        super();
        this.players = new Map(); // username -> player data
        this.activeSessions = new Map(); // username -> join timestamp
        this.dataFile = path.join(__dirname, '../data/player-stats.json');
        this.saveDebounceTimer = null;
        this.saveDebounceMs = 5000; // Save 5 seconds after last change
    }

    /**
     * Initialize the player tracker - load existing data
     */
    async initialize() {
        try {
            await this.loadData();
            console.log(`Player tracker initialized with ${this.players.size} players`);
        } catch (error) {
            console.error('Error initializing player tracker:', error);
            // Continue with empty player list if file doesn't exist
        }
    }

    /**
     * Load player data from JSON file
     */
    async loadData() {
        try {
            const data = await fs.readFile(this.dataFile, 'utf8');
            const playersArray = JSON.parse(data);
            
            // Convert array to Map for efficient lookups
            this.players = new Map(
                playersArray.map(player => [player.username, player])
            );
        } catch (error) {
            if (error.code === 'ENOENT') {
                // File doesn't exist yet - start fresh
                this.players = new Map();
            } else {
                throw error;
            }
        }
    }

    /**
     * Save player data to JSON file (debounced)
     */
    async saveData() {
        // Clear existing debounce timer
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
        }

        // Set new debounce timer
        this.saveDebounceTimer = setTimeout(async () => {
            try {
                // Convert Map to array for JSON serialization
                const playersArray = Array.from(this.players.values());
                await fs.writeFile(
                    this.dataFile,
                    JSON.stringify(playersArray, null, 2),
                    'utf8'
                );
            } catch (error) {
                console.error('Error saving player data:', error);
            }
        }, this.saveDebounceMs);
    }

    /**
     * Handle player join event
     * @param {string} username - Player username
     */
    playerJoined(username) {
        const now = new Date().toISOString();
        
        // Get or create player record
        let player = this.players.get(username);
        if (!player) {
            player = {
                username,
                firstSeen: now,
                lastSeen: now,
                totalPlaytimeMs: 0,
                sessionCount: 0
            };
            this.players.set(username, player);
        }

        // Start tracking this session
        this.activeSessions.set(username, Date.now());
        player.sessionCount++;
        
        this.saveData();
        this.emit('player-joined', { username, player });
        
        console.log(`Player joined: ${username}`);
    }

    /**
     * Handle player leave event
     * @param {string} username - Player username
     */
    playerLeft(username) {
        const now = new Date().toISOString();
        const sessionStart = this.activeSessions.get(username);
        
        if (!sessionStart) {
            console.warn(`Player left but no active session found: ${username}`);
            return;
        }

        // Calculate session duration
        const sessionDuration = Date.now() - sessionStart;
        
        // Update player record
        const player = this.players.get(username);
        if (player) {
            player.lastSeen = now;
            player.totalPlaytimeMs += sessionDuration;
            
            this.saveData();
            this.emit('player-left', { username, player, sessionDuration });
        }

        // Remove active session
        this.activeSessions.delete(username);
        
        console.log(`Player left: ${username} (session: ${this.formatDuration(sessionDuration)})`);
    }

    /**
     * Get all tracked players
     * @returns {Array} Array of player objects
     */
    getAllPlayers() {
        return Array.from(this.players.values());
    }

    /**
     * Get currently online players
     * @returns {Array} Array of usernames currently online
     */
    getOnlinePlayers() {
        return Array.from(this.activeSessions.keys());
    }

    /**
     * Get player statistics
     * @param {string} username - Player username
     * @returns {Object|null} Player data or null if not found
     */
    getPlayerStats(username) {
        return this.players.get(username) || null;
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
     * Shutdown - save any pending data
     */
    async shutdown() {
        // Clear debounce timer and save immediately
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
            this.saveDebounceTimer = null;
        }

        try {
            const playersArray = Array.from(this.players.values());
            await fs.writeFile(
                this.dataFile,
                JSON.stringify(playersArray, null, 2),
                'utf8'
            );
            console.log('Player tracker data saved on shutdown');
        } catch (error) {
            console.error('Error saving player data on shutdown:', error);
        }
    }
}

module.exports = new PlayerTrackerService();
