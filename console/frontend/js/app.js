// Main application initialization
let statsInterval = null;

// Constants for metrics thresholds
const DEFAULT_TPS = 20;
const TPS_HEALTHY_THRESHOLD = 19;
const TPS_WARNING_THRESHOLD = 15;
const RESOURCE_CRITICAL_THRESHOLD = 90;
const RESOURCE_WARNING_THRESHOLD = 75;

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    checkAuth();
    
    // Fetch CSRF token (from utils.js)
    fetchCsrfToken();
    
    // Initialize WebSocket
    initializeWebSocket();
    
    // Load command history
    loadCommandHistory();
    
    // Set up navigation
    setupNavigation();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize data-href navigation (CSP compliant)
    initializeDataHrefNavigation();
    
    // Start stats polling
    startStatsPolling();
    
    // Initial data load
    loadDashboard();
    loadPlayers();
});

async function checkAuth() {
    try {
        const response = await fetch('/api/session', {
            credentials: 'same-origin'
        });
        const data = await response.json();
        
        if (!data.authenticated) {
            window.location.href = '/console/login.html';
            return;
        }
        
        // Store user info globally for RBAC checks
        window.currentUser = {
            username: data.username,
            role: data.role
        };
        
        const userBadge = document.getElementById('currentUser');
        if (userBadge) {
            const roleDisplay = data.role ? ` (${capitalizeFirstLetter(data.role)})` : '';
            userBadge.textContent = (data.username || 'Admin') + roleDisplay;
        }
        
        // Show user management button for Owners only
        if (data.role === 'owner') {
            const userMgmtBtn = document.getElementById('userManagementBtn');
            if (userMgmtBtn) {
                userMgmtBtn.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/console/login.html';
    }
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetSection = item.dataset.section;
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Show target section
            sections.forEach(section => {
                if (section.id === targetSection) {
                    section.classList.add('active');
                    
                    // Load data when switching to players section
                    if (targetSection === 'players') {
                        loadPlayers();
                        loadWhitelist();
                        loadActionHistory();
                    }
                } else {
                    section.classList.remove('active');
                }
            });
        });
    });
}

