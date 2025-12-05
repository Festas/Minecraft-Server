// Main application initialization
let statsInterval = null;

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
    loadServerStatus();
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
        
        const userBadge = document.getElementById('currentUser');
        if (userBadge) {
            userBadge.textContent = data.username || 'Admin';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/console/login.html';
    }
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
            const player = document.getElementById('playerNameInput').value;
            if (player) kickPlayer(player);
        });
    }
    
    const banPlayerBtn = document.getElementById('banPlayerBtn');
    if (banPlayerBtn) {
        banPlayerBtn.addEventListener('click', () => {
            const player = document.getElementById('playerNameInput').value;
            if (player) banPlayer(player);
        });
    }
    
    const opPlayerBtn = document.getElementById('opPlayerBtn');
    if (opPlayerBtn) {
        opPlayerBtn.addEventListener('click', () => {
            const player = document.getElementById('playerNameInput').value;
            if (player) opPlayer(player);
        });
    }
    
    const deopPlayerBtn = document.getElementById('deopPlayerBtn');
    if (deopPlayerBtn) {
        deopPlayerBtn.addEventListener('click', () => {
            const player = document.getElementById('playerNameInput').value;
            if (player) deopPlayer(player);
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

    // Update status indicator
    const statusIndicator = document.getElementById('serverStatus');
    const statusText = document.getElementById('serverStatusText');
    
    if (statusIndicator && statusText) {
        if (stats.status === 'online') {
            statusIndicator.textContent = '🟢';
            statusText.textContent = 'Online';
        } else {
            statusIndicator.textContent = '🔴';
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
    
    // Update TPS with null check
    const tpsEl = document.getElementById('tps');
    if (tpsEl) {
        tpsEl.textContent = stats.tps !== undefined ? stats.tps.toFixed(1) : '--';
    }
    
    // Update uptime with null check
    const uptimeEl = document.getElementById('uptime');
    if (uptimeEl) {
        uptimeEl.textContent = stats.uptime ? formatUptime(stats.uptime) : '0m';
    }
    
    // Update memory with null check
    const memoryEl = document.getElementById('memoryUsage');
    if (memoryEl) {
        if (stats.memory && stats.memory.used && stats.memory.limit) {
            memoryEl.textContent = `${stats.memory.used}GB / ${stats.memory.limit}GB`;
        } else {
            memoryEl.textContent = '-- / --';
        }
    }
    
    // Update CPU with null check
    const cpuEl = document.getElementById('cpuUsage');
    if (cpuEl) {
        cpuEl.textContent = stats.cpu !== undefined ? `${stats.cpu}%` : '--';
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

function startStatsPolling() {
    // Poll stats every 5 seconds
    statsInterval = setInterval(() => {
        loadServerStatus();
        loadPlayers();
    }, 5000);
}
