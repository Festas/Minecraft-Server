// Player management - Store player data globally for filtering/sorting
let allPlayersData = [];
let currentSort = 'playtime'; // default sort

/**
 * Load avatar image with robust error handling
 * Only falls back to placeholder after timeout or real network failure
 * @param {string} avatarUrl - The Minotar URL to load
 * @param {string} fallbackUrl - The fallback SVG data URL
 * @param {number} timeout - Milliseconds to wait before fallback (default 2000)
 * @returns {Promise<string>} The URL to use (either original or fallback)
 */
function loadAvatarWithFallback(avatarUrl, fallbackUrl, timeout = 2000) {
    return new Promise((resolve) => {
        const img = new Image();
        let hasResolved = false;
        
        // Set a timeout for fallback
        const timeoutId = setTimeout(() => {
            if (!hasResolved) {
                hasResolved = true;
                resolve(fallbackUrl);
            }
        }, timeout);
        
        // On successful load
        img.onload = () => {
            if (!hasResolved) {
                hasResolved = true;
                clearTimeout(timeoutId);
                resolve(avatarUrl);
            }
        };
        
        // On error (real network failure)
        img.onerror = () => {
            if (!hasResolved) {
                hasResolved = true;
                clearTimeout(timeoutId);
                resolve(fallbackUrl);
            }
        };
        
        // Start loading
        img.src = avatarUrl;
    });
}

async function loadPlayers() {
    try {
        // Fetch all players with stats
        const response = await apiRequest('/api/players/all');
        const data = await response.json();
        
        if (data.success) {
            allPlayersData = data.players || [];
            renderAllPlayersList(data);
            updatePlayerCount(data.onlineCount, data.maxPlayers || 20);
        }
    } catch (error) {
        console.error('Error loading players:', error);
        // Add fallback on error
        updatePlayerCount(0, 20);
    }
}

/**
 * Render all players list with stats
 */
function renderAllPlayersList(data) {
    const onlinePlayersList = document.getElementById('onlinePlayersList');
    const allPlayersList = document.getElementById('allPlayersList');
    const onlinePlayersCount = document.getElementById('onlinePlayersCount');
    const totalPlayersCount = document.getElementById('totalPlayersCount');
    
    // Update counts
    if (onlinePlayersCount) {
        onlinePlayersCount.textContent = `${data.onlineCount} online`;
    }
    
    if (totalPlayersCount) {
        totalPlayersCount.textContent = `${data.totalPlayers} total`;
    }
    
    // Render online players list
    if (onlinePlayersList) {
        const onlinePlayers = data.players ? data.players.filter(p => p.isOnline) : [];
        
        if (onlinePlayers.length === 0) {
            onlinePlayersList.innerHTML = '<p class="no-players">No players are currently online</p>';
        } else {
            onlinePlayersList.innerHTML = '';
            onlinePlayers.forEach(player => {
                onlinePlayersList.appendChild(createPlayerCard(player));
            });
        }
    }
    
    // Render all players list (apply current sort)
    sortAndRenderPlayers();
}

/**
 * Create a player card element with Minotar avatar
 */
function createPlayerCard(player) {
    const playerCard = document.createElement('div');
    playerCard.className = 'player-card' + (player.isOnline ? ' online' : '');
    
    // Format last seen date with validation
    let lastSeenStr = 'Unknown';
    if (player.isOnline) {
        lastSeenStr = 'Online now';
    } else if (player.last_seen) {
        const lastSeenDate = new Date(player.last_seen);
        // Check if date is valid
        if (!isNaN(lastSeenDate.getTime())) {
            lastSeenStr = formatRelativeTime(lastSeenDate);
        }
    }

    // Avatar HTML-Gerüst OHNE <img>
    playerCard.innerHTML = `
        <div class="player-card-info">
            <div class="player-card-avatar">
                ${player.isOnline ? '<div class="online-indicator"></div>' : ''}
            </div>
            <div class="player-card-details">
                <div class="player-card-name">${player.username}</div>
                <div class="player-card-stats">
                    <div class="player-card-stat">
                        <span class="player-card-stat-icon">⏱️</span>
                        <span>${player.formattedPlaytime || '0h'}</span>
                    </div>
                    <div class="player-card-stat">
                        <span class="player-card-stat-icon">👋</span>
                        <span>${lastSeenStr}</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Avatar URLs
    const fallbackAvatar = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect fill='%23666' width='64' height='64'/></svg>";
    const avatarUrl = `https://minotar.net/avatar/${player.username}/64.png`;

    // Get avatar container
    const avatarDiv = playerCard.querySelector('.player-card-avatar');
    
    // Create image element
    const img = document.createElement('img');
    img.alt = player.username;
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.2s ease-in-out';
    
    // Insert image into avatar div
    avatarDiv.insertBefore(img, avatarDiv.firstChild);
    
    // Load avatar with robust fallback handling
    loadAvatarWithFallback(avatarUrl, fallbackAvatar, 2000).then(finalUrl => {
        img.src = finalUrl;
        img.style.opacity = '1';
    });

    // Add click handler to open modal
    playerCard.addEventListener('click', () => {
        openPlayerModal(player);
    });

    return playerCard;
}

