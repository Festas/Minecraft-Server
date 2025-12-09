// Map Dashboard JavaScript
// Handles map display, player overlays, and admin actions

let mapRefreshInterval = null;
let currentMapSource = 'dynmap';
let currentWorld = 'world';
let mapConfig = null;
let autoRefresh = true;

// Initialize map dashboard on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    checkAuth();
    
    // Fetch CSRF token (from utils.js)
    fetchCsrfToken();
    
    // Initialize theme
    initializeTheme();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize map
    initializeMap();
});

/**
 * Check authentication and redirect if not logged in
 */
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
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/console/login.html';
    }
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Back to console button
    const backBtn = document.getElementById('backToConsole');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = '/console/';
        });
    }
    
    // Map source selection
    const mapSourceSelect = document.getElementById('mapSourceSelect');
    if (mapSourceSelect) {
        mapSourceSelect.addEventListener('change', (e) => {
            currentMapSource = e.target.value;
            loadMapConfiguration();
        });
    }
    
    // World selection
    const worldSelect = document.getElementById('worldSelect');
    if (worldSelect) {
        worldSelect.addEventListener('change', (e) => {
            currentWorld = e.target.value;
            loadMap();
        });
    }
    
    // Auto-refresh toggle
    const autoRefreshToggle = document.getElementById('autoRefreshToggle');
    if (autoRefreshToggle) {
        autoRefreshToggle.addEventListener('change', (e) => {
            autoRefresh = e.target.checked;
            if (autoRefresh) {
                startAutoRefresh();
            } else {
                stopAutoRefresh();
            }
        });
    }
    
    // Refresh now button
    const refreshNowBtn = document.getElementById('refreshNowBtn');
    if (refreshNowBtn) {
        refreshNowBtn.addEventListener('click', () => {
            refreshPlayers();
        });
    }
    
    // Sidebar toggle (mobile)
    const toggleSidebar = document.getElementById('toggleSidebar');
    if (toggleSidebar) {
        toggleSidebar.addEventListener('click', () => {
            const sidebar = document.getElementById('mapSidebar');
            sidebar.classList.toggle('collapsed');
        });
    }
    
    // Modal close buttons
    const modalClose = document.querySelector('.modal-close');
    const closeModalBtn = document.getElementById('closeModalBtn');
    if (modalClose) {
        modalClose.addEventListener('click', closePlayerModal);
    }
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closePlayerModal);
    }
    
    // Close modal on backdrop click
    const modal = document.getElementById('playerModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closePlayerModal();
            }
        });
    }
}

/**
 * Initialize the map
 */
async function initializeMap() {
    updateMapStatus('checking', 'Checking map availability...');
    
    // Check if Dynmap is available
    const isDynmapAvailable = await checkMapAvailability('dynmap');
    
    if (isDynmapAvailable) {
        currentMapSource = 'dynmap';
        await loadMapConfiguration();
        startAutoRefresh();
    } else {
        // Check BlueMap
        const isBlueMapAvailable = await checkMapAvailability('bluemap');
        if (isBlueMapAvailable) {
            currentMapSource = 'bluemap';
            await loadMapConfiguration();
            startAutoRefresh();
        } else {
            updateMapStatus('disconnected', 'No map plugin available');
            showPlaceholder();
        }
    }
}

/**
 * Check if a map source is available
 */
async function checkMapAvailability(source) {
    try {
        const response = await apiRequest(`/api/plugins/${source}/health`);
        const data = await response.json();
        return data.success && data.health.status === 'healthy';
    } catch (error) {
        console.error(`${source} availability check failed:`, error);
        return false;
    }
}

/**
 * Load map configuration
 */
async function loadMapConfiguration() {
    try {
        updateMapStatus('checking', 'Loading map configuration...');
        
        const response = await apiRequest(`/api/plugins/${currentMapSource}/configuration`);
        const data = await response.json();
        
        if (data.success) {
            mapConfig = data.data;
            updateMapStatus('connected', 'Map connected');
            
            // Load worlds
            await loadWorlds();
            
            // Load the map
            loadMap();
        } else {
            throw new Error(data.error || 'Failed to load map configuration');
        }
    } catch (error) {
        console.error('Map configuration error:', error);
        updateMapStatus('disconnected', 'Failed to load map');
        showNotification('Failed to load map configuration', 'error');
    }
}

/**
 * Load available worlds
 */
async function loadWorlds() {
    try {
        const response = await apiRequest(`/api/plugins/${currentMapSource}/worlds`);
        const data = await response.json();
        
        if (data.success && data.data.worlds) {
            const worldSelect = document.getElementById('worldSelect');
            worldSelect.innerHTML = '';
            
            data.data.worlds.forEach(world => {
                const option = document.createElement('option');
                option.value = world.name;
                option.textContent = world.title || world.name;
                worldSelect.appendChild(option);
            });
            
            // Set default world
            if (data.data.worlds.length > 0) {
                currentWorld = data.data.worlds[0].name;
            }
        }
    } catch (error) {
        console.error('Error loading worlds:', error);
    }
}

