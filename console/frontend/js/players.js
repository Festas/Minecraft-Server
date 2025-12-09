// Player management
async function loadPlayers() {
    try {
        // Fetch all players with stats
        const response = await apiRequest('/api/players/all');
        const data = await response.json();
        
        if (data.success) {
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
        onlinePlayersCount.textContent = `(${data.onlineCount} online)`;
    }
    
    if (totalPlayersCount) {
        totalPlayersCount.textContent = `(${data.totalPlayers} total)`;
    }
    
    // Render online players list
    if (onlinePlayersList) {
        const onlinePlayers = data.players ? data.players.filter(p => p.isOnline) : [];
        
        if (onlinePlayers.length === 0) {
            onlinePlayersList.innerHTML = '<p class="no-players">No players are currently online</p>';
        } else {
            onlinePlayersList.innerHTML = '';
            onlinePlayers.forEach(player => {
                onlinePlayersList.appendChild(createPlayerItem(player));
            });
        }
    }
    
    // Render all players list (sorted by playtime)
    if (allPlayersList) {
        if (!data.players || data.players.length === 0) {
            allPlayersList.innerHTML = '<p class="no-players">No players have joined yet</p>';
        } else {
            allPlayersList.innerHTML = '';
            data.players.forEach(player => {
                allPlayersList.appendChild(createPlayerItem(player));
            });
        }
    }
}

/**
 * Create a player item element
 */
function createPlayerItem(player) {
    const playerItem = document.createElement('div');
    playerItem.className = 'player-item' + (player.isOnline ? ' player-online' : '');
    
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
    
    // Use avatar URL from API response if available, otherwise construct from username
    const avatarUrl = player.avatar || `https://mc-heads.net/avatar/${player.username}/48`;
    
    playerItem.innerHTML = `
        <div class="player-info">
            <img 
                src="${avatarUrl}" 
                alt="${player.username}" 
                class="player-avatar"
                onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22><rect fill=%22%23666%22 width=%2248%22 height=%2248%22/></svg>'"
            >
            <div class="player-details">
                <div class="player-name">
                    ${player.username}
                    ${player.isOnline ? '<span class="online-badge">●</span>' : ''}
                </div>
                <div class="player-stats">
                    <span class="stat-item">⏱️ ${player.formattedPlaytime}</span>
                    <span class="stat-item">👋 ${lastSeenStr}</span>
                </div>
            </div>
        </div>
        <div class="player-actions">
            ${player.isOnline ? '<button class="btn btn-sm player-kick-btn" data-player="' + player.username + '">Kick</button>' : ''}
        </div>
    `;
    
    return playerItem;
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

function updatePlayerCount(online, max) {
    const playerCount = document.getElementById('playerCount');
    const onlinePlayersCount = document.getElementById('onlinePlayersCount');
    
    // Add null checks with fallback values using nullish coalescing
    const onlineCount = online ?? 0;
    const maxCount = max ?? 20;
    
    if (playerCount) {
        playerCount.textContent = `${onlineCount}/${maxCount} Players`;
    }
    
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
        reason = await showPrompt('Warn Player', 'Enter warning reason:');
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
    const reason = await showPrompt('Mute Player', 'Enter reason for mute:');
    if (!reason) return;
    
    const duration = await showPrompt('Mute Duration', 'Enter duration (e.g., 1h, 30m, leave blank for permanent):');

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
        item.className = 'whitelist-item';
        
        const addedDate = new Date(entry.added_at);
        
        item.innerHTML = `
            <div class="whitelist-info">
                <div class="whitelist-player">${entry.player_username}</div>
                <div class="whitelist-meta">
                    Added by ${entry.added_by} on ${addedDate.toLocaleDateString()}
                </div>
                ${entry.notes ? `<div class="whitelist-notes">${entry.notes}</div>` : ''}
            </div>
            <button class="btn btn-sm btn-danger whitelist-remove-btn" data-player="${entry.player_username}">Remove</button>
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

// Initialize whitelist and action history when players tab is loaded
if (typeof initializePlayers !== 'undefined') {
    const originalInitializePlayers = initializePlayers;
    initializePlayers = function() {
        originalInitializePlayers();
        loadWhitelist();
        loadActionHistory();
    };
}