/**
 * Format relative time (e.g., "2 hours ago", "3 days ago")
 */
function formatRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) {
        return 'Just now';
    } else if (diffMins < 60) {
        return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 30) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString();
    }
}

/**
 * Initialize player search functionality
 */
function initPlayerSearch() {
    const searchInput = document.getElementById('playerSearchInput');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        filterPlayers(e.target.value);
    });
}

/**
 * Filter displayed player cards by name
 */
function filterPlayers(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    const playerCards = document.querySelectorAll('.player-card');
    
    playerCards.forEach(card => {
        const playerName = card.querySelector('.player-card-name').textContent.toLowerCase();
        if (playerName.includes(term)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

/**
 * Initialize sort tabs functionality
 */
function initSortTabs() {
    const sortTabs = document.querySelectorAll('.sort-tab');
    
    sortTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            sortTabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Update current sort
            currentSort = tab.dataset.sort;
            
            // Re-render players with new sort
            sortAndRenderPlayers();
        });
    });
}

/**
 * Sort and render players based on current sort option
 */
function sortAndRenderPlayers() {
    const allPlayersList = document.getElementById('allPlayersList');
    if (!allPlayersList) return;
    
    let sortedPlayers = [...allPlayersData];
    
    // Apply sort
    switch (currentSort) {
        case 'playtime':
            sortedPlayers.sort((a, b) => {
                const aTime = a.total_playtime_seconds || 0;
                const bTime = b.total_playtime_seconds || 0;
                return bTime - aTime;
            });
            break;
        case 'recent':
            sortedPlayers.sort((a, b) => {
                const aDate = a.last_seen ? new Date(a.last_seen).getTime() : 0;
                const bDate = b.last_seen ? new Date(b.last_seen).getTime() : 0;
                return bDate - aDate;
            });
            break;
        case 'name':
            sortedPlayers.sort((a, b) => {
                return a.username.localeCompare(b.username);
            });
            break;
    }
    
    // Render sorted players
    if (sortedPlayers.length === 0) {
        allPlayersList.innerHTML = '<p class="no-players">No players have joined yet</p>';
    } else {
        allPlayersList.innerHTML = '';
        sortedPlayers.forEach(player => {
            allPlayersList.appendChild(createPlayerCard(player));
        });
    }
}

/**
 * Open player detail modal
 */
