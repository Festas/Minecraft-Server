/**
 * Analytics Service
 * 
 * Collects, aggregates, and serves analytics data for:
 * - Player activity and engagement
 * - Server health metrics (CPU, RAM, TPS)
 * - Plugin usage statistics
 * 
 * Features:
 * - Real-time and historical data aggregation
 * - Privacy-aware data collection with opt-out support
 * - Efficient querying with time-based filtering
 * - Export capabilities (CSV, JSON)
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class AnalyticsService {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, '../data/analytics.db');
        this.privacySettings = {
            collectPlayerData: true,
            collectServerMetrics: true,
            collectPluginData: true,
            retentionDays: 90
        };
    }

    /**
     * Initialize the analytics database
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
            
            // Load privacy settings
            this.loadPrivacySettings();
            
            console.log(`Analytics database initialized at ${this.dbPath}`);
        } catch (error) {
            console.error('Error initializing analytics database:', error);
            throw error;
        }
    }

    /**
     * Create analytics database schema
     */
    createSchema() {
        // Table for player activity events
        const createPlayerEventsTable = `
            CREATE TABLE IF NOT EXISTS player_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_uuid TEXT NOT NULL,
                player_username TEXT NOT NULL,
                event_type TEXT NOT NULL,
                event_data TEXT,
                timestamp TEXT NOT NULL
            )
        `;

        const createPlayerEventsIndexUuid = `
            CREATE INDEX IF NOT EXISTS idx_player_events_uuid ON player_events(player_uuid, timestamp DESC)
        `;

        const createPlayerEventsIndexTime = `
            CREATE INDEX IF NOT EXISTS idx_player_events_time ON player_events(timestamp DESC)
        `;

        const createPlayerEventsIndexType = `
            CREATE INDEX IF NOT EXISTS idx_player_events_type ON player_events(event_type, timestamp DESC)
        `;

        // Table for server health metrics
        const createServerMetricsTable = `
            CREATE TABLE IF NOT EXISTS server_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                cpu_percent REAL,
                memory_used_mb REAL,
                memory_total_mb REAL,
                memory_percent REAL,
                tps REAL,
                player_count INTEGER,
                world_size_mb REAL
            )
        `;

        const createServerMetricsIndexTime = `
            CREATE INDEX IF NOT EXISTS idx_server_metrics_time ON server_metrics(timestamp DESC)
        `;

        // Table for plugin usage statistics
        const createPluginStatsTable = `
            CREATE TABLE IF NOT EXISTS plugin_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                plugin_name TEXT NOT NULL,
                plugin_version TEXT,
                event_type TEXT NOT NULL,
                event_count INTEGER DEFAULT 1,
                timestamp TEXT NOT NULL
            )
        `;

        const createPluginStatsIndexPlugin = `
            CREATE INDEX IF NOT EXISTS idx_plugin_stats_plugin ON plugin_stats(plugin_name, timestamp DESC)
        `;

        const createPluginStatsIndexTime = `
            CREATE INDEX IF NOT EXISTS idx_plugin_stats_time ON plugin_stats(timestamp DESC)
        `;

        // Table for privacy settings
        const createPrivacySettingsTable = `
            CREATE TABLE IF NOT EXISTS privacy_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        `;

        // Execute all schema creation statements
        this.db.exec(createPlayerEventsTable);
        this.db.exec(createPlayerEventsIndexUuid);
        this.db.exec(createPlayerEventsIndexTime);
        this.db.exec(createPlayerEventsIndexType);
        this.db.exec(createServerMetricsTable);
        this.db.exec(createServerMetricsIndexTime);
        this.db.exec(createPluginStatsTable);
        this.db.exec(createPluginStatsIndexPlugin);
        this.db.exec(createPluginStatsIndexTime);
        this.db.exec(createPrivacySettingsTable);
    }

    /**
     * Load privacy settings from database
     */
    loadPrivacySettings() {
        const stmt = this.db.prepare('SELECT key, value FROM privacy_settings');
        const rows = stmt.all();
        
        rows.forEach(row => {
            const key = row.key;
            const value = row.value === 'true' ? true : 
                         row.value === 'false' ? false : 
                         isNaN(row.value) ? row.value : Number(row.value);
            this.privacySettings[key] = value;
        });
    }

    /**
     * Update privacy settings
     */
    updatePrivacySettings(settings) {
        const allowedKeys = ['collectPlayerData', 'collectServerMetrics', 'collectPluginData', 'retentionDays'];
        const timestamp = new Date().toISOString();

        const stmt = this.db.prepare(`
            INSERT INTO privacy_settings (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at
        `);

        for (const [key, value] of Object.entries(settings)) {
            if (allowedKeys.includes(key)) {
                stmt.run(key, String(value), timestamp);
                this.privacySettings[key] = value;
            }
        }

        return this.privacySettings;
    }

    /**
     * Get current privacy settings
     */
    getPrivacySettings() {
        return { ...this.privacySettings };
    }

    /**
     * Record a player event
     */
    recordPlayerEvent(playerUuid, playerUsername, eventType, eventData = null) {
        if (!this.privacySettings.collectPlayerData) {
            return;
        }

        const stmt = this.db.prepare(`
            INSERT INTO player_events (player_uuid, player_username, event_type, event_data, timestamp)
            VALUES (?, ?, ?, ?, ?)
        `);

        const timestamp = new Date().toISOString();
        const dataJson = eventData ? JSON.stringify(eventData) : null;
        
        stmt.run(playerUuid, playerUsername, eventType, dataJson, timestamp);
    }

    /**
     * Record server metrics
     */
    recordServerMetrics(metrics) {
        if (!this.privacySettings.collectServerMetrics) {
            return;
        }

        const stmt = this.db.prepare(`
            INSERT INTO server_metrics (
                timestamp, cpu_percent, memory_used_mb, memory_total_mb, 
                memory_percent, tps, player_count, world_size_mb
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const timestamp = new Date().toISOString();
        stmt.run(
            timestamp,
            metrics.cpu_percent || null,
            metrics.memory_used_mb || null,
            metrics.memory_total_mb || null,
            metrics.memory_percent || null,
            metrics.tps || null,
            metrics.player_count || null,
            metrics.world_size_mb || null
        );
    }

    /**
     * Record plugin usage
     */
    recordPluginUsage(pluginName, pluginVersion, eventType) {
        if (!this.privacySettings.collectPluginData) {
            return;
        }

        const stmt = this.db.prepare(`
            INSERT INTO plugin_stats (plugin_name, plugin_version, event_type, timestamp)
            VALUES (?, ?, ?, ?)
        `);

        const timestamp = new Date().toISOString();
        stmt.run(pluginName, pluginVersion || null, eventType, timestamp);
    }

    /**
     * Get dashboard overview statistics
     */
    getDashboardStats(startDate = null, endDate = null) {
        const timeFilter = this.buildTimeFilter(startDate, endDate);
        
        // Player stats
        const playerStats = this.db.prepare(`
            SELECT 
                COUNT(DISTINCT player_uuid) as unique_players,
                COUNT(*) as total_events
            FROM player_events
            ${timeFilter.where}
        `).get(timeFilter.params);

        // Server uptime and health
        const serverStats = this.db.prepare(`
            SELECT 
                AVG(cpu_percent) as avg_cpu,
                AVG(memory_percent) as avg_memory,
                AVG(tps) as avg_tps,
                AVG(player_count) as avg_players
            FROM server_metrics
            ${timeFilter.where}
        `).get(timeFilter.params);

        // Plugin usage
        const pluginStats = this.db.prepare(`
            SELECT 
                COUNT(DISTINCT plugin_name) as active_plugins,
                COUNT(*) as total_plugin_events
            FROM plugin_stats
            ${timeFilter.where}
        `).get(timeFilter.params);

        return {
            players: playerStats,
            server: serverStats,
            plugins: pluginStats
        };
    }

    /**
     * Get player activity analytics
     */
    getPlayerActivity(startDate = null, endDate = null) {
        const timeFilter = this.buildTimeFilter(startDate, endDate);

        // Top players by activity
        const topPlayers = this.db.prepare(`
            SELECT 
                player_username,
                player_uuid,
                COUNT(*) as event_count,
                MAX(timestamp) as last_seen
            FROM player_events
            ${timeFilter.where}
            GROUP BY player_uuid
            ORDER BY event_count DESC
            LIMIT 10
        `).all(timeFilter.params);

        // Events by type
        const eventsByType = this.db.prepare(`
            SELECT 
                event_type,
                COUNT(*) as count
            FROM player_events
            ${timeFilter.where}
            GROUP BY event_type
            ORDER BY count DESC
        `).all(timeFilter.params);

        // Activity over time (daily)
        const activityOverTime = this.db.prepare(`
            SELECT 
                DATE(timestamp) as date,
                COUNT(*) as event_count,
                COUNT(DISTINCT player_uuid) as unique_players
            FROM player_events
            ${timeFilter.where}
            GROUP BY DATE(timestamp)
            ORDER BY date DESC
            LIMIT 30
        `).all(timeFilter.params);

        return {
            topPlayers,
            eventsByType,
            activityOverTime
        };
    }

    /**
     * Get server health analytics
     */
    getServerHealth(startDate = null, endDate = null) {
        const timeFilter = this.buildTimeFilter(startDate, endDate);

        // Recent metrics
        const recentMetrics = this.db.prepare(`
            SELECT 
                timestamp,
                cpu_percent,
                memory_percent,
                tps,
                player_count
            FROM server_metrics
            ${timeFilter.where}
            ORDER BY timestamp DESC
            LIMIT 100
        `).all(timeFilter.params);

        // Summary statistics
        const summary = this.db.prepare(`
            SELECT 
                AVG(cpu_percent) as avg_cpu,
                MAX(cpu_percent) as max_cpu,
                AVG(memory_percent) as avg_memory,
                MAX(memory_percent) as max_memory,
                AVG(tps) as avg_tps,
                MIN(tps) as min_tps,
                AVG(player_count) as avg_players,
                MAX(player_count) as max_players
            FROM server_metrics
            ${timeFilter.where}
        `).get(timeFilter.params);

        return {
            recentMetrics: recentMetrics.reverse(), // Chronological order
            summary
        };
    }

    /**
     * Get plugin usage analytics
     */
    getPluginUsage(startDate = null, endDate = null) {
        const timeFilter = this.buildTimeFilter(startDate, endDate);

        // Usage by plugin
        const usageByPlugin = this.db.prepare(`
            SELECT 
                plugin_name,
                plugin_version,
                COUNT(*) as event_count,
                MAX(timestamp) as last_activity
            FROM plugin_stats
            ${timeFilter.where}
            GROUP BY plugin_name, plugin_version
            ORDER BY event_count DESC
        `).all(timeFilter.params);

        // Usage by event type
        const usageByEventType = this.db.prepare(`
            SELECT 
                event_type,
                COUNT(*) as count
            FROM plugin_stats
            ${timeFilter.where}
            GROUP BY event_type
            ORDER BY count DESC
        `).all(timeFilter.params);

        return {
            usageByPlugin,
            usageByEventType
        };
    }

    /**
     * Build time filter for queries
     */
    buildTimeFilter(startDate, endDate) {
        const conditions = [];
        const params = [];

        if (startDate) {
            conditions.push('timestamp >= ?');
            params.push(new Date(startDate).toISOString());
        }

        if (endDate) {
            conditions.push('timestamp <= ?');
            params.push(new Date(endDate).toISOString());
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        
        return { where, params };
    }

    /**
     * Export analytics data
     */
    exportData(format, dataType, startDate = null, endDate = null) {
        let data;

        switch (dataType) {
            case 'players':
                data = this.getPlayerActivity(startDate, endDate);
                break;
            case 'server':
                data = this.getServerHealth(startDate, endDate);
                break;
            case 'plugins':
                data = this.getPluginUsage(startDate, endDate);
                break;
            default:
                data = this.getDashboardStats(startDate, endDate);
        }

        if (format === 'csv') {
            return this.convertToCSV(data, dataType);
        }

        return data; // JSON format
    }

    /**
     * Convert data to CSV format
     */
    convertToCSV(data, dataType) {
        const rows = [];

        if (dataType === 'players' && data.topPlayers) {
            rows.push(['Username', 'UUID', 'Event Count', 'Last Seen']);
            data.topPlayers.forEach(player => {
                rows.push([
                    player.player_username,
                    player.player_uuid,
                    player.event_count,
                    player.last_seen
                ]);
            });
        } else if (dataType === 'server' && data.recentMetrics) {
            rows.push(['Timestamp', 'CPU %', 'Memory %', 'TPS', 'Players']);
            data.recentMetrics.forEach(metric => {
                rows.push([
                    metric.timestamp,
                    metric.cpu_percent || 'N/A',
                    metric.memory_percent || 'N/A',
                    metric.tps || 'N/A',
                    metric.player_count || 0
                ]);
            });
        } else if (dataType === 'plugins' && data.usageByPlugin) {
            rows.push(['Plugin Name', 'Version', 'Event Count', 'Last Activity']);
            data.usageByPlugin.forEach(plugin => {
                rows.push([
                    plugin.plugin_name,
                    plugin.plugin_version || 'N/A',
                    plugin.event_count,
                    plugin.last_activity
                ]);
            });
        }

        return rows.map(row => row.join(',')).join('\n');
    }

    /**
     * Clean old data based on retention policy
     */
    cleanOldData() {
        const retentionDate = new Date();
        retentionDate.setDate(retentionDate.getDate() - this.privacySettings.retentionDays);
        const cutoffDate = retentionDate.toISOString();

        const deletePlayerEvents = this.db.prepare('DELETE FROM player_events WHERE timestamp < ?');
        const deleteServerMetrics = this.db.prepare('DELETE FROM server_metrics WHERE timestamp < ?');
        const deletePluginStats = this.db.prepare('DELETE FROM plugin_stats WHERE timestamp < ?');

        const playerDeleted = deletePlayerEvents.run(cutoffDate).changes;
        const serverDeleted = deleteServerMetrics.run(cutoffDate).changes;
        const pluginDeleted = deletePluginStats.run(cutoffDate).changes;

        console.log(`Analytics cleanup: Removed ${playerDeleted} player events, ${serverDeleted} server metrics, ${pluginDeleted} plugin stats`);

        return {
            playerEventsDeleted: playerDeleted,
            serverMetricsDeleted: serverDeleted,
            pluginStatsDeleted: pluginDeleted
        };
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = new AnalyticsService();
