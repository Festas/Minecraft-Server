const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

/**
 * Database Service
 * Manages SQLite database for player tracking and statistics
 * 
 * Schema:
 * - players table: uuid, username, first_seen, last_seen, total_playtime_ms, session_count, current_session_start
 * 
 * Features:
 * - Immediate writes (no debouncing) for crash resilience
 * - UUID-based player identification with username tracking
 * - Session tracking with heartbeat support
 */
class DatabaseService {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, '../data/players.db');
    }

    /**
     * Initialize the database and create schema if needed
     */
    initialize() {
        try {
            // Ensure data directory exists
            const dataDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            // Open database connection
            // WAL mode provides better concurrency and crash resilience
            this.db = new Database(this.dbPath);
            this.db.pragma('journal_mode = WAL');
            
            // Create schema
            this.createSchema();
            
            console.log(`Database initialized at ${this.dbPath}`);
        } catch (error) {
            console.error('Error initializing database:', error);
            throw error;
        }
    }

    /**
     * Create database schema
     */
    createSchema() {
        const createPlayersTable = `
            CREATE TABLE IF NOT EXISTS players (
                uuid TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                first_seen TEXT NOT NULL,
                last_seen TEXT NOT NULL,
                total_playtime_ms INTEGER DEFAULT 0,
                session_count INTEGER DEFAULT 0,
                current_session_start INTEGER
            )
        `;

        // Create index on username for lookups
        const createUsernameIndex = `
            CREATE INDEX IF NOT EXISTS idx_username ON players(username)
        `;

        // Create index on last_seen for sorting
        const createLastSeenIndex = `
            CREATE INDEX IF NOT EXISTS idx_last_seen ON players(last_seen DESC)
        `;

        // Create index on total_playtime_ms for sorting
        const createPlaytimeIndex = `
            CREATE INDEX IF NOT EXISTS idx_playtime ON players(total_playtime_ms DESC)
        `;

        // Create table for player actions history
        const createPlayerActionsTable = `
            CREATE TABLE IF NOT EXISTS player_actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_uuid TEXT NOT NULL,
                player_username TEXT NOT NULL,
                action_type TEXT NOT NULL,
                action_details TEXT,
                performed_by TEXT NOT NULL,
                performed_at TEXT NOT NULL,
                reason TEXT,
                FOREIGN KEY (player_uuid) REFERENCES players(uuid)
            )
        `;

        // Create index on player_uuid for action history lookups
        const createActionPlayerIndex = `
            CREATE INDEX IF NOT EXISTS idx_action_player ON player_actions(player_uuid, performed_at DESC)
        `;

        // Create table for whitelist management
        const createWhitelistTable = `
            CREATE TABLE IF NOT EXISTS whitelist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_uuid TEXT UNIQUE NOT NULL,
                player_username TEXT NOT NULL,
                added_by TEXT NOT NULL,
                added_at TEXT NOT NULL,
                notes TEXT,
                is_active INTEGER DEFAULT 1
            )
        `;

        // Create index on player_uuid for whitelist lookups
        const createWhitelistUuidIndex = `
            CREATE INDEX IF NOT EXISTS idx_whitelist_uuid ON whitelist(player_uuid)
        `;

        this.db.exec(createPlayersTable);
        this.db.exec(createUsernameIndex);
        this.db.exec(createLastSeenIndex);
        this.db.exec(createPlaytimeIndex);
        this.db.exec(createPlayerActionsTable);
        this.db.exec(createActionPlayerIndex);
        this.db.exec(createWhitelistTable);
        this.db.exec(createWhitelistUuidIndex);
    }

    /**
     * Add or update a player record
     * @param {string} uuid - Player UUID
     * @param {string} username - Player username
     * @param {string} timestamp - ISO timestamp
     * @returns {Object} Player record
     */
    upsertPlayer(uuid, username, timestamp) {
        const stmt = this.db.prepare(`
            INSERT INTO players (uuid, username, first_seen, last_seen, session_count)
            VALUES (?, ?, ?, ?, 0)
            ON CONFLICT(uuid) DO UPDATE SET
                username = excluded.username,
                last_seen = excluded.last_seen
        `);

        stmt.run(uuid, username, timestamp, timestamp);

        return this.getPlayerByUuid(uuid);
    }

    /**
     * Start a player session
     * @param {string} uuid - Player UUID
     * @param {number} sessionStart - Session start timestamp (ms since epoch)
     */
    startSession(uuid, sessionStart) {
        const stmt = this.db.prepare(`
            UPDATE players
            SET current_session_start = ?,
                session_count = session_count + 1,
                last_seen = datetime('now')
            WHERE uuid = ?
        `);

        stmt.run(sessionStart, uuid);
    }

    /**
     * Update player's last seen timestamp (heartbeat)
     * @param {string} uuid - Player UUID
     */
    updateLastSeen(uuid) {
        const stmt = this.db.prepare(`
            UPDATE players
            SET last_seen = datetime('now')
            WHERE uuid = ?
        `);

        stmt.run(uuid);
    }

    /**
     * End a player session and update total playtime
     * @param {string} uuid - Player UUID
     * @returns {number} Session duration in milliseconds
     */
    endSession(uuid) {
        const player = this.getPlayerByUuid(uuid);
        
        if (!player || !player.current_session_start) {
            console.warn(`Cannot end session for ${uuid}: no active session`);
            return 0;
        }

        const sessionDuration = Date.now() - player.current_session_start;

        const stmt = this.db.prepare(`
            UPDATE players
            SET total_playtime_ms = total_playtime_ms + ?,
                current_session_start = NULL,
                last_seen = datetime('now')
            WHERE uuid = ?
        `);

        stmt.run(sessionDuration, uuid);

        return sessionDuration;
    }

    /**
     * Get player by UUID
     * @param {string} uuid - Player UUID
     * @returns {Object|null} Player record or null
     */
    getPlayerByUuid(uuid) {
        const stmt = this.db.prepare('SELECT * FROM players WHERE uuid = ?');
        return stmt.get(uuid);
    }

    /**
     * Get player by username
     * @param {string} username - Player username
     * @returns {Object|null} Player record or null
     */
    getPlayerByUsername(username) {
        const stmt = this.db.prepare('SELECT * FROM players WHERE username = ?');
        return stmt.get(username);
    }

    /**
     * Get all players sorted by total playtime (descending)
     * @returns {Array} Array of player records
     */
    getAllPlayers() {
        const stmt = this.db.prepare(`
            SELECT * FROM players
            ORDER BY total_playtime_ms DESC
        `);
        return stmt.all();
    }

    /**
     * Get all players with active sessions
     * @returns {Array} Array of player UUIDs
     */
    getActivePlayers() {
        const stmt = this.db.prepare(`
            SELECT uuid FROM players
            WHERE current_session_start IS NOT NULL
        `);
        return stmt.all().map(row => row.uuid);
    }

    /**
     * Get total player count
     * @returns {number} Total number of players
     */
    getPlayerCount() {
        const stmt = this.db.prepare('SELECT COUNT(*) as count FROM players');
        const result = stmt.get();
        return result.count;
    }

    // ========================================================================
    // PLAYER ACTIONS HISTORY METHODS
    // ========================================================================

    /**
     * Record a player action for history tracking
     * @param {string} playerUuid - Player UUID
     * @param {string} playerUsername - Player username
     * @param {string} actionType - Type of action (kick, ban, warn, mute, etc.)
     * @param {string} performedBy - Username of admin/moderator
     * @param {string} reason - Reason for the action
     * @param {object} details - Additional action details
     */
    recordPlayerAction(playerUuid, playerUsername, actionType, performedBy, reason = null, details = null) {
        const stmt = this.db.prepare(`
            INSERT INTO player_actions 
            (player_uuid, player_username, action_type, action_details, performed_by, performed_at, reason)
            VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
        `);

        const actionDetails = details ? JSON.stringify(details) : null;
        stmt.run(playerUuid, playerUsername, actionType, actionDetails, performedBy, reason);
    }

    /**
     * Get action history for a specific player
     * @param {string} playerUuid - Player UUID
     * @param {number} limit - Maximum number of actions to return
     * @returns {Array} Array of action records
     */
    getPlayerActionHistory(playerUuid, limit = 50) {
        const stmt = this.db.prepare(`
            SELECT * FROM player_actions
            WHERE player_uuid = ?
            ORDER BY performed_at DESC
            LIMIT ?
        `);
        
        const actions = stmt.all(playerUuid, limit);
        
        // Parse JSON details
        return actions.map(action => ({
            ...action,
            action_details: action.action_details ? JSON.parse(action.action_details) : null
        }));
    }

    /**
     * Get all player actions (for admin audit)
     * @param {number} limit - Maximum number of actions to return
     * @returns {Array} Array of action records
     */
    getAllPlayerActions(limit = 100) {
        const stmt = this.db.prepare(`
            SELECT * FROM player_actions
            ORDER BY performed_at DESC
            LIMIT ?
        `);
        
        const actions = stmt.all(limit);
        
        // Parse JSON details
        return actions.map(action => ({
            ...action,
            action_details: action.action_details ? JSON.parse(action.action_details) : null
        }));
    }

    // ========================================================================
    // WHITELIST MANAGEMENT METHODS
    // ========================================================================

    /**
     * Add a player to the whitelist
     * @param {string} playerUuid - Player UUID
     * @param {string} playerUsername - Player username
     * @param {string} addedBy - Username of admin who added them
     * @param {string} notes - Optional notes
     */
    addToWhitelist(playerUuid, playerUsername, addedBy, notes = null) {
        const stmt = this.db.prepare(`
            INSERT INTO whitelist (player_uuid, player_username, added_by, added_at, notes, is_active)
            VALUES (?, ?, ?, datetime('now'), ?, 1)
            ON CONFLICT(player_uuid) DO UPDATE SET
                is_active = 1,
                player_username = excluded.player_username,
                added_by = excluded.added_by,
                added_at = excluded.added_at,
                notes = excluded.notes
        `);

        stmt.run(playerUuid, playerUsername, addedBy, notes);
    }

    /**
     * Remove a player from the whitelist
     * @param {string} playerUuid - Player UUID
     */
    removeFromWhitelist(playerUuid) {
        const stmt = this.db.prepare(`
            UPDATE whitelist
            SET is_active = 0
            WHERE player_uuid = ?
        `);

        stmt.run(playerUuid);
    }

    /**
     * Get all active whitelist entries
     * @returns {Array} Array of whitelist records
     */
    getActiveWhitelist() {
        const stmt = this.db.prepare(`
            SELECT * FROM whitelist
            WHERE is_active = 1
            ORDER BY added_at DESC
        `);

        return stmt.all();
    }

    /**
     * Check if a player is whitelisted
     * @param {string} playerUuid - Player UUID
     * @returns {boolean} True if player is whitelisted
     */
    isWhitelisted(playerUuid) {
        const stmt = this.db.prepare(`
            SELECT COUNT(*) as count FROM whitelist
            WHERE player_uuid = ? AND is_active = 1
        `);

        return stmt.get(playerUuid).count > 0;
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            console.log('Database connection closed');
        }
    }
}

module.exports = new DatabaseService();