function openPlayerModal(player) {
    const modal = document.getElementById('playerModal');
    if (!modal) return;
    
    // Populate modal with player data
    const avatarUrl = `https://minotar.net/avatar/${player.username}/128.png`;
    const fallbackAvatar = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'><rect fill='%23666' width='128' height='128'/></svg>";
    const img = document.getElementById('modalPlayerAvatar');
    
    // Reset opacity for loading state
    img.style.opacity = '0.3';
    img.style.transition = 'opacity 0.2s ease-in-out';
    
    // Load avatar with robust fallback handling
    loadAvatarWithFallback(avatarUrl, fallbackAvatar, 2000).then(finalUrl => {
        img.src = finalUrl;
        img.style.opacity = '1';
    });
    
    document.getElementById('modalPlayerName').textContent = player.username;
    
    // Update status
    const statusEl = document.getElementById('modalPlayerStatus');
    if (player.isOnline) {
        statusEl.className = 'player-modal-status online';
        statusEl.querySelector('span:last-child').textContent = 'Online';
    } else {
        statusEl.className = 'player-modal-status offline';
        statusEl.querySelector('span:last-child').textContent = 'Offline';
    }
    
    // Update stats
    document.getElementById('modalTotalPlaytime').textContent = player.formattedPlaytime || '0h';
    
    const firstJoined = player.first_joined ? new Date(player.first_joined).toLocaleDateString() : 'Unknown';
    document.getElementById('modalFirstJoined').textContent = firstJoined;
    
    let lastSeen = 'Unknown';
    if (player.isOnline) {
        lastSeen = 'Online now';
    } else if (player.last_seen) {
        const lastSeenDate = new Date(player.last_seen);
        if (!isNaN(lastSeenDate.getTime())) {
            lastSeen = formatRelativeTime(lastSeenDate);
        }
    }
    document.getElementById('modalLastSeen').textContent = lastSeen;
    
    document.getElementById('modalSessions').textContent = player.session_count || '0';
    
    // Store player username in modal for action buttons
    modal.dataset.playerUsername = player.username;
    modal.dataset.playerUuid = player.uuid || '';
    
    // Load player history
    loadPlayerHistoryForModal(player.uuid || player.username);
    
    // Show modal
    modal.classList.add('active');
    document.body.classList.add('modal-open');
}

/**
 * Close player modal
 */
function closePlayerModal() {
    const modal = document.getElementById('playerModal');
    if (!modal) return;
    
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
}

/**
 * Load player's action history for modal
 */
async function loadPlayerHistoryForModal(playerIdentifier) {
    const activityList = document.getElementById('modalActivityList');
    if (!activityList) return;
    
    activityList.innerHTML = '<p class="loading-text">Loading activity...</p>';
    
    try {
        const endpoint = `/api/players/${playerIdentifier}/history`;
        const response = await apiRequest(endpoint);
        const data = await response.json();
        
        if (data.success && data.actions && data.actions.length > 0) {
            activityList.innerHTML = '';
            // Show only the last 5 actions
            data.actions.slice(0, 5).forEach(action => {
                const item = document.createElement('div');
                item.className = 'modal-history-item';
                item.setAttribute('data-action', action.action_type);
                
                const actionDate = new Date(action.performed_at);
                const timeAgo = formatRelativeTime(actionDate);
                
                // Use escapeHtml to prevent XSS
                const actionType = window.escapeHtml ? window.escapeHtml(action.action_type.replace('_', ' ')) : action.action_type.replace('_', ' ');
                const performedBy = window.escapeHtml ? window.escapeHtml(action.performed_by) : action.performed_by;
                const reason = action.reason ? (window.escapeHtml ? window.escapeHtml(action.reason) : action.reason) : '';
                
                item.innerHTML = `
                    <div class="modal-history-header">
                        <span class="modal-history-type">${actionType}</span>
                        <span class="modal-history-time">${timeAgo}</span>
                    </div>
                    <div class="modal-history-details">
                        by ${performedBy}
                    </div>
                    ${reason ? `<div class="modal-history-reason">${reason}</div>` : ''}
                `;
                
                activityList.appendChild(item);
            });
        } else {
            activityList.innerHTML = '<p class="loading-text">No activity history</p>';
        }
    } catch (error) {
        console.error('Error loading player history:', error);
        activityList.innerHTML = '<p class="loading-text loading-error">Failed to load activity</p>';
    }
}

/**
 * Initialize modal event handlers
 */