function setupEventListeners() {
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Server controls
    const startBtn = document.getElementById('startBtn');
    if (startBtn) startBtn.addEventListener('click', () => controlServer('start'));
    
    const stopBtn = document.getElementById('stopBtn');
    if (stopBtn) stopBtn.addEventListener('click', () => controlServer('stop'));
    
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) restartBtn.addEventListener('click', () => controlServer('restart'));
    
    const killBtn = document.getElementById('killBtn');
    if (killBtn) killBtn.addEventListener('click', () => controlServer('kill'));
    
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) saveBtn.addEventListener('click', () => controlServer('save'));
    
    const backupBtn = document.getElementById('backupBtn');
    if (backupBtn) backupBtn.addEventListener('click', () => controlServer('backup'));
    
    // Console controls
    const pauseLogsBtn = document.getElementById('pauseLogsBtn');
    if (pauseLogsBtn) pauseLogsBtn.addEventListener('click', togglePauseLogs);
    
    const clearLogsBtn = document.getElementById('clearLogsBtn');
    if (clearLogsBtn) clearLogsBtn.addEventListener('click', clearLogs);
    
    const downloadLogsBtn = document.getElementById('downloadLogsBtn');
    if (downloadLogsBtn) downloadLogsBtn.addEventListener('click', downloadLogs);
    
    // Command input
    const commandInput = document.getElementById('commandInput');
    const sendCommandBtn = document.getElementById('sendCommandBtn');
    
    if (commandInput) {
        commandInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const command = commandInput.value;
                if (command) {
                    executeCommand(command);
                    commandInput.value = '';
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const cmd = navigateHistory('up');
                if (cmd !== null) commandInput.value = cmd;
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const cmd = navigateHistory('down');
                if (cmd !== null) commandInput.value = cmd;
            }
        });
    }
    
    if (sendCommandBtn) {
        sendCommandBtn.addEventListener('click', () => {
            const command = commandInput.value;
            if (command) {
                executeCommand(command);
                commandInput.value = '';
            }
        });
    }
    
    // Log search
    const logSearchInput = document.getElementById('logSearchInput');
    if (logSearchInput) {
        logSearchInput.addEventListener('input', (e) => {
            searchLogs(e.target.value);
        });
    }
    
    // Player actions
    const kickPlayerBtn = document.getElementById('kickPlayerBtn');
    if (kickPlayerBtn) {
        kickPlayerBtn.addEventListener('click', () => {
            const player = document.getElementById('playerNameInput').value.trim();
            if (player) kickPlayer(player);
        });
    }
    
    const banPlayerBtn = document.getElementById('banPlayerBtn');
    if (banPlayerBtn) {
        banPlayerBtn.addEventListener('click', () => {
            const player = document.getElementById('playerNameInput').value.trim();
            if (player) banPlayer(player);
        });
    }
    
    const warnPlayerBtn = document.getElementById('warnPlayerBtn');
    if (warnPlayerBtn) {
        warnPlayerBtn.addEventListener('click', () => {
            const player = document.getElementById('playerNameInput').value.trim();
            if (player) warnPlayer(player);
        });
    }
    
    const mutePlayerBtn = document.getElementById('mutePlayerBtn');
    if (mutePlayerBtn) {
        mutePlayerBtn.addEventListener('click', () => {
            const player = document.getElementById('playerNameInput').value.trim();
            if (player) mutePlayer(player);
        });
    }
    
    const opPlayerBtn = document.getElementById('opPlayerBtn');
    if (opPlayerBtn) {
        opPlayerBtn.addEventListener('click', () => {
            const player = document.getElementById('playerNameInput').value.trim();
            if (player) opPlayer(player);
        });
    }
    
    const deopPlayerBtn = document.getElementById('deopPlayerBtn');
    if (deopPlayerBtn) {
        deopPlayerBtn.addEventListener('click', () => {
            const player = document.getElementById('playerNameInput').value.trim();
            if (player) deopPlayer(player);
        });
    }
    
    // Whitelist management
    const addToWhitelistBtn = document.getElementById('addToWhitelistBtn');
    if (addToWhitelistBtn) {
        addToWhitelistBtn.addEventListener('click', () => {
            const player = document.getElementById('whitelistPlayerInput').value.trim();
            const notes = document.getElementById('whitelistNotesInput').value.trim();
            if (player) addToWhitelist(player, notes);
        });
    }
    
    // Action history refresh
    const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
    if (refreshHistoryBtn) {
        refreshHistoryBtn.addEventListener('click', () => {
            loadActionHistory();
        });
    }
    
    // Quick commands
    const quickCommandBtns = document.querySelectorAll('.quick-commands .btn[data-command]');
    quickCommandBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const command = btn.dataset.command;
            executeCommand(command);
        });
    });
    
    // Broadcast button
    const broadcastBtn = document.getElementById('broadcastBtn');
    if (broadcastBtn) {
        broadcastBtn.addEventListener('click', async () => {
            const message = prompt('Enter message to broadcast:');
            if (message) {
                executeCommand(`say ${message}`);
            }
        });
    }
    
    // Difficulty
    const setDifficultyBtn = document.getElementById('setDifficultyBtn');
    if (setDifficultyBtn) {
        setDifficultyBtn.addEventListener('click', () => {
            const difficulty = document.getElementById('difficultySelect').value;
            executeCommand(`difficulty ${difficulty}`);
        });
    }
    
    // Gamemode
    const setGamemodeBtn = document.getElementById('setGamemodeBtn');
    if (setGamemodeBtn) {
        setGamemodeBtn.addEventListener('click', () => {
            const player = document.getElementById('gamemodePlayer').value;
            const mode = document.getElementById('gamemodeSelect').value;
            if (player) changeGamemode(player, mode);
        });
    }
    
    // Backups
    const createBackupBtn = document.getElementById('createBackupBtn');
    if (createBackupBtn) {
        createBackupBtn.addEventListener('click', () => {
            controlServer('backup');
        });
    }
}

