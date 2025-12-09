/**
 * Notification Service
 * 
 * Manages user notifications, preferences, and real-time delivery.
 * Notifications are triggered by events and delivered via WebSocket.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');
const { EVENT_CATEGORIES, EVENT_SEVERITY } = require('./eventLogger');

/**
 * Notification delivery channels
 */
const NOTIFICATION_CHANNELS = {
    WEB: 'web',          // Browser notifications
    TOAST: 'toast',      // Toast popups
    INBOX: 'inbox'       // Notification inbox
};

/**
 * Notification status
 */
const NOTIFICATION_STATUS = {
    UNREAD: 'unread',
    READ: 'read',
    ARCHIVED: 'archived'
};

class NotificationService extends EventEmitter {
    constructor() {
        super();
        this.db = null;
        this.dbPath = path.join(__dirname, '../data/notifications.db');
        this.userPreferences = new Map(); // Cache for user preferences
    }

    /**
     * Initialize the notification service
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
            
            console.log(`[NotificationService] Initialized at ${this.dbPath}`);
        } catch (error) {
            console.error('[NotificationService] Error initializing:', error);
            throw error;
        }
    }

    /**
     * Create database schema
     */
    createSchema() {
        // Notifications table
        const createNotificationsTable = `
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                event_id INTEGER,
                event_type TEXT NOT NULL,
                category TEXT NOT NULL,
                severity TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT,
                icon TEXT,
                action_url TEXT,
                metadata TEXT,
                status TEXT DEFAULT 'unread',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                read_at TEXT,
                FOREIGN KEY (event_id) REFERENCES events(id)
            )
        `;

        // User notification preferences table
        const createPreferencesTable = `
            CREATE TABLE IF NOT EXISTS notification_preferences (
                user_id TEXT PRIMARY KEY,
                enabled INTEGER DEFAULT 1,
                channels TEXT DEFAULT '["web","toast","inbox"]',
                categories TEXT,
                severity_filter TEXT DEFAULT 'info',
                quiet_hours_start TEXT,
                quiet_hours_end TEXT,
                event_filters TEXT,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Indexes
        const createUserIdIndex = `
            CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC)
        `;

        const createStatusIndex = `
            CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status)
        `;

        const createEventTypeIndex = `
            CREATE INDEX IF NOT EXISTS idx_notifications_event_type ON notifications(event_type)
        `;

        this.db.exec(createNotificationsTable);
        this.db.exec(createPreferencesTable);
        this.db.exec(createUserIdIndex);
        this.db.exec(createStatusIndex);
        this.db.exec(createEventTypeIndex);
    }

    /**
     * Create notification for event
     * @param {string} userId - User ID to notify
     * @param {object} event - Event object
     * @returns {number} Notification ID
     */
    createNotification(userId, event) {
        // Check user preferences
        const prefs = this.getUserPreferences(userId);
        
        if (!prefs.enabled) {
            return null;
        }

        // Check if user wants this category
        if (prefs.categories && prefs.categories.length > 0) {
            if (!prefs.categories.includes(event.category)) {
                return null;
            }
        }

        // Check severity filter
        const severityLevels = ['debug', 'info', 'warning', 'error', 'critical'];
        const minSeverityIndex = severityLevels.indexOf(prefs.severity_filter || 'info');
        const eventSeverityIndex = severityLevels.indexOf(event.severity);
        
        if (eventSeverityIndex < minSeverityIndex) {
            return null;
        }

        // Check quiet hours
        if (this.isInQuietHours(prefs)) {
            // During quiet hours, only show critical events
            if (event.severity !== EVENT_SEVERITY.CRITICAL) {
                return null;
            }
        }

        // Create notification
        const stmt = this.db.prepare(`
            INSERT INTO notifications 
            (user_id, event_id, event_type, category, severity, title, message, icon, action_url, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            userId,
            event.id || null,
            event.eventType,
            event.category,
            event.severity,
            event.title,
            event.message || null,
            event.icon || null,
            event.actionUrl || null,
            event.metadata ? JSON.stringify(event.metadata) : null
        );

        const notificationId = result.lastInsertRowid;

        // Get the created notification
        const notification = this.getNotificationById(notificationId);

        // Emit notification for real-time delivery
        this.emit('notification', {
            userId,
            notification,
            channels: prefs.channels || ['web', 'toast', 'inbox']
        });

        return notificationId;
    }

    /**
     * Create notification for multiple users
     * @param {Array<string>} userIds - Array of user IDs
     * @param {object} event - Event object
     * @returns {Array<number>} Array of notification IDs
     */
    createNotifications(userIds, event) {
        const notificationIds = [];
        
        for (const userId of userIds) {
            const notificationId = this.createNotification(userId, event);
            if (notificationId) {
                notificationIds.push(notificationId);
            }
        }
        
        return notificationIds;
    }

    /**
     * Get notifications for user
     * @param {string} userId - User ID
     * @param {object} options - Query options
     * @returns {object} Notifications and metadata
     */
    getUserNotifications(userId, options = {}) {
        const conditions = ['user_id = ?'];
        const values = [userId];

        // Filter by status
        if (options.status) {
            conditions.push('status = ?');
            values.push(options.status);
        }

        // Filter by category
        if (options.category) {
            conditions.push('category = ?');
            values.push(options.category);
        }

        // Filter by severity
        if (options.severity) {
            conditions.push('severity = ?');
            values.push(options.severity);
        }

        const whereClause = `WHERE ${conditions.join(' AND ')}`;
        
        // Count total
        const countStmt = this.db.prepare(`SELECT COUNT(*) as total FROM notifications ${whereClause}`);
        const { total } = countStmt.get(...values);

        // Get notifications
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        const query = `
            SELECT * FROM notifications 
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;

        const stmt = this.db.prepare(query);
        const notifications = stmt.all(...values, limit, offset);

        // Parse metadata
        const notificationsWithMetadata = notifications.map(n => ({
            ...n,
            metadata: n.metadata ? JSON.parse(n.metadata) : null
        }));

        return {
            notifications: notificationsWithMetadata,
            total,
            limit,
            offset,
            hasMore: offset + notifications.length < total
        };
    }

    /**
     * Get notification by ID
     * @param {number} id - Notification ID
     * @returns {object|null} Notification or null
     */
    getNotificationById(id) {
        const stmt = this.db.prepare('SELECT * FROM notifications WHERE id = ?');
        const notification = stmt.get(id);
        
        if (notification && notification.metadata) {
            notification.metadata = JSON.parse(notification.metadata);
        }
        
        return notification;
    }

    /**
     * Mark notification as read
     * @param {number} id - Notification ID
     * @param {string} userId - User ID (for authorization)
     * @returns {boolean} Success
     */
    markAsRead(id, userId) {
        const stmt = this.db.prepare(`
            UPDATE notifications
            SET status = 'read', read_at = datetime('now')
            WHERE id = ? AND user_id = ?
        `);
        
        const result = stmt.run(id, userId);
        return result.changes > 0;
    }

    /**
     * Mark all notifications as read for user
     * @param {string} userId - User ID
     * @returns {number} Number of notifications marked as read
     */
    markAllAsRead(userId) {
        const stmt = this.db.prepare(`
            UPDATE notifications
            SET status = 'read', read_at = datetime('now')
            WHERE user_id = ? AND status = 'unread'
        `);
        
        const result = stmt.run(userId);
        return result.changes;
    }

    /**
     * Delete notification
     * @param {number} id - Notification ID
     * @param {string} userId - User ID (for authorization)
     * @returns {boolean} Success
     */
    deleteNotification(id, userId) {
        const stmt = this.db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?');
        const result = stmt.run(id, userId);
        return result.changes > 0;
    }

    /**
     * Get unread count for user
     * @param {string} userId - User ID
     * @returns {number} Unread count
     */
    getUnreadCount(userId) {
        const stmt = this.db.prepare(`
            SELECT COUNT(*) as count FROM notifications
            WHERE user_id = ? AND status = 'unread'
        `);
        
        const result = stmt.get(userId);
        return result.count;
    }

    /**
     * Get user notification preferences
     * @param {string} userId - User ID
     * @returns {object} Preferences
     */
    getUserPreferences(userId) {
        // Check cache first
        if (this.userPreferences.has(userId)) {
            return this.userPreferences.get(userId);
        }

        const stmt = this.db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?');
        let prefs = stmt.get(userId);

        if (!prefs) {
            // Create default preferences
            prefs = this.createDefaultPreferences(userId);
        } else {
            // Parse JSON fields
            prefs.channels = prefs.channels ? JSON.parse(prefs.channels) : ['web', 'toast', 'inbox'];
            prefs.categories = prefs.categories ? JSON.parse(prefs.categories) : null;
            prefs.event_filters = prefs.event_filters ? JSON.parse(prefs.event_filters) : null;
            prefs.enabled = Boolean(prefs.enabled);
        }

        // Cache preferences
        this.userPreferences.set(userId, prefs);

        return prefs;
    }

    /**
     * Create default preferences for user
     * @param {string} userId - User ID
     * @returns {object} Default preferences
     */
    createDefaultPreferences(userId) {
        const defaultPrefs = {
            user_id: userId,
            enabled: true,
            channels: ['web', 'toast', 'inbox'],
            categories: null, // null means all categories
            severity_filter: 'info',
            quiet_hours_start: null,
            quiet_hours_end: null,
            event_filters: null
        };

        const stmt = this.db.prepare(`
            INSERT INTO notification_preferences 
            (user_id, enabled, channels, severity_filter)
            VALUES (?, ?, ?, ?)
        `);

        stmt.run(
            userId,
            1,
            JSON.stringify(defaultPrefs.channels),
            defaultPrefs.severity_filter
        );

        return defaultPrefs;
    }

    /**
     * Update user notification preferences
     * @param {string} userId - User ID
     * @param {object} preferences - Preferences to update
     * @returns {object} Updated preferences
     */
    updateUserPreferences(userId, preferences) {
        const fields = [];
        const values = [];

        if (preferences.enabled !== undefined) {
            fields.push('enabled = ?');
            values.push(preferences.enabled ? 1 : 0);
        }

        if (preferences.channels !== undefined) {
            fields.push('channels = ?');
            values.push(JSON.stringify(preferences.channels));
        }

        if (preferences.categories !== undefined) {
            fields.push('categories = ?');
            values.push(preferences.categories ? JSON.stringify(preferences.categories) : null);
        }

        if (preferences.severity_filter !== undefined) {
            fields.push('severity_filter = ?');
            values.push(preferences.severity_filter);
        }

        if (preferences.quiet_hours_start !== undefined) {
            fields.push('quiet_hours_start = ?');
            values.push(preferences.quiet_hours_start);
        }

        if (preferences.quiet_hours_end !== undefined) {
            fields.push('quiet_hours_end = ?');
            values.push(preferences.quiet_hours_end);
        }

        if (preferences.event_filters !== undefined) {
            fields.push('event_filters = ?');
            values.push(preferences.event_filters ? JSON.stringify(preferences.event_filters) : null);
        }

        fields.push('updated_at = datetime(\'now\')');
        values.push(userId);

        // Ensure preferences exist
        this.getUserPreferences(userId);

        const stmt = this.db.prepare(`
            UPDATE notification_preferences 
            SET ${fields.join(', ')}
            WHERE user_id = ?
        `);

        stmt.run(...values);

        // Clear cache
        this.userPreferences.delete(userId);

        return this.getUserPreferences(userId);
    }

    /**
     * Check if current time is in quiet hours
     * @param {object} prefs - User preferences
     * @returns {boolean} True if in quiet hours
     */
    isInQuietHours(prefs) {
        if (!prefs.quiet_hours_start || !prefs.quiet_hours_end) {
            return false;
        }

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        const [startHour, startMin] = prefs.quiet_hours_start.split(':').map(Number);
        const [endHour, endMin] = prefs.quiet_hours_end.split(':').map(Number);
        
        const startTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;

        if (startTime < endTime) {
            return currentTime >= startTime && currentTime < endTime;
        } else {
            // Quiet hours span midnight
            return currentTime >= startTime || currentTime < endTime;
        }
    }

    /**
     * Delete old notifications
     * @param {number} daysToKeep - Number of days to keep notifications
     * @returns {number} Number of deleted notifications
     */
    deleteOldNotifications(daysToKeep = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        
        const stmt = this.db.prepare(`
            DELETE FROM notifications 
            WHERE created_at < ? AND status = 'read'
        `);
        
        const result = stmt.run(cutoffDate.toISOString());
        
        console.log(`[NotificationService] Deleted ${result.changes} old notifications`);
        
        return result.changes;
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            console.log('[NotificationService] Database connection closed');
        }
    }
}

module.exports = new NotificationService();