function initModalEvents() {
    const modal = document.getElementById('playerModal');
    if (!modal) return;
    
    // Close button
    const closeBtn = document.getElementById('closePlayerModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', closePlayerModal);
    }
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closePlayerModal();
        }
    });
    
    // Modal action buttons
    const modalKickBtn = document.getElementById('modalKickBtn');
    if (modalKickBtn) {
        modalKickBtn.addEventListener('click', () => {
            const username = modal.dataset.playerUsername;
            if (username) {
                kickPlayer(username);
                closePlayerModal();
            }
        });
    }
    
    const modalBanBtn = document.getElementById('modalBanBtn');
    if (modalBanBtn) {
        modalBanBtn.addEventListener('click', () => {
            const username = modal.dataset.playerUsername;
            if (username) {
                banPlayer(username);
                closePlayerModal();
            }
        });
    }
    
    const modalWarnBtn = document.getElementById('modalWarnBtn');
    if (modalWarnBtn) {
        modalWarnBtn.addEventListener('click', () => {
            const username = modal.dataset.playerUsername;
            if (username) {
                warnPlayer(username);
                closePlayerModal();
            }
        });
    }
    
    const modalMuteBtn = document.getElementById('modalMuteBtn');
    if (modalMuteBtn) {
        modalMuteBtn.addEventListener('click', () => {
            const username = modal.dataset.playerUsername;
            if (username) {
                mutePlayer(username);
                closePlayerModal();
            }
        });
    }
    
    const modalOpBtn = document.getElementById('modalOpBtn');
    if (modalOpBtn) {
        modalOpBtn.addEventListener('click', () => {
            const username = modal.dataset.playerUsername;
            if (username) {
                opPlayer(username);
                closePlayerModal();
            }
        });
    }
    
    const modalTeleportBtn = document.getElementById('modalTeleportBtn');
    if (modalTeleportBtn) {
        modalTeleportBtn.addEventListener('click', () => {
            const username = modal.dataset.playerUsername;
            if (username) {
                teleportPlayer(username);
                closePlayerModal();
            }
        });
    }
}

/**
 * Teleport player to target
 */
async function teleportPlayer(player) {
    // Use browser prompt as showPrompt doesn't exist yet
    const target = prompt('Enter target (player name or coordinates "x y z"):');
    if (!target) return;
    
    try {
        // Check if target is coordinates (contains spaces and numbers)
        const coordPattern = /^-?\d+(\.\d+)?\s+-?\d+(\.\d+)?\s+-?\d+(\.\d+)?$/;
        let command;
        
        if (coordPattern.test(target.trim())) {
            // Teleport to coordinates
            command = `tp ${player} ${target}`;
        } else {
            // Teleport to player
            command = `tp ${player} ${target}`;
        }
        
        // Execute teleport command via console
        const response = await apiRequest('/api/server/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Teleported ${player} to ${target}`, 'success');
        } else {
            showNotification(data.error || 'Failed to teleport player', 'error');
        }
    } catch (error) {
        showNotification('Error teleporting player', 'error');
    }
}

function updatePlayerCount(online, max) {
    const playerCurrent = document.getElementById('playerCurrent');
    const playerMax = document.getElementById('playerMax');
    const onlinePlayersCount = document.getElementById('onlinePlayersCount');
    
    // Add null checks with fallback values using nullish coalescing
    const onlineCount = online ?? 0;
    const maxCount = max ?? 20;
    
    // Update new player counter structure
    if (playerCurrent) {
        playerCurrent.textContent = onlineCount;
    }
    if (playerMax) {
        playerMax.textContent = maxCount;
    }
    
    // Update players section count
    if (onlinePlayersCount) {
        onlinePlayersCount.textContent = `(${onlineCount})`;
    }
}

async function kickPlayer(player, reason = '') {
    const confirmed = await showConfirmation(
        'Kick Player',
        `Are you sure you want to kick ${player}?`
    );
    
    if (!confirmed) return;
    
    try {
        const response = await apiRequest('/api/players/kick', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player, reason })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Kicked ${player}`, 'success');
            setTimeout(() => loadPlayers(), 1000);
        } else {
            showNotification(data.error || 'Failed to kick player', 'error');
        }
    } catch (error) {
        showNotification('Error kicking player', 'error');
    }
}

async function banPlayer(player, reason = '') {
    const confirmed = await showConfirmation(
        'Ban Player',
        `Are you sure you want to BAN ${player}? This is permanent.`
    );
    
    if (!confirmed) return;
    
    try {
        const response = await apiRequest('/api/players/ban', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player, reason, confirmed: true })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Banned ${player}`, 'success');
            setTimeout(() => loadPlayers(), 1000);
        } else {
            showNotification(data.error || 'Failed to ban player', 'error');
        }
    } catch (error) {
        showNotification('Error banning player', 'error');
    }
}

