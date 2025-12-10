/**
 * Event Logging Service
 * 
 * Provides centralized, searchable event logging for server, plugin, user,
 * and automation events. Events are stored in SQLite database for persistence
 * and efficient querying.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');

/**
 * Event categories
 */
const EVENT_CATEGORIES = {
    SERVER: 'server',
    PLUGIN: 'plugin',
    USER: 'user',
    AUTOMATION: 'automation',
    PLAYER: 'player',
    BACKUP: 'backup',
    SECURITY: 'security',
    SYSTEM: 'system'
};

/**
 * Event severity levels
 */
const EVENT_SEVERITY = {
    DEBUG: 'debug',
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical'
};

/**
 * Event types organized by category
 */
const EVENT_TYPES = {
    // Server events
    SERVER_START: 'server.start',
    SERVER_STOP: 'server.stop',
    SERVER_RESTART: 'server.restart',
    SERVER_CRASH: 'server.crash',
    SERVER_PERFORMANCE_WARNING: 'server.performance.warning',
    
    // Plugin events
    PLUGIN_INSTALLED: 'plugin.installed',
    PLUGIN_UPDATED: 'plugin.updated',
    PLUGIN_DELETED: 'plugin.deleted',
    PLUGIN_ENABLED: 'plugin.enabled',
    PLUGIN_DISABLED: 'plugin.disabled',
    PLUGIN_ERROR: 'plugin.error',
    
    // User events
    USER_LOGIN: 'user.login',
    USER_LOGOUT: 'user.logout',
    USER_CREATED: 'user.created',
    USER_UPDATED: 'user.updated',
    USER_DELETED: 'user.deleted',
    USER_ROLE_CHANGED: 'user.role.changed',
    
    // Player events
    PLAYER_JOINED: 'player.joined',
    PLAYER_LEFT: 'player.left',
    PLAYER_KICKED: 'player.kicked',
    PLAYER_BANNED: 'player.banned',
    PLAYER_UNBANNED: 'player.unbanned',
    PLAYER_WHITELISTED: 'player.whitelisted',
    PLAYER_WARNED: 'player.warned',
    
    // Automation events
    AUTOMATION_TASK_CREATED: 'automation.task.created',
    AUTOMATION_TASK_UPDATED: 'automation.task.updated',
    AUTOMATION_TASK_DELETED: 'automation.task.deleted',
    AUTOMATION_TASK_EXECUTED: 'automation.task.executed',
    AUTOMATION_TASK_FAILED: 'automation.task.failed',
    
    // Backup events
    BACKUP_CREATED: 'backup.created',
    BACKUP_COMPLETED: 'backup.completed',
    BACKUP_RESTORED: 'backup.restored',
    BACKUP_DELETED: 'backup.deleted',
    BACKUP_FAILED: 'backup.failed',
    
    // Security events
    SECURITY_ACCESS_DENIED: 'security.access.denied',
    SECURITY_SUSPICIOUS_ACTIVITY: 'security.suspicious.activity',
    SECURITY_CONFIG_CHANGED: 'security.config.changed',
    
    // System events
    SYSTEM_ERROR: 'system.error',
    SYSTEM_WARNING: 'system.warning',
    SYSTEM_INFO: 'system.info'
};

class EventLoggerService extends EventEmitter {
    constructor() {
        super();
        this.db = null;
        this.dbPath = path.join(__dirname, '../data/events.db');
    }

    /**
     * Initialize the event logger database
     */
    initialize() {
        try {
            // Ensure data directory exists
            const dataDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            // Open database connection
            this.db = new Database(this.dbPath);
            this.db.pragma('journal_mode = WAL');
            
            // Create schema
            this.createSchema();
            
            console.log(`[EventLogger] Initialized at ${this.dbPath}`);
        } catch (error) {
            console.error('[EventLogger] Error initializing:', error);
            throw error;
        }
    }