/**
 * Load the map iframe
 */
function loadMap() {
    if (!mapConfig) return;
    
    const mapFrame = document.getElementById('mapFrame');
    const mapPlaceholder = document.getElementById('mapPlaceholder');
    
    // Construct map URL based on source
    let mapUrl = '';
    if (currentMapSource === 'dynmap') {
        // Dynmap URL format: http://server:8123/
        const baseUrl = mapConfig.baseUrl || window.location.origin;
        mapUrl = `${baseUrl}/#world:${currentWorld}`;
    } else if (currentMapSource === 'bluemap') {
        // BlueMap URL format: http://server:8100/
        const baseUrl = mapConfig.baseUrl || window.location.origin;
        mapUrl = `${baseUrl}/#${currentWorld}`;
    }
    
    if (mapUrl) {
        mapFrame.src = mapUrl;
        mapFrame.classList.remove('hidden');
        mapPlaceholder.classList.add('hidden');
    } else {
        showPlaceholder();
    }
}

/**
 * Show placeholder when map is not available
 */
function showPlaceholder() {
    const mapFrame = document.getElementById('mapFrame');
    const mapPlaceholder = document.getElementById('mapPlaceholder');
    
    mapFrame.classList.add('hidden');
    mapPlaceholder.classList.remove('hidden');
}

/**
 * Update map status indicator
 */
function updateMapStatus(status, text) {
    const statusIndicator = document.getElementById('mapSourceStatus');
    if (!statusIndicator) return;
    
    statusIndicator.className = 'status-indicator ' + status;
    const statusText = statusIndicator.querySelector('.status-text');
    if (statusText) {
        statusText.textContent = text;
    }
}

/**
 * Start auto-refresh for player positions
 */
function startAutoRefresh() {
    if (!autoRefresh) return;
    
    // Clear any existing interval
    stopAutoRefresh();
    
    // Refresh immediately
    refreshPlayers();
    
    // Set interval for 5 seconds
    mapRefreshInterval = setInterval(() => {
        refreshPlayers();
    }, 5000);
}

/**
 * Stop auto-refresh
 */
function stopAutoRefresh() {
    if (mapRefreshInterval) {
        clearInterval(mapRefreshInterval);
        mapRefreshInterval = null;
    }
}

/**
 * Refresh player positions and update displays
 */
async function refreshPlayers() {
    try {
        const response = await apiRequest(`/api/plugins/${currentMapSource}/players-enriched`);
        const data = await response.json();
        
        if (data.success) {
            const players = data.data.players || [];
            updatePlayersList(players);
            updateOnlineCount(players.length);
            // Note: Player overlay markers would be positioned here if we had map coordinates
            // For now, we're primarily showing the embedded map iframe
        }
    } catch (error) {
        console.error('Error refreshing players:', error);
    }
}

/**
 * Update the players list in sidebar
 */
function updatePlayersList(players) {
    const playersList = document.getElementById('mapPlayersList');
    if (!playersList) return;
    
    if (players.length === 0) {
        playersList.innerHTML = '<p class="no-players">No players online</p>';
        return;
    }
    
    playersList.innerHTML = '';
    players.forEach(player => {
        const item = createMapPlayerItem(player);
        playersList.appendChild(item);
    });
}

/**
 * Create a player list item
 */
function createMapPlayerItem(player) {
    const item = document.createElement('div');
    item.className = 'map-player-item';
    
    const avatar = document.createElement('img');
    avatar.src = player.avatar;
    avatar.alt = player.name;
    avatar.onerror = function() {
        this.src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2232%22 height=%2232%22><rect fill=%22%23666%22 width=%2232%22 height=%2232%22/></svg>';
    };
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'map-player-name';
    nameDiv.textContent = player.displayName || player.name;
    
    const locationDiv = document.createElement('div');
    locationDiv.className = 'map-player-location';
    locationDiv.textContent = `${player.world} (${Math.round(player.x)}, ${Math.round(player.y)}, ${Math.round(player.z)})`;
    
    item.appendChild(avatar);
    const detailsDiv = document.createElement('div');
    detailsDiv.style.flex = '1';
    detailsDiv.appendChild(nameDiv);
    detailsDiv.appendChild(locationDiv);
    item.appendChild(detailsDiv);
    
    // Make clickable to show player info
    item.addEventListener('click', () => {
        showPlayerInfo(player);
    });
    
    return item;
}

/**
 * Update online player count
 */
function updateOnlineCount(count) {
    const onlineCount = document.getElementById('onlineCount');
    if (onlineCount) {
        onlineCount.textContent = `(${count})`;
    }
}

/**
 * Show player information modal
 */
