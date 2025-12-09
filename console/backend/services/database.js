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

        // Create table for scheduled automation tasks
        const createAutomationTasksTable = `
            CREATE TABLE IF NOT EXISTS automation_tasks (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                task_type TEXT NOT NULL,
                cron_expression TEXT NOT NULL,
                config TEXT NOT NULL,
                enabled INTEGER DEFAULT 1,
                created_by TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                last_run TEXT,
                next_run TEXT,
                run_count INTEGER DEFAULT 0
            )
        `;

        // Create index on task_type for filtering
        const createTaskTypeIndex = `
            CREATE INDEX IF NOT EXISTS idx_task_type ON automation_tasks(task_type)
        `;

        // Create table for automation task execution history
        const createAutomationHistoryTable = `
            CREATE TABLE IF NOT EXISTS automation_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id TEXT,
                task_name TEXT NOT NULL,
                task_type TEXT NOT NULL,
                execution_type TEXT NOT NULL,
                executed_by TEXT NOT NULL,
                executed_at TEXT NOT NULL,
                status TEXT NOT NULL,
                duration_ms INTEGER,
                error_message TEXT,
                result_details TEXT
            )
        `;

        // Create index on task_id for history lookups
        const createHistoryTaskIndex = `
            CREATE INDEX IF NOT EXISTS idx_history_task ON automation_history(task_id, executed_at DESC)
        `;

        // Create index on executed_at for chronological queries
        const createHistoryTimeIndex = `
            CREATE INDEX IF NOT EXISTS idx_history_time ON automation_history(executed_at DESC)
        `;

        // Create table for outbound webhooks
        const createWebhooksTable = `
            CREATE TABLE IF NOT EXISTS webhooks (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                url TEXT NOT NULL,
                method TEXT DEFAULT 'POST',
                headers TEXT,
                event_types TEXT NOT NULL,
                enabled INTEGER DEFAULT 1,
                secret TEXT,
                verify_ssl INTEGER DEFAULT 1,
                timeout_ms INTEGER DEFAULT 30000,
                retry_count INTEGER DEFAULT 3,
                created_by TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                last_triggered TEXT,
                trigger_count INTEGER DEFAULT 0,
                failure_count INTEGER DEFAULT 0
            )
        `;

        // Create index on enabled status for filtering
        const createWebhooksEnabledIndex = `
            CREATE INDEX IF NOT EXISTS idx_webhooks_enabled ON webhooks(enabled)
        `;

        // Create table for webhook delivery logs
        const createWebhookLogsTable = `
            CREATE TABLE IF NOT EXISTS webhook_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                webhook_id TEXT NOT NULL,
                webhook_name TEXT NOT NULL,
                event_type TEXT NOT NULL,
                event_data TEXT,
                url TEXT NOT NULL,
                request_payload TEXT,
                request_headers TEXT,
                response_status INTEGER,
                response_body TEXT,
                response_time_ms INTEGER,
                attempt_number INTEGER DEFAULT 1,
                success INTEGER DEFAULT 0,
                error_message TEXT,
                triggered_at TEXT NOT NULL,
                FOREIGN KEY (webhook_id) REFERENCES webhooks(id)
            )
        `;

        // Create index on webhook_id for log lookups
        const createWebhookLogsWebhookIndex = `
            CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook ON webhook_logs(webhook_id, triggered_at DESC)
        `;

        // Create index on triggered_at for chronological queries
        const createWebhookLogsTimeIndex = `
            CREATE INDEX IF NOT EXISTS idx_webhook_logs_time ON webhook_logs(triggered_at DESC)
        `;

        // Create table for inbound webhooks
        const createInboundWebhooksTable = `
            CREATE TABLE IF NOT EXISTS inbound_webhooks (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                secret TEXT NOT NULL,
                allowed_ips TEXT,
                actions TEXT NOT NULL,
                permissions_required TEXT NOT NULL,
                enabled INTEGER DEFAULT 1,
                created_by TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                last_used TEXT,
                use_count INTEGER DEFAULT 0
            )
        `;

        // Create index on enabled status for filtering
        const createInboundWebhooksEnabledIndex = `
            CREATE INDEX IF NOT EXISTS idx_inbound_webhooks_enabled ON inbound_webhooks(enabled)
        `;

        this.db.exec(createPlayersTable);
        this.db.exec(createUsernameIndex);
        this.db.exec(createLastSeenIndex);
        this.db.exec(createPlaytimeIndex);
        this.db.exec(createPlayerActionsTable);
        this.db.exec(createActionPlayerIndex);
        this.db.exec(createWhitelistTable);
        this.db.exec(createWhitelistUuidIndex);
        this.db.exec(createAutomationTasksTable);
        this.db.exec(createTaskTypeIndex);
        this.db.exec(createAutomationHistoryTable);
        this.db.exec(createHistoryTaskIndex);
        this.db.exec(createHistoryTimeIndex);
        this.db.exec(createWebhooksTable);
        this.db.exec(createWebhooksEnabledIndex);
        this.db.exec(createWebhookLogsTable);
        this.db.exec(createWebhookLogsWebhookIndex);
        this.db.exec(createWebhookLogsTimeIndex);
        this.db.exec(createInboundWebhooksTable);
        this.db.exec(createInboundWebhooksEnabledIndex);
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

    // ========================================================================
    // AUTOMATION TASKS METHODS
    // ========================================================================

    /**
     * Create a new automation task
     * @param {object} task - Task configuration
     * @returns {object} Created task
     */
    createAutomationTask(task) {
        const stmt = this.db.prepare(`
            INSERT INTO automation_tasks 
            (id, name, description, task_type, cron_expression, config, enabled, created_by, created_at, updated_at, next_run)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?)
        `);

        stmt.run(
            task.id,
            task.name,
            task.description || null,
            task.task_type,
            task.cron_expression,
            JSON.stringify(task.config),
            task.enabled ? 1 : 0,
            task.created_by,
            task.next_run || null
        );

        return this.getAutomationTask(task.id);
    }

    /**
     * Get automation task by ID
     * @param {string} id - Task ID
     * @returns {object|null} Task or null
     */
    getAutomationTask(id) {
        const stmt = this.db.prepare('SELECT * FROM automation_tasks WHERE id = ?');
        const task = stmt.get(id);
        
        if (task) {
            task.config = JSON.parse(task.config);
            task.enabled = Boolean(task.enabled);
        }
        
        return task;
    }

    /**
     * Get all automation tasks
     * @param {boolean} enabledOnly - Only return enabled tasks
     * @returns {Array} Array of tasks
     */
    getAllAutomationTasks(enabledOnly = false) {
        const query = enabledOnly 
            ? 'SELECT * FROM automation_tasks WHERE enabled = 1 ORDER BY created_at DESC'
            : 'SELECT * FROM automation_tasks ORDER BY created_at DESC';
        
        const stmt = this.db.prepare(query);
        const tasks = stmt.all();
        
        return tasks.map(task => ({
            ...task,
            config: JSON.parse(task.config),
            enabled: Boolean(task.enabled)
        }));
    }

    /**
     * Update automation task
     * @param {string} id - Task ID
     * @param {object} updates - Fields to update
     */
    updateAutomationTask(id, updates) {
        const fields = [];
        const values = [];

        if (updates.name !== undefined) {
            fields.push('name = ?');
            values.push(updates.name);
        }
        if (updates.description !== undefined) {
            fields.push('description = ?');
            values.push(updates.description);
        }
        if (updates.task_type !== undefined) {
            fields.push('task_type = ?');
            values.push(updates.task_type);
        }
        if (updates.cron_expression !== undefined) {
            fields.push('cron_expression = ?');
            values.push(updates.cron_expression);
        }
        if (updates.config !== undefined) {
            fields.push('config = ?');
            values.push(JSON.stringify(updates.config));
        }
        if (updates.enabled !== undefined) {
            fields.push('enabled = ?');
            values.push(updates.enabled ? 1 : 0);
        }
        if (updates.next_run !== undefined) {
            fields.push('next_run = ?');
            values.push(updates.next_run);
        }

        fields.push('updated_at = datetime(\'now\')');
        values.push(id);

        const stmt = this.db.prepare(`
            UPDATE automation_tasks 
            SET ${fields.join(', ')}
            WHERE id = ?
        `);

        stmt.run(...values);
        return this.getAutomationTask(id);
    }

    /**
     * Delete automation task
     * @param {string} id - Task ID
     */
    deleteAutomationTask(id) {
        const stmt = this.db.prepare('DELETE FROM automation_tasks WHERE id = ?');
        stmt.run(id);
    }

    /**
     * Update task run statistics
     * @param {string} id - Task ID
     * @param {string} nextRun - Next run time (ISO string)
     */
    updateTaskRunStats(id, nextRun) {
        const stmt = this.db.prepare(`
            UPDATE automation_tasks
            SET last_run = datetime('now'),
                run_count = run_count + 1,
                next_run = ?
            WHERE id = ?
        `);

        stmt.run(nextRun, id);
    }

    // ========================================================================
    // AUTOMATION HISTORY METHODS
    // ========================================================================

    /**
     * Record automation task execution
     * @param {object} execution - Execution details
     */
    recordAutomationExecution(execution) {
        const stmt = this.db.prepare(`
            INSERT INTO automation_history 
            (task_id, task_name, task_type, execution_type, executed_by, executed_at, status, duration_ms, error_message, result_details)
            VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?)
        `);

        stmt.run(
            execution.task_id || null,
            execution.task_name,
            execution.task_type,
            execution.execution_type, // 'scheduled' or 'manual'
            execution.executed_by,
            execution.status, // 'success', 'failed', 'partial'
            execution.duration_ms || null,
            execution.error_message || null,
            execution.result_details ? JSON.stringify(execution.result_details) : null
        );
    }

    /**
     * Get automation execution history
     * @param {object} options - Filter options
     * @returns {Array} Array of execution records
     */
    getAutomationHistory(options = {}) {
        let query = 'SELECT * FROM automation_history';
        const conditions = [];
        const values = [];

        if (options.task_id) {
            conditions.push('task_id = ?');
            values.push(options.task_id);
        }

        if (options.task_type) {
            conditions.push('task_type = ?');
            values.push(options.task_type);
        }

        if (options.execution_type) {
            conditions.push('execution_type = ?');
            values.push(options.execution_type);
        }

        if (options.status) {
            conditions.push('status = ?');
            values.push(options.status);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY executed_at DESC';

        if (options.limit) {
            query += ' LIMIT ?';
            values.push(options.limit);
        } else {
            query += ' LIMIT 100';
        }

        const stmt = this.db.prepare(query);
        const history = stmt.all(...values);

        return history.map(record => ({
            ...record,
            result_details: record.result_details ? JSON.parse(record.result_details) : null
        }));
    }

    // ========================================================================
    // WEBHOOK METHODS
    // ========================================================================

    /**
     * Create a new outbound webhook
     * @param {object} webhook - Webhook data
     * @returns {object} Created webhook
     */
    createWebhook(webhook) {
        const stmt = this.db.prepare(`
            INSERT INTO webhooks 
            (id, name, description, url, method, headers, event_types, enabled, secret, verify_ssl, timeout_ms, retry_count, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `);

        stmt.run(
            webhook.id,
            webhook.name,
            webhook.description || null,
            webhook.url,
            webhook.method || 'POST',
            webhook.headers ? JSON.stringify(webhook.headers) : null,
            JSON.stringify(webhook.event_types),
            webhook.enabled !== false ? 1 : 0,
            webhook.secret || null,
            webhook.verify_ssl !== false ? 1 : 0,
            webhook.timeout_ms || 30000,
            webhook.retry_count || 3,
            webhook.created_by
        );

        return this.getWebhook(webhook.id);
    }

    /**
     * Get webhook by ID
     * @param {string} id - Webhook ID
     * @returns {object|null} Webhook or null
     */
    getWebhook(id) {
        const stmt = this.db.prepare('SELECT * FROM webhooks WHERE id = ?');
        const webhook = stmt.get(id);
        
        if (webhook) {
            webhook.enabled = Boolean(webhook.enabled);
            webhook.verify_ssl = Boolean(webhook.verify_ssl);
            webhook.headers = webhook.headers ? JSON.parse(webhook.headers) : {};
            webhook.event_types = JSON.parse(webhook.event_types);
        }
        
        return webhook;
    }

    /**
     * Get all webhooks
     * @param {boolean} enabledOnly - Return only enabled webhooks
     * @returns {Array} Array of webhooks
     */
    getAllWebhooks(enabledOnly = false) {
        let query = 'SELECT * FROM webhooks';
        
        if (enabledOnly) {
            query += ' WHERE enabled = 1';
        }
        
        query += ' ORDER BY created_at DESC';
        
        const stmt = this.db.prepare(query);
        const webhooks = stmt.all();
        
        return webhooks.map(webhook => ({
            ...webhook,
            enabled: Boolean(webhook.enabled),
            verify_ssl: Boolean(webhook.verify_ssl),
            headers: webhook.headers ? JSON.parse(webhook.headers) : {},
            event_types: JSON.parse(webhook.event_types)
        }));
    }

    /**
     * Update webhook
     * @param {string} id - Webhook ID
     * @param {object} updates - Fields to update
     * @returns {object|null} Updated webhook or null
     */
    updateWebhook(id, updates) {
        const fields = [];
        const values = [];

        if (updates.name !== undefined) {
            fields.push('name = ?');
            values.push(updates.name);
        }

        if (updates.description !== undefined) {
            fields.push('description = ?');
            values.push(updates.description);
        }

        if (updates.url !== undefined) {
            fields.push('url = ?');
            values.push(updates.url);
        }

        if (updates.method !== undefined) {
            fields.push('method = ?');
            values.push(updates.method);
        }

        if (updates.headers !== undefined) {
            fields.push('headers = ?');
            values.push(JSON.stringify(updates.headers));
        }

        if (updates.event_types !== undefined) {
            fields.push('event_types = ?');
            values.push(JSON.stringify(updates.event_types));
        }

        if (updates.enabled !== undefined) {
            fields.push('enabled = ?');
            values.push(updates.enabled ? 1 : 0);
        }

        if (updates.secret !== undefined) {
            fields.push('secret = ?');
            values.push(updates.secret);
        }

        if (updates.verify_ssl !== undefined) {
            fields.push('verify_ssl = ?');
            values.push(updates.verify_ssl ? 1 : 0);
        }

        if (updates.timeout_ms !== undefined) {
            fields.push('timeout_ms = ?');
            values.push(updates.timeout_ms);
        }

        if (updates.retry_count !== undefined) {
            fields.push('retry_count = ?');
            values.push(updates.retry_count);
        }

        if (fields.length === 0) {
            return this.getWebhook(id);
        }

        fields.push('updated_at = datetime(\'now\')');
        values.push(id);

        const stmt = this.db.prepare(`
            UPDATE webhooks 
            SET ${fields.join(', ')}
            WHERE id = ?
        `);

        stmt.run(...values);

        return this.getWebhook(id);
    }

    /**
     * Delete webhook
     * @param {string} id - Webhook ID
     * @returns {boolean} Success
     */
    deleteWebhook(id) {
        const stmt = this.db.prepare('DELETE FROM webhooks WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    /**
     * Update webhook stats after trigger
     * @param {string} id - Webhook ID
     * @param {boolean} success - Whether the trigger was successful
     */
    updateWebhookStats(id, success) {
        const failureIncrement = success ? 0 : 1;
        const stmt = this.db.prepare(`
            UPDATE webhooks 
            SET last_triggered = datetime('now'),
                trigger_count = trigger_count + 1,
                failure_count = failure_count + ?
            WHERE id = ?
        `);

        stmt.run(failureIncrement, id);
    }

    /**
     * Create webhook delivery log
     * @param {object} log - Log data
     * @returns {number} Log ID
     */
    createWebhookLog(log) {
        const stmt = this.db.prepare(`
            INSERT INTO webhook_logs 
            (webhook_id, webhook_name, event_type, event_data, url, request_payload, request_headers, response_status, response_body, response_time_ms, attempt_number, success, error_message, triggered_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `);

        const result = stmt.run(
            log.webhook_id,
            log.webhook_name,
            log.event_type,
            log.event_data ? JSON.stringify(log.event_data) : null,
            log.url,
            log.request_payload ? JSON.stringify(log.request_payload) : null,
            log.request_headers ? JSON.stringify(log.request_headers) : null,
            log.response_status || null,
            log.response_body || null,
            log.response_time_ms || null,
            log.attempt_number || 1,
            log.success ? 1 : 0,
            log.error_message || null
        );

        return result.lastInsertRowid;
    }

    /**
     * Get webhook logs
     * @param {object} options - Filter options
     * @returns {Array} Array of logs
     */
    getWebhookLogs(options = {}) {
        let query = 'SELECT * FROM webhook_logs';
        const conditions = [];
        const values = [];

        if (options.webhook_id) {
            conditions.push('webhook_id = ?');
            values.push(options.webhook_id);
        }

        if (options.success !== undefined) {
            conditions.push('success = ?');
            values.push(options.success ? 1 : 0);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY triggered_at DESC';

        if (options.limit) {
            query += ' LIMIT ?';
            values.push(options.limit);
        } else {
            query += ' LIMIT 100';
        }

        const stmt = this.db.prepare(query);
        const logs = stmt.all(...values);

        return logs.map(log => ({
            ...log,
            event_data: log.event_data ? JSON.parse(log.event_data) : null,
            request_payload: log.request_payload ? JSON.parse(log.request_payload) : null,
            request_headers: log.request_headers ? JSON.parse(log.request_headers) : null,
            success: Boolean(log.success)
        }));
    }

    /**
     * Create inbound webhook
     * @param {object} webhook - Inbound webhook data
     * @returns {object} Created webhook
     */
    createInboundWebhook(webhook) {
        const stmt = this.db.prepare(`
            INSERT INTO inbound_webhooks 
            (id, name, description, secret, allowed_ips, actions, permissions_required, enabled, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `);

        stmt.run(
            webhook.id,
            webhook.name,
            webhook.description || null,
            webhook.secret,
            webhook.allowed_ips ? JSON.stringify(webhook.allowed_ips) : null,
            JSON.stringify(webhook.actions),
            JSON.stringify(webhook.permissions_required),
            webhook.enabled !== false ? 1 : 0,
            webhook.created_by
        );

        return this.getInboundWebhook(webhook.id);
    }

    /**
     * Get inbound webhook by ID
     * @param {string} id - Webhook ID
     * @returns {object|null} Webhook or null
     */
    getInboundWebhook(id) {
        const stmt = this.db.prepare('SELECT * FROM inbound_webhooks WHERE id = ?');
        const webhook = stmt.get(id);
        
        if (webhook) {
            webhook.enabled = Boolean(webhook.enabled);
            webhook.allowed_ips = webhook.allowed_ips ? JSON.parse(webhook.allowed_ips) : null;
            webhook.actions = JSON.parse(webhook.actions);
            webhook.permissions_required = JSON.parse(webhook.permissions_required);
        }
        
        return webhook;
    }

    /**
     * Get all inbound webhooks
     * @param {boolean} enabledOnly - Return only enabled webhooks
     * @returns {Array} Array of inbound webhooks
     */
    getAllInboundWebhooks(enabledOnly = false) {
        let query = 'SELECT * FROM inbound_webhooks';
        
        if (enabledOnly) {
            query += ' WHERE enabled = 1';
        }
        
        query += ' ORDER BY created_at DESC';
        
        const stmt = this.db.prepare(query);
        const webhooks = stmt.all();
        
        return webhooks.map(webhook => ({
            ...webhook,
            enabled: Boolean(webhook.enabled),
            allowed_ips: webhook.allowed_ips ? JSON.parse(webhook.allowed_ips) : null,
            actions: JSON.parse(webhook.actions),
            permissions_required: JSON.parse(webhook.permissions_required)
        }));
    }

    /**
     * Update inbound webhook
     * @param {string} id - Webhook ID
     * @param {object} updates - Fields to update
     * @returns {object|null} Updated webhook or null
     */
    updateInboundWebhook(id, updates) {
        const fields = [];
        const values = [];

        if (updates.name !== undefined) {
            fields.push('name = ?');
            values.push(updates.name);
        }

        if (updates.description !== undefined) {
            fields.push('description = ?');
            values.push(updates.description);
        }

        if (updates.secret !== undefined) {
            fields.push('secret = ?');
            values.push(updates.secret);
        }

        if (updates.allowed_ips !== undefined) {
            fields.push('allowed_ips = ?');
            values.push(updates.allowed_ips ? JSON.stringify(updates.allowed_ips) : null);
        }

        if (updates.actions !== undefined) {
            fields.push('actions = ?');
            values.push(JSON.stringify(updates.actions));
        }

        if (updates.permissions_required !== undefined) {
            fields.push('permissions_required = ?');
            values.push(JSON.stringify(updates.permissions_required));
        }

        if (updates.enabled !== undefined) {
            fields.push('enabled = ?');
            values.push(updates.enabled ? 1 : 0);
        }

        if (fields.length === 0) {
            return this.getInboundWebhook(id);
        }

        fields.push('updated_at = datetime(\'now\')');
        values.push(id);

        const stmt = this.db.prepare(`
            UPDATE inbound_webhooks 
            SET ${fields.join(', ')}
            WHERE id = ?
        `);

        stmt.run(...values);

        return this.getInboundWebhook(id);
    }

    /**
     * Delete inbound webhook
     * @param {string} id - Webhook ID
     * @returns {boolean} Success
     */
    deleteInboundWebhook(id) {
        const stmt = this.db.prepare('DELETE FROM inbound_webhooks WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    /**
     * Update inbound webhook usage stats
     * @param {string} id - Webhook ID
     */
    updateInboundWebhookStats(id) {
        const stmt = this.db.prepare(`
            UPDATE inbound_webhooks 
            SET last_used = datetime('now'),
                use_count = use_count + 1
            WHERE id = ?
        `);

        stmt.run(id);
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