    /**
     * Create database schema
     */
    createSchema() {
        // Events table
        const createEventsTable = `
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                category TEXT NOT NULL,
                severity TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT,
                actor TEXT,
                target TEXT,
                metadata TEXT,
                timestamp TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Indexes for efficient querying
        const createEventTypeIndex = `
            CREATE INDEX IF NOT EXISTS idx_event_type ON events(event_type)
        `;

        const createCategoryIndex = `
            CREATE INDEX IF NOT EXISTS idx_category ON events(category)
        `;

        const createSeverityIndex = `
            CREATE INDEX IF NOT EXISTS idx_severity ON events(severity)
        `;

        const createTimestampIndex = `
            CREATE INDEX IF NOT EXISTS idx_timestamp ON events(timestamp DESC)
        `;

        const createActorIndex = `
            CREATE INDEX IF NOT EXISTS idx_actor ON events(actor)
        `;

        const createCategoryTimestampIndex = `
            CREATE INDEX IF NOT EXISTS idx_category_timestamp ON events(category, timestamp DESC)
        `;

        this.db.exec(createEventsTable);
        this.db.exec(createEventTypeIndex);
        this.db.exec(createCategoryIndex);
        this.db.exec(createSeverityIndex);
        this.db.exec(createTimestampIndex);
        this.db.exec(createActorIndex);
        this.db.exec(createCategoryTimestampIndex);
    }

    /**
     * Log an event
     * @param {object} event - Event to log
     * @param {string} event.eventType - Type of event (from EVENT_TYPES)
     * @param {string} event.category - Event category (from EVENT_CATEGORIES)
     * @param {string} event.severity - Event severity (from EVENT_SEVERITY)
     * @param {string} event.title - Event title/summary
     * @param {string} event.message - Detailed event message
     * @param {string} event.actor - Who performed the action (username or 'system')
     * @param {string} event.target - Target of the action (player, file, etc.)
     * @param {object} event.metadata - Additional event metadata
     * @returns {number} Event ID
     */
    logEvent(event) {
        const stmt = this.db.prepare(`
            INSERT INTO events 
            (event_type, category, severity, title, message, actor, target, metadata, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const timestamp = new Date().toISOString();
        
        const result = stmt.run(
            event.eventType,
            event.category,
            event.severity || EVENT_SEVERITY.INFO,
            event.title,
            event.message || null,
            event.actor || 'system',
            event.target || null,
            event.metadata ? JSON.stringify(event.metadata) : null,
            timestamp
        );

        const eventId = result.lastInsertRowid;

        // Emit event for real-time notifications
        this.emit('event', {
            id: eventId,
            ...event,
            timestamp
        });

        console.log(`[EventLogger] Logged event #${eventId}: ${event.eventType} - ${event.title}`);

        return eventId;
    }

    /**
     * Query events with filtering and pagination
     * @param {object} options - Query options
     * @param {string} options.category - Filter by category
     * @param {string} options.severity - Filter by severity
     * @param {string} options.eventType - Filter by event type
     * @param {string} options.actor - Filter by actor
     * @param {string} options.target - Filter by target
     * @param {string} options.startDate - Filter by start date (ISO string)
     * @param {string} options.endDate - Filter by end date (ISO string)
     * @param {string} options.search - Search in title and message
     * @param {number} options.limit - Maximum number of results (default: 100)
     * @param {number} options.offset - Offset for pagination (default: 0)
     * @param {string} options.sortBy - Sort field (default: timestamp)
     * @param {string} options.sortOrder - Sort order (asc/desc, default: desc)
     * @returns {object} Query results with events and metadata
     */
    queryEvents(options = {}) {
        const conditions = [];
        const values = [];

        // Build WHERE clause
        if (options.category) {
            conditions.push('category = ?');
            values.push(options.category);
        }

        if (options.severity) {
            conditions.push('severity = ?');
            values.push(options.severity);
        }

        if (options.eventType) {
            conditions.push('event_type = ?');
            values.push(options.eventType);
        }

        if (options.actor) {
            conditions.push('actor = ?');
            values.push(options.actor);
        }

        if (options.target) {
            conditions.push('target LIKE ?');
            values.push(`%${options.target}%`);
        }

        if (options.startDate) {
            conditions.push('timestamp >= ?');
            values.push(options.startDate);
        }

        if (options.endDate) {
            conditions.push('timestamp <= ?');
            values.push(options.endDate);
        }

        if (options.search) {
            conditions.push('(title LIKE ? OR message LIKE ?)');
            values.push(`%${options.search}%`, `%${options.search}%`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        
        // Count total matching records
        const countStmt = this.db.prepare(`SELECT COUNT(*) as total FROM events ${whereClause}`);
        const { total } = countStmt.get(...values);

        // Build query with sorting and pagination
        const sortBy = options.sortBy || 'timestamp';
        const sortOrder = options.sortOrder === 'asc' ? 'ASC' : 'DESC';
        const limit = options.limit || 100;
        const offset = options.offset || 0;

        const query = `
            SELECT * FROM events 
            ${whereClause}
            ORDER BY ${sortBy} ${sortOrder}
            LIMIT ? OFFSET ?
        `;

        const stmt = this.db.prepare(query);
        const events = stmt.all(...values, limit, offset);

        // Parse metadata
        const eventsWithMetadata = events.map(event => ({
            ...event,
            metadata: event.metadata ? JSON.parse(event.metadata) : null
        }));

        return {
            events: eventsWithMetadata,
            total,
            limit,
            offset,
            hasMore: offset + events.length < total
        };
    }

    /**
     * Get event by ID
     * @param {number} id - Event ID
     * @returns {object|null} Event or null
     */
    getEventById(id) {
        const stmt = this.db.prepare('SELECT * FROM events WHERE id = ?');
        const event = stmt.get(id);
        
        if (event && event.metadata) {
            event.metadata = JSON.parse(event.metadata);
        }
        
        return event;
    }

    /**
     * Get recent events
     * @param {number} limit - Maximum number of events
     * @returns {Array} Array of events
     */
    getRecentEvents(limit = 50) {
        const stmt = this.db.prepare(`
            SELECT * FROM events
            ORDER BY timestamp DESC
            LIMIT ?
        `);
        
        const events = stmt.all(limit);
        
        return events.map(event => ({
            ...event,
            metadata: event.metadata ? JSON.parse(event.metadata) : null
        }));
    }

    /**
     * Get event statistics
     * @param {string} startDate - Start date (ISO string)
     * @param {string} endDate - End date (ISO string)
     * @returns {object} Event statistics
     */
    getEventStats(startDate, endDate) {
        const whereClause = startDate && endDate 
            ? 'WHERE timestamp >= ? AND timestamp <= ?' 
            : '';
        const params = startDate && endDate ? [startDate, endDate] : [];

        // Count by category
        const categoryStmt = this.db.prepare(`
            SELECT category, COUNT(*) as count
            FROM events
            ${whereClause}
            GROUP BY category
        `);
        const byCategory = categoryStmt.all(...params);

        // Count by severity
        const severityStmt = this.db.prepare(`
            SELECT severity, COUNT(*) as count
            FROM events
            ${whereClause}
            GROUP BY severity
        `);
        const bySeverity = severityStmt.all(...params);

        // Count by event type (top 10)
        const typeStmt = this.db.prepare(`
            SELECT event_type, COUNT(*) as count
            FROM events
            ${whereClause}
            GROUP BY event_type
            ORDER BY count DESC
            LIMIT 10
        `);
        const byEventType = typeStmt.all(...params);

        // Total count
        const totalStmt = this.db.prepare(`
            SELECT COUNT(*) as total FROM events ${whereClause}
        `);
        const { total } = totalStmt.get(...params);

        return {
            total,
            byCategory,
            bySeverity,
            byEventType
        };
    }

    /**
     * Delete old events
     * @param {number} daysToKeep - Number of days to keep events
     * @returns {number} Number of deleted events
     */
    deleteOldEvents(daysToKeep = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        
        const stmt = this.db.prepare('DELETE FROM events WHERE timestamp < ?');
        const result = stmt.run(cutoffDate.toISOString());
        
        console.log(`[EventLogger] Deleted ${result.changes} events older than ${daysToKeep} days`);
        
        return result.changes;
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            console.log('[EventLogger] Database connection closed');
        }
    }
}

module.exports = {
    eventLogger: new EventLoggerService(),
    EVENT_CATEGORIES,
    EVENT_SEVERITY,
    EVENT_TYPES
};