function showPlayerInfo(player) {
    const modal = document.getElementById('playerModal');
    const modalBody = document.getElementById('playerModalBody');
    const modalTitle = document.getElementById('playerModalTitle');
    
    if (!modal || !modalBody) return;
    
    modalTitle.textContent = `${player.displayName || player.name} - Player Info`;
    
    // Check user permissions for actions
    const userRole = window.currentUser?.role || 'viewer';
    const canTeleport = ['owner', 'admin', 'moderator'].includes(userRole);
    const canKick = ['owner', 'admin', 'moderator'].includes(userRole);
    
    modalBody.innerHTML = `
        <div class="player-info-header">
            <img src="${player.avatar}" alt="${player.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2264%22><rect fill=%22%23666%22 width=%2264%22 height=%2264%22/></svg>'">
            <div class="player-info-details">
                <h4>${player.displayName || player.name}</h4>
                <div class="player-status">● Online</div>
            </div>
        </div>
        
        <div class="player-stats-grid">
            <div class="stat-item">
                <div class="stat-label">Health</div>
                <div class="stat-value">${player.health !== undefined ? player.health : 'N/A'}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Armor</div>
                <div class="stat-value">${player.armor !== undefined ? player.armor : 'N/A'}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Total Playtime</div>
                <div class="stat-value">${player.formattedPlaytime || 'N/A'}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Sessions</div>
                <div class="stat-value">${player.sessionCount || 0}</div>
            </div>
        </div>
        
        <div class="player-location-info">
            <h5>Current Location</h5>
            <div><strong>World:</strong> ${player.world}</div>
            <div class="location-coords">
                <strong>Coordinates:</strong> X: ${Math.round(player.x)}, Y: ${Math.round(player.y)}, Z: ${Math.round(player.z)}
            </div>
        </div>
        
        <div class="player-actions">
            ${canTeleport ? `<button class="btn btn-primary" onclick="teleportToPlayer('${player.name}')">📍 Teleport to Player</button>` : ''}
            ${canKick ? `<button class="btn btn-warning" onclick="kickPlayerFromMap('${player.name}')">⚠️ Kick Player</button>` : ''}
            <button class="btn btn-secondary" onclick="copyCoordinates(${player.x}, ${player.y}, ${player.z})">📋 Copy Coords</button>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

/**
 * Close player modal
 */
function closePlayerModal() {
    const modal = document.getElementById('playerModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * Teleport to a player (admin action)
 */
async function teleportToPlayer(playerName) {
    try {
        // This would teleport the current admin to the player's location
        // We need to get the current admin's username
        const adminUsername = window.currentUser?.username;
        
        if (!adminUsername) {
            showNotification('Cannot determine current user', 'error');
            return;
        }
        
        const response = await apiRequest('/api/players/teleport', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                player: adminUsername,
                target: playerName
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Teleported to ${playerName}`, 'success');
            closePlayerModal();
        } else {
            showNotification(data.error || 'Failed to teleport', 'error');
        }
    } catch (error) {
        console.error('Teleport error:', error);
        showNotification('Failed to teleport', 'error');
    }
}

/**
 * Kick a player from the map view (admin action)
 */
async function kickPlayerFromMap(playerName) {
    const confirmed = confirm(`Are you sure you want to kick ${playerName}?`);
    if (!confirmed) return;
    
    try {
        const response = await apiRequest('/api/players/kick', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player: playerName })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Kicked ${playerName}`, 'success');
            closePlayerModal();
            // Refresh players list
            setTimeout(() => refreshPlayers(), 1000);
        } else {
            showNotification(data.error || 'Failed to kick player', 'error');
        }
    } catch (error) {
        console.error('Kick error:', error);
        showNotification('Failed to kick player', 'error');
    }
}

/**
 * Copy coordinates to clipboard
 */
function copyCoordinates(x, y, z) {
    const coords = `${Math.round(x)} ${Math.round(y)} ${Math.round(z)}`;
    
    // Use modern clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(coords)
            .then(() => {
                showNotification('Coordinates copied to clipboard', 'success');
            })
            .catch(err => {
                console.error('Failed to copy:', err);
                fallbackCopyText(coords);
            });
    } else {
        fallbackCopyText(coords);
    }
}

/**
 * Fallback copy method for older browsers
 */
function fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showNotification('Coordinates copied to clipboard', 'success');
    } catch (err) {
        console.error('Fallback copy failed:', err);
        showNotification('Failed to copy coordinates', 'error');
    }
    
    document.body.removeChild(textArea);
}

/**
 * Logout
 */
async function logout() {
    try {
        await apiRequest('/api/logout', { method: 'POST' });
        window.location.href = '/console/login.html';
    } catch (error) {
        console.error('Logout error:', error);
        // Redirect anyway
        window.location.href = '/console/login.html';
    }
}

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
});