async function opPlayer(player) {
    try {
        const response = await apiRequest('/api/players/op', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Gave OP to ${player}`, 'success');
        } else {
            showNotification(data.error || 'Failed to OP player', 'error');
        }
    } catch (error) {
        showNotification('Error giving OP', 'error');
    }
}

async function deopPlayer(player) {
    try {
        const response = await apiRequest('/api/players/deop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Removed OP from ${player}`, 'success');
        } else {
            showNotification(data.error || 'Failed to remove OP', 'error');
        }
    } catch (error) {
        showNotification('Error removing OP', 'error');
    }
}

async function changeGamemode(player, mode) {
    try {
        const response = await apiRequest('/api/players/gamemode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player, mode })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Changed ${player}'s gamemode to ${mode}`, 'success');
        } else {
            showNotification(data.error || 'Failed to change gamemode', 'error');
        }
    } catch (error) {
        showNotification('Error changing gamemode', 'error');
    }
}

async function warnPlayer(player, reason) {
    if (!reason) {
        // Use browser prompt as showPrompt doesn't exist yet
        reason = prompt('Enter warning reason:');
        if (!reason) return;
    }

    try {
        const response = await apiRequest('/api/players/warn', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player, reason })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Warned ${player}`, 'success');
            loadActionHistory();
        } else {
            showNotification(data.error || 'Failed to warn player', 'error');
        }
    } catch (error) {
        showNotification('Error warning player', 'error');
    }
}

async function mutePlayer(player) {
    // Use browser prompt as showPrompt doesn't exist yet
    const reason = prompt('Enter reason for mute:');
    if (!reason) return;
    
    const duration = prompt('Enter duration (e.g., 1h, 30m, leave blank for permanent):');

    try {
        const response = await apiRequest('/api/players/mute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player, reason, duration: duration || undefined })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Muted ${player}`, 'success');
            loadActionHistory();
        } else {
            showNotification(data.error || 'Failed to mute player', 'error');
        }
    } catch (error) {
        showNotification('Error muting player', 'error');
    }
}

async function unmutePlayer(player) {
    try {
        const response = await apiRequest('/api/players/unmute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Unmuted ${player}`, 'success');
            loadActionHistory();
        } else {
            showNotification(data.error || 'Failed to unmute player', 'error');
        }
    } catch (error) {
        showNotification('Error unmuting player', 'error');
    }
}

async function loadWhitelist() {
    try {
        const response = await apiRequest('/api/players/whitelist');
        const data = await response.json();
        
        if (data.success) {
            renderWhitelist(data.whitelist);
        }
    } catch (error) {
        console.error('Error loading whitelist:', error);
        const whitelistList = document.getElementById('whitelistList');
        if (whitelistList) {
            whitelistList.innerHTML = '<p class="loading-text" style="color: var(--error-color);">Failed to load whitelist</p>';
        }
    }
}

function renderWhitelist(whitelist) {
    const whitelistList = document.getElementById('whitelistList');
    if (!whitelistList) return;
    
    if (!whitelist || whitelist.length === 0) {
        whitelistList.innerHTML = '<p class="loading-text">No players whitelisted</p>';
        return;
    }
    
    whitelistList.innerHTML = '';
    whitelist.forEach(entry => {
        const item = document.createElement('div');
        item.className = 'whitelist-grid-item';
        
        const addedDate = new Date(entry.added_at);
        
        item.innerHTML = `
            <div class="whitelist-player-name">${entry.player_username}</div>
            <div class="whitelist-player-meta">
                Added by ${entry.added_by}
            </div>
            <div class="whitelist-player-meta">
                ${addedDate.toLocaleDateString()}
            </div>
            ${entry.notes ? `<div class="whitelist-player-meta" style="font-style: italic; margin-top: var(--space-1);">${entry.notes}</div>` : ''}
            <div class="whitelist-player-actions">
                <button class="btn btn-danger btn-sm whitelist-remove-btn" data-player="${entry.player_username}">Remove</button>
            </div>
        `;
        
        whitelistList.appendChild(item);
    });
}