async function logout() {
    try {
        await apiRequest('/api/logout', { method: 'POST' });
        window.location.href = '/console/login.html';
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

async function controlServer(action) {
    const needsConfirmation = ['stop', 'restart', 'kill', 'backup'];
    
    if (needsConfirmation.includes(action)) {
        const messages = {
            stop: 'Are you sure you want to stop the server?',
            restart: 'Are you sure you want to restart the server?',
            kill: 'WARNING: Force kill will stop the server without saving. Continue?',
            backup: 'Create a backup now? This will temporarily pause the server.'
        };
        
        const confirmed = await showConfirmation('Confirm Action', messages[action]);
        if (!confirmed) return;
    }
    
    try {
        const response = await apiRequest(`/api/server/${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ confirmed: true })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message || `${action} successful`, 'success');
            setTimeout(() => loadServerStatus(), 2000);
        } else {
            showNotification(data.error || `${action} failed`, 'error');
        }
    } catch (error) {
        showNotification(`Error: ${action} failed`, 'error');
    }
}

async function loadServerStatus() {
    try {
        const response = await fetch('/api/server/status', {
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load server status');
        }
        
        const data = await response.json();
        updateServerStatus(data);
    } catch (error) {
        console.error('Error loading server status:', error);
        // Update with empty stats to show offline/default values
        updateServerStatus({ status: 'offline' });
    }
}

function updateServerStatus(stats) {
    // Handle missing stats object
    if (!stats) {
        stats = {};
    }

    // Update RCON warning banner
    // Treat undefined/null as disconnected (safe default)
    const rconWarning = document.getElementById('rconWarning');
    if (rconWarning) {
        if (!stats.rconConnected && stats.status === 'online') {
            rconWarning.classList.remove('hidden');
        } else {
            rconWarning.classList.add('hidden');
        }
    }

    // Disable command controls if RCON is not connected
    // Treat undefined/null as disconnected (safe default)
    const commandInput = document.getElementById('commandInput');
    const sendCommandBtn = document.getElementById('sendCommandBtn');
    
    if (!stats.rconConnected) {
        if (commandInput) commandInput.disabled = true;
        if (sendCommandBtn) sendCommandBtn.disabled = true;
    } else {
        if (commandInput) commandInput.disabled = false;
        if (sendCommandBtn) sendCommandBtn.disabled = false;
    }

    // Update status indicator
    const statusIndicator = document.getElementById('serverStatus');
    const statusText = document.getElementById('serverStatusText');
    
    if (statusIndicator && statusText) {
        if (stats.status === 'online') {
            statusIndicator.classList.remove('offline');
            statusIndicator.classList.add('online');
            statusText.textContent = 'Online';
        } else {
            statusIndicator.classList.remove('online');
            statusIndicator.classList.add('offline');
            statusText.textContent = 'Offline';
        }
    }
    
    // Update player count with null checks
    if (stats.players) {
        updatePlayerCount(
            stats.players.online !== undefined ? stats.players.online : 0,
            stats.players.max !== undefined ? stats.players.max : 20
        );
    } else {
        updatePlayerCount(0, 20);
    }
    
    // Update TPS with null check and health colors
    const tpsEl = document.getElementById('tps');
    const tpsFill = document.getElementById('tpsFill');
    if (tpsEl) {
        const tpsValue = stats.tps !== undefined ? stats.tps : DEFAULT_TPS;
        tpsEl.textContent = tpsValue.toFixed(1);
        
        // Remove all health classes
        tpsEl.classList.remove('healthy', 'warning', 'critical');
        
        // Add appropriate health class
        if (tpsValue >= TPS_HEALTHY_THRESHOLD) {
            tpsEl.classList.add('healthy');
        } else if (tpsValue >= TPS_WARNING_THRESHOLD) {
            tpsEl.classList.add('warning');
        } else {
            tpsEl.classList.add('critical');
        }
        
        // Update TPS bar
        if (tpsFill) {
            const tpsPercentage = (tpsValue / 20) * 100;
            tpsFill.style.width = `${Math.min(tpsPercentage, 100)}%`;
            
            // Remove all state classes
            tpsFill.classList.remove('perfect', 'good', 'warning', 'critical');
            
            // Add appropriate state class
            if (tpsValue >= 20) {
                tpsFill.classList.add('perfect');
            } else if (tpsValue >= TPS_HEALTHY_THRESHOLD) {
                tpsFill.classList.add('good');
            } else if (tpsValue >= TPS_WARNING_THRESHOLD) {
                tpsFill.classList.add('warning');
            } else {
                tpsFill.classList.add('critical');
            }
        }
    }
    
    // Update uptime with null check
    const uptimeEl = document.getElementById('uptime');
    if (uptimeEl) {
        uptimeEl.textContent = stats.uptime ? formatUptime(stats.uptime) : '0m';
    }
    
    // Update memory with null check and progress bar
    const memoryEl = document.getElementById('memoryUsage');
    const memoryProgress = document.getElementById('memoryProgress');
    if (memoryEl) {
        if (stats.memory && stats.memory.used && stats.memory.limit) {
            memoryEl.textContent = `${stats.memory.used}GB / ${stats.memory.limit}GB`;
            
            // Update progress bar
            if (memoryProgress) {
                const percentage = (stats.memory.used / stats.memory.limit) * 100;
                memoryProgress.style.width = `${percentage}%`;
                memoryProgress.setAttribute('aria-valuenow', Math.round(percentage));
                
                // Remove all state classes
                memoryProgress.classList.remove('low', 'medium', 'high');
                
                // Add appropriate state class based on thresholds
                if (percentage >= 80) {
                    memoryProgress.classList.add('high');
                } else if (percentage >= 60) {
                    memoryProgress.classList.add('medium');
                } else {
                    memoryProgress.classList.add('low');
                }
            }
        } else {
            memoryEl.textContent = '-- / --';
            if (memoryProgress) {
                memoryProgress.style.width = '0%';
                memoryProgress.setAttribute('aria-valuenow', '0');
            }
        }
    }
    
    // Update CPU with null check and progress bar
    const cpuEl = document.getElementById('cpuUsage');
    const cpuProgress = document.getElementById('cpuProgress');
    if (cpuEl) {
        const cpuValue = stats.cpu !== undefined ? stats.cpu : 0;
        cpuEl.textContent = `${cpuValue}%`;
        
        // Update progress bar
        if (cpuProgress) {
            cpuProgress.style.width = `${cpuValue}%`;
            cpuProgress.setAttribute('aria-valuenow', cpuValue);
            
            // Remove all state classes
            cpuProgress.classList.remove('low', 'medium', 'high');
            
            // Add appropriate state class based on thresholds
            if (cpuValue >= 80) {
                cpuProgress.classList.add('high');
            } else if (cpuValue >= 60) {
                cpuProgress.classList.add('medium');
            } else {
                cpuProgress.classList.add('low');
            }
        }
    }
    
    // Update version with null check
    const versionEl = document.getElementById('mcVersion');
    if (versionEl) {
        versionEl.textContent = stats.version || '--';
    }
    
    // Update world size with null check
    const worldSizeEl = document.getElementById('worldSize');
    if (worldSizeEl) {
        worldSizeEl.textContent = stats.worldSize || '--';
    }
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

/**
 * Load dashboard data (server stats + analytics)
 */
async function loadDashboard() {
    try {
        const response = await fetch('/api/server/dashboard', {
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load dashboard data');
        }
        
        const data = await response.json();
        updateServerStatus(data);
        
        // Update analytics if available
        if (data.analytics) {
            updateAnalytics(data.analytics);
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        // Fall back to basic server status
        try {
            const response = await fetch('/api/server/status', {
                credentials: 'same-origin'
            });
            if (response.ok) {
                const data = await response.json();
                updateServerStatus(data);
            }
        } catch (fallbackError) {
            console.error('Fallback failed:', fallbackError);
            updateServerStatus({ status: 'offline' });
        }
        // Show unavailable analytics
        updateAnalytics({ available: false });
    }
}

/**
 * Update analytics section
 */
function updateAnalytics(analytics) {
    const sourceIndicator = document.getElementById('analyticsSource');
    const sourceDot = sourceIndicator?.querySelector('.source-dot');
    const sourceText = sourceIndicator?.querySelector('.source-text');
    
    if (analytics.available) {
        if (sourceDot) sourceDot.classList.add('connected');
        if (sourceText) sourceText.textContent = analytics.source === 'plan' ? 'Plan' : 'Live';
        
        // Update stat values
        const playersToday = document.getElementById('playersToday');
        if (playersToday) playersToday.textContent = analytics.playersToday || 0;
        
        const playersWeek = document.getElementById('playersWeek');
        if (playersWeek) playersWeek.textContent = analytics.playersWeek || 0;
        
        const peakPlayers = document.getElementById('peakPlayers');
        if (peakPlayers) peakPlayers.textContent = analytics.peakPlayers || 0;
        
        const avgSession = document.getElementById('avgSession');
        if (avgSession) {
            avgSession.textContent = analytics.avgSessionLength 
                ? formatSessionLength(analytics.avgSessionLength) 
                : '-';
        }
        
        // Update top players
        if (analytics.topPlayers) {
            updateTopPlayers(analytics.topPlayers);
        }
    } else {
        if (sourceDot) sourceDot.classList.remove('connected');
        if (sourceText) sourceText.textContent = 'Unavailable';
        
        // Show placeholder values
        const playersToday = document.getElementById('playersToday');
        if (playersToday) playersToday.textContent = '-';
        
        const playersWeek = document.getElementById('playersWeek');
        if (playersWeek) playersWeek.textContent = '-';
        
        const peakPlayers = document.getElementById('peakPlayers');
        if (peakPlayers) peakPlayers.textContent = '-';
        
        const avgSession = document.getElementById('avgSession');
        if (avgSession) avgSession.textContent = '-';
        
        // Clear top players
        const topPlayersList = document.getElementById('topPlayersList');
        if (topPlayersList) {
            topPlayersList.innerHTML = '<p class="text-muted">Analytics unavailable - Install Plan plugin</p>';
        }
    }
}

/**
 * Update top players list with avatars
 */
function updateTopPlayers(players) {
    const topPlayersList = document.getElementById('topPlayersList');
    if (!topPlayersList) return;
    
    if (!players || players.length === 0) {
        topPlayersList.innerHTML = '<p class="text-muted">No player data available</p>';
        return;
    }
    
    topPlayersList.innerHTML = players.map((player, index) => {
        const avatarUrl = getPlayerAvatar(player.name, 32);
        const fallbackAvatar = getFallbackAvatar(32);
        const playtime = formatPlaytime(player.playtime);
        const rank = index + 1;
        
        return `
            <div class="top-player-item">
                <span class="top-player-rank">#${rank}</span>
                <img class="top-player-avatar" 
                     src="${avatarUrl}" 
                     alt="${escapeHtml(player.name)}"
                     onerror="this.src='${fallbackAvatar}'">
                <div class="top-player-info">
                    <div class="top-player-name">${escapeHtml(player.name)}</div>
                    <div class="top-player-playtime">${playtime}</div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Get Minotar avatar URL
 */
function getPlayerAvatar(playerName, size = 32) {
    return `https://minotar.net/avatar/${encodeURIComponent(playerName)}/${size}`;
}

/**
 * Get fallback avatar (SVG data URI)
 */
function getFallbackAvatar(size = 32) {
    // Simple SVG placeholder
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32"><rect width="32" height="32" fill="%23374151"/><text x="16" y="20" text-anchor="middle" fill="%239CA3AF" font-family="sans-serif" font-size="16">?</text></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Format playtime from minutes to readable format
 */
function formatPlaytime(minutes) {
    if (!minutes) return '0m';
    
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = Math.floor(minutes % 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}

/**
 * Format session length from seconds to readable format
 */
function formatSessionLength(seconds) {
    if (!seconds) return '0s';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function startStatsPolling() {
    // Poll stats every 5 seconds
    statsInterval = setInterval(() => {
        loadDashboard();
        loadPlayers();
    }, 5000);
}
