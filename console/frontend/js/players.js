// Player management
async function loadPlayers() {
    try {
        const response = await apiRequest('/api/players/list');
        const data = await response.json();
        
        renderPlayersList(data);
        updatePlayerCount(data.online, data.max);
    } catch (error) {
        console.error('Error loading players:', error);
        // Add fallback on error
        updatePlayerCount(0, 20);
    }
}

function renderPlayersList(data) {
    const playersList = document.getElementById('playersList');
    
    if (!playersList) return;
    
    if (!data.players || data.players.length === 0) {
        playersList.innerHTML = '<p class="no-players">No players online</p>';
        return;
    }
    
    playersList.innerHTML = '';
    
    data.players.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        
        playerItem.innerHTML = `
            <div class="player-info">
                <img 
                    src="https://mc-heads.net/avatar/${player}/32" 
                    alt="${player}" 
                    class="player-avatar"
                    onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2232%22 height=%2232%22><rect fill=%22%23666%22 width=%2232%22 height=%2232%22/></svg>'"
                >
                <span>${player}</span>
            </div>
            <div class="player-actions">
                <button class="btn btn-sm player-kick-btn" data-player="${player}">Kick</button>
            </div>
        `;
        
        playersList.appendChild(playerItem);
    });
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

// Event delegation for player kick buttons (CSP compliant)
document.addEventListener('click', function(e) {
    if (e.target && e.target.matches('.player-kick-btn')) {
        var player = e.target.dataset.player;
        if (player) {
            kickPlayer(player);
        }
    }
});