async function addToWhitelist(player, notes) {
    try {
        const response = await apiRequest('/api/players/whitelist/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player, notes })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Added ${player} to whitelist`, 'success');
            loadWhitelist();
            
            // Clear inputs
            const playerInput = document.getElementById('whitelistPlayerInput');
            const notesInput = document.getElementById('whitelistNotesInput');
            if (playerInput) playerInput.value = '';
            if (notesInput) notesInput.value = '';
        } else {
            showNotification(data.error || 'Failed to add to whitelist', 'error');
        }
    } catch (error) {
        showNotification('Error adding to whitelist', 'error');
    }
}

async function removeFromWhitelist(player) {
    const confirmed = await showConfirmation(
        'Remove from Whitelist',
        `Are you sure you want to remove ${player} from the whitelist?`
    );
    
    if (!confirmed) return;

    try {
        const response = await apiRequest('/api/players/whitelist/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Removed ${player} from whitelist`, 'success');
            loadWhitelist();
        } else {
            showNotification(data.error || 'Failed to remove from whitelist', 'error');
        }
    } catch (error) {
        showNotification('Error removing from whitelist', 'error');
    }
}

async function loadActionHistory(playerUuid = null) {
    try {
        const endpoint = playerUuid 
            ? `/api/players/${playerUuid}/history`
            : '/api/players/actions/all';
        
        const response = await apiRequest(endpoint);
        const data = await response.json();
        
        if (data.success) {
            renderActionHistory(data.actions);
        }
    } catch (error) {
        console.error('Error loading action history:', error);
        const historyList = document.getElementById('actionHistoryList');
        if (historyList) {
            historyList.innerHTML = '<p class="loading-text" style="color: var(--error-color);">Failed to load action history</p>';
        }
    }
}

function renderActionHistory(actions) {
    const historyList = document.getElementById('actionHistoryList');
    if (!historyList) return;
    
    if (!actions || actions.length === 0) {
        historyList.innerHTML = '<p class="loading-text">No action history</p>';
        return;
    }
    
    historyList.innerHTML = '';
    actions.forEach(action => {
        const item = document.createElement('div');
        item.className = 'action-item';
        item.setAttribute('data-action', action.action_type);
        
        const actionDate = new Date(action.performed_at);
        const timeAgo = formatRelativeTime(actionDate);
        
        item.innerHTML = `
            <div class="action-header">
                <span class="action-type">${action.action_type.replace('_', ' ')}</span>
                <span class="action-time">${timeAgo}</span>
            </div>
            <div class="action-details">
                <strong>${action.player_username}</strong> by ${action.performed_by}
            </div>
            ${action.reason ? `<div class="action-reason">Reason: ${action.reason}</div>` : ''}
        `;
        
        historyList.appendChild(item);
    });
}

// Event delegation for player kick buttons (CSP compliant)
document.addEventListener('click', function(e) {
    if (e.target && e.target.matches('.player-kick-btn')) {
        var player = e.target.dataset.player;
        if (player) {
            kickPlayer(player);
        }
    }
    
    // Whitelist remove buttons
    if (e.target && e.target.matches('.whitelist-remove-btn')) {
        var player = e.target.dataset.player;
        if (player) {
            removeFromWhitelist(player);
        }
    }
});

// Initialize player management features when navigating to players section
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the main console page (has players section)
    if (document.getElementById('players')) {
        // Initialize new features
        initPlayerSearch();
        initSortTabs();
        initModalEvents();
        
        // Add teleport button handler
        const teleportBtn = document.getElementById('teleportPlayerBtn');
        if (teleportBtn) {
            teleportBtn.addEventListener('click', () => {
                const playerInput = document.getElementById('playerNameInput');
                const playerName = playerInput ? playerInput.value.trim() : '';
                if (playerName) {
                    teleportPlayer(playerName);
                } else {
                    showNotification('Please enter a player name', 'error');
                }
            });
        }
        
        // Load whitelist and history when players section becomes active
        const playersSection = document.getElementById('players');
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (playersSection.classList.contains('active')) {
                        loadWhitelist();
                        loadActionHistory();
                    }
                }
            });
        });
        
        observer.observe(playersSection, { attributes: true });
        
        // Also load on initial page load if section is already active
        if (playersSection.classList.contains('active')) {
            loadWhitelist();
            loadActionHistory();
        }
    }
});
