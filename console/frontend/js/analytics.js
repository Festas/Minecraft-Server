/**
 * Analytics Dashboard JavaScript
 * Handles data fetching, visualization, and interaction for server analytics
 */

class AnalyticsDashboard {
    constructor() {
        this.currentFilters = {
            startDate: null,
            endDate: null
        };
        this.currentTab = 'players';
        this.init();
    }

    async init() {
        // Check authentication
        await this.checkAuth();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load initial data
        await this.loadDashboard();
        
        // Setup auto-refresh (every 5 minutes)
        setInterval(() => this.loadDashboard(), 5 * 60 * 1000);
    }

    async checkAuth() {
        try {
            const response = await fetch('/api/status', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                window.location.href = '/console/login.html';
                return;
            }
            
            const data = await response.json();
            if (data.user) {
                document.getElementById('currentUser').textContent = `${data.user.username} (${data.user.role})`;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = '/console/login.html';
        }
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.analytics-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Date filter
        document.getElementById('applyFilter').addEventListener('click', () => {
            this.applyDateFilter();
        });

        document.getElementById('clearFilter').addEventListener('click', () => {
            this.clearDateFilter();
        });

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadDashboard();
        });

        // Settings button
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.switchTab('privacy');
        });

        // Privacy settings
        document.getElementById('savePrivacySettings').addEventListener('click', () => {
            this.savePrivacySettings();
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.analytics-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`).classList.add('active');

        this.currentTab = tabName;

        // Load data for the tab if needed
        if (tabName === 'privacy') {
            this.loadPrivacySettings();
        }
    }

    applyDateFilter() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        this.currentFilters.startDate = startDate || null;
        this.currentFilters.endDate = endDate || null;

        this.loadDashboard();
    }

    clearDateFilter() {
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
        this.currentFilters.startDate = null;
        this.currentFilters.endDate = null;

        this.loadDashboard();
    }

    async loadDashboard() {
        try {
            await Promise.all([
                this.loadOverviewStats(),
                this.loadPlayerAnalytics(),
                this.loadServerHealth(),
                this.loadPluginUsage()
            ]);
        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showError('Failed to load analytics data');
        }
    }

    async loadOverviewStats() {
        try {
            const params = new URLSearchParams();
            if (this.currentFilters.startDate) params.append('startDate', this.currentFilters.startDate);
            if (this.currentFilters.endDate) params.append('endDate', this.currentFilters.endDate);

            const response = await fetch(`/api/analytics/dashboard?${params}`, {
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to fetch dashboard stats');

            const data = await response.json();
            this.renderOverviewStats(data.stats);
        } catch (error) {
            console.error('Error loading overview stats:', error);
        }
    }

    renderOverviewStats(stats) {
        const container = document.getElementById('statsOverview');
        container.innerHTML = `
            <div class="stat-card">
                <div class="stat-card-icon">👥</div>
                <div class="stat-card-label">Unique Players</div>
                <div class="stat-card-value">${stats.players?.unique_players || 0}</div>
                <div class="stat-card-subtitle">${stats.players?.total_events || 0} events</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-icon">💻</div>
                <div class="stat-card-label">Avg TPS</div>
                <div class="stat-card-value">${(stats.server?.avg_tps || 0).toFixed(1)}</div>
                <div class="stat-card-subtitle">Server Performance</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-icon">🧠</div>
                <div class="stat-card-label">Avg Memory</div>
                <div class="stat-card-value">${(stats.server?.avg_memory || 0).toFixed(1)}%</div>
                <div class="stat-card-subtitle">CPU: ${(stats.server?.avg_cpu || 0).toFixed(1)}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-icon">🔌</div>
                <div class="stat-card-label">Active Plugins</div>
                <div class="stat-card-value">${stats.plugins?.active_plugins || 0}</div>
                <div class="stat-card-subtitle">${stats.plugins?.total_plugin_events || 0} events</div>
            </div>
        `;
    }

    async loadPlayerAnalytics() {
        try {
            const params = new URLSearchParams();
            if (this.currentFilters.startDate) params.append('startDate', this.currentFilters.startDate);
            if (this.currentFilters.endDate) params.append('endDate', this.currentFilters.endDate);

            const response = await fetch(`/api/analytics/players?${params}`, {
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to fetch player analytics');

            const result = await response.json();
            this.renderPlayerAnalytics(result.data);
        } catch (error) {
            console.error('Error loading player analytics:', error);
        }
    }

    renderPlayerAnalytics(data) {
        // Top Players Table
        const topPlayersContainer = document.getElementById('topPlayersContainer');
        if (data.topPlayers && data.topPlayers.length > 0) {
            topPlayersContainer.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Player</th>
                            <th>Events</th>
                            <th>Last Seen</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.topPlayers.map((player, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>
                                    <img src="https://crafatar.com/avatars/${player.player_uuid}?size=24&overlay" 
                                         alt="${player.player_username}" 
                                         style="width: 24px; height: 24px; vertical-align: middle; margin-right: 8px;">
                                    ${this.escapeHtml(player.player_username)}
                                </td>
                                <td>${player.event_count}</td>
                                <td>${this.formatDate(player.last_seen)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            topPlayersContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><p>No player data available</p></div>';
        }

        // Event Types Distribution
        const eventTypesContainer = document.getElementById('eventTypesContainer');
        if (data.eventsByType && data.eventsByType.length > 0) {
            eventTypesContainer.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Event Type</th>
                            <th>Count</th>
                            <th>Percentage</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.eventsByType.map(event => {
                            const total = data.eventsByType.reduce((sum, e) => sum + e.count, 0);
                            const percentage = ((event.count / total) * 100).toFixed(1);
                            return `
                                <tr>
                                    <td>${this.escapeHtml(event.event_type)}</td>
                                    <td>${event.count}</td>
                                    <td>${percentage}%</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        } else {
            eventTypesContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><p>No event data available</p></div>';
        }
    }

    async loadServerHealth() {
        try {
            const params = new URLSearchParams();
            if (this.currentFilters.startDate) params.append('startDate', this.currentFilters.startDate);
            if (this.currentFilters.endDate) params.append('endDate', this.currentFilters.endDate);

            const response = await fetch(`/api/analytics/server?${params}`, {
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to fetch server health');

            const result = await response.json();
            this.renderServerHealth(result.data);
        } catch (error) {
            console.error('Error loading server health:', error);
        }
    }

    renderServerHealth(data) {
        // Server Summary
        const summaryContainer = document.getElementById('serverSummaryContainer');
        if (data.summary) {
            const s = data.summary;
            summaryContainer.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Average</th>
                            <th>Maximum</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>CPU Usage</td>
                            <td>${(s.avg_cpu || 0).toFixed(1)}%</td>
                            <td>${(s.max_cpu || 0).toFixed(1)}%</td>
                        </tr>
                        <tr>
                            <td>Memory Usage</td>
                            <td>${(s.avg_memory || 0).toFixed(1)}%</td>
                            <td>${(s.max_memory || 0).toFixed(1)}%</td>
                        </tr>
                        <tr>
                            <td>TPS</td>
                            <td>${(s.avg_tps || 0).toFixed(1)}</td>
                            <td>${(s.min_tps || 0).toFixed(1)} (min)</td>
                        </tr>
                        <tr>
                            <td>Players</td>
                            <td>${(s.avg_players || 0).toFixed(1)}</td>
                            <td>${s.max_players || 0}</td>
                        </tr>
                    </tbody>
                </table>
            `;
        } else {
            summaryContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🖥️</div><p>No server metrics available</p></div>';
        }
    }

    async loadPluginUsage() {
        try {
            const params = new URLSearchParams();
            if (this.currentFilters.startDate) params.append('startDate', this.currentFilters.startDate);
            if (this.currentFilters.endDate) params.append('endDate', this.currentFilters.endDate);

            const response = await fetch(`/api/analytics/plugins?${params}`, {
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to fetch plugin usage');

            const result = await response.json();
            this.renderPluginUsage(result.data);
        } catch (error) {
            console.error('Error loading plugin usage:', error);
        }
    }

    renderPluginUsage(data) {
        // Plugin Usage Table
        const pluginContainer = document.getElementById('pluginUsageContainer');
        if (data.usageByPlugin && data.usageByPlugin.length > 0) {
            pluginContainer.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Plugin</th>
                            <th>Version</th>
                            <th>Events</th>
                            <th>Last Activity</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.usageByPlugin.map(plugin => `
                            <tr>
                                <td>${this.escapeHtml(plugin.plugin_name)}</td>
                                <td>${this.escapeHtml(plugin.plugin_version || 'N/A')}</td>
                                <td>${plugin.event_count}</td>
                                <td>${this.formatDate(plugin.last_activity)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            pluginContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔌</div><p>No plugin data available</p></div>';
        }

        // Plugin Events Table
        const eventsContainer = document.getElementById('pluginEventsContainer');
        if (data.usageByEventType && data.usageByEventType.length > 0) {
            eventsContainer.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Event Type</th>
                            <th>Count</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.usageByEventType.map(event => `
                            <tr>
                                <td>${this.escapeHtml(event.event_type)}</td>
                                <td>${event.count}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            eventsContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><p>No plugin event data available</p></div>';
        }
    }

    async loadPrivacySettings() {
        try {
            const response = await fetch('/api/analytics/settings', {
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to fetch privacy settings');

            const result = await response.json();
            const settings = result.settings;

            document.getElementById('collectPlayerData').checked = settings.collectPlayerData;
            document.getElementById('collectServerMetrics').checked = settings.collectServerMetrics;
            document.getElementById('collectPluginData').checked = settings.collectPluginData;
            document.getElementById('retentionDays').value = settings.retentionDays;
        } catch (error) {
            console.error('Error loading privacy settings:', error);
            this.showError('Failed to load privacy settings');
        }
    }

    async savePrivacySettings() {
        try {
            const settings = {
                collectPlayerData: document.getElementById('collectPlayerData').checked,
                collectServerMetrics: document.getElementById('collectServerMetrics').checked,
                collectPluginData: document.getElementById('collectPluginData').checked,
                retentionDays: parseInt(document.getElementById('retentionDays').value)
            };

            const response = await fetch('/api/analytics/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(settings)
            });

            if (!response.ok) throw new Error('Failed to save privacy settings');

            this.showSuccess('Privacy settings saved successfully');
        } catch (error) {
            console.error('Error saving privacy settings:', error);
            this.showError('Failed to save privacy settings');
        }
    }

    async exportData(dataType, format) {
        try {
            const params = new URLSearchParams({
                format: format,
                dataType: dataType
            });

            if (this.currentFilters.startDate) params.append('startDate', this.currentFilters.startDate);
            if (this.currentFilters.endDate) params.append('endDate', this.currentFilters.endDate);

            window.location.href = `/api/analytics/export?${params}`;
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showError('Failed to export data');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    showSuccess(message) {
        // Simple alert for now - could be replaced with toast notification
        alert(message);
    }

    showError(message) {
        // Simple alert for now - could be replaced with toast notification
        alert('Error: ' + message);
    }
}

// Initialize analytics dashboard when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.analytics = new AnalyticsDashboard();
    });
} else {
    window.analytics = new AnalyticsDashboard();
}
