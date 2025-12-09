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

        this.db.exec(createPlayersTable);
        this.db.exec(createUsernameIndex);
        this.db.exec(createLastSeenIndex);
        this.db.exec(createPlaytimeIndex);
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
