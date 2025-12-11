// Plugin Manager - Simplified Overview with Commands

let plugins = [];

// Plugin commands data structure
const pluginCommands = {
    'EssentialsX': [
        { cmd: '/heal <player>', desc: 'Heal a player' },
        { cmd: '/feed <player>', desc: 'Feed a player' },
        { cmd: '/tp <player> <target>', desc: 'Teleport player to target' },
        { cmd: '/home', desc: 'Teleport to home' },
        { cmd: '/spawn', desc: 'Teleport to spawn' },
        { cmd: '/warp <name>', desc: 'Teleport to warp' },
        { cmd: '/god <player>', desc: 'Toggle god mode' },
        { cmd: '/fly <player>', desc: 'Toggle fly mode' }
    ],
    'WorldEdit': [
        { cmd: '//wand', desc: 'Get selection wand' },
        { cmd: '//pos1', desc: 'Set position 1' },
        { cmd: '//pos2', desc: 'Set position 2' },
        { cmd: '//copy', desc: 'Copy selection' },
        { cmd: '//paste', desc: 'Paste clipboard' },
        { cmd: '//set <block>', desc: 'Fill selection with block' },
        { cmd: '//replace <from> <to>', desc: 'Replace blocks' },
        { cmd: '//undo', desc: 'Undo last action' }
    ],
    'LuckPerms': [
        { cmd: '/lp user <user> info', desc: 'View user info' },
        { cmd: '/lp user <user> permission set <perm>', desc: 'Set permission' },
        { cmd: '/lp group <group> info', desc: 'View group info' },
        { cmd: '/lp editor', desc: 'Open web editor' }
    ],
    'Vault': [
        { cmd: '/balance', desc: 'Check balance' },
        { cmd: '/pay <player> <amount>', desc: 'Pay another player' }
    ],
    'WorldGuard': [
        { cmd: '/rg define <region>', desc: 'Define a new region' },
        { cmd: '/rg claim <region>', desc: 'Claim a region' },
        { cmd: '/rg flag <region> <flag> <value>', desc: 'Set region flag' },
        { cmd: '/rg addmember <region> <player>', desc: 'Add member to region' }
    ],
    'CoreProtect': [
        { cmd: '/co inspect', desc: 'Enable block inspector' },
        { cmd: '/co lookup', desc: 'Lookup block changes' },
        { cmd: '/co rollback', desc: 'Rollback changes' },
        { cmd: '/co restore', desc: 'Restore changes' }
    ],
    'Multiverse-Core': [
        { cmd: '/mv create <world> <type>', desc: 'Create new world' },
        { cmd: '/mv tp <world>', desc: 'Teleport to world' },
        { cmd: '/mv list', desc: 'List all worlds' },
        { cmd: '/mv load <world>', desc: 'Load world' }
    ],
    'PlaceholderAPI': [
        { cmd: '/papi ecloud download <placeholder>', desc: 'Download expansion' },
        { cmd: '/papi reload', desc: 'Reload PlaceholderAPI' },
        { cmd: '/papi list', desc: 'List installed expansions' }
    ],
    'default': [
        { cmd: '/<plugin> help', desc: 'Show plugin help' },
        { cmd: '/<plugin> reload', desc: 'Reload plugin config' }
    ]
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadMetaInfo();
    await loadPlugins();
    initializeEventListeners();
});

// Check authentication
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
        
        document.getElementById('currentUser').textContent = data.username;
        document.getElementById('currentUserInfo').textContent = `User: ${data.username}`;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/console/login.html';
    }
}

// Load meta information (Minecraft version, domain)
async function loadMetaInfo() {
    try {
        const response = await fetch('/api/server/status', {
            credentials: 'same-origin'
        });
        
        if (response.ok) {
            const data = await response.json();
            
            const version = data.version || 'Unknown';
            document.getElementById('minecraftVersion').textContent = `Minecraft: ${version}`;
            
            const domain = window.location.hostname;
            document.getElementById('domainInfo').textContent = `Domain: ${domain}`;
        }
    } catch (error) {
        console.error('Error loading meta info:', error);
        document.getElementById('minecraftVersion').textContent = 'Minecraft: Unknown';
        document.getElementById('domainInfo').textContent = `Domain: ${window.location.hostname}`;
    }
}

// Load plugins list
async function loadPlugins() {
    try {
        const response = await fetch('/api/plugins/list', {
            credentials: 'same-origin'
        });
        
        const data = await response.json();
        
        if (data.success) {
            plugins = data.plugins || [];
            updateStats();
            renderPluginsList();
        } else {
            showToast('Failed to load plugins', 'error');
        }
    } catch (error) {
        console.error('Error loading plugins:', error);
        showToast('Error loading plugins', 'error');
        document.getElementById('pluginsList').innerHTML = '<div class="empty-state">Error loading plugins</div>';
    }
}

// Update plugin statistics
function updateStats() {
    const total = plugins.length;
    const enabled = plugins.filter(p => p.enabled).length;
    const disabled = total - enabled;
    
    document.getElementById('totalPlugins').textContent = total;
    document.getElementById('enabledPlugins').textContent = enabled;
    document.getElementById('disabledPlugins').textContent = disabled;
}

// Render plugins list
function renderPluginsList() {
    const container = document.getElementById('pluginsList');
    
    if (plugins.length === 0) {
        container.innerHTML = '<div class="empty-state">No plugins installed</div>';
        return;
    }
    
    const html = plugins.map(plugin => renderPluginCard(plugin)).join('');
    container.innerHTML = html;
    
    // Initialize accordion after rendering
    initAccordion();
}

// Render individual plugin card
function renderPluginCard(plugin) {
    const commands = pluginCommands[plugin.name] || pluginCommands['default'];
    const statusClass = plugin.enabled ? 'enabled' : 'disabled';
    const statusIcon = plugin.enabled ? '🟢' : '🔴';
    
    return `
        <div class="plugin-accordion-item ${statusClass}">
            <div class="plugin-accordion-header" data-plugin="${escapeHtml(plugin.name)}">
                <div class="plugin-header-left">
                    <span class="plugin-status-icon">${statusIcon}</span>
                    <div class="plugin-title-info">
                        <h4 class="plugin-name">${escapeHtml(plugin.name)}</h4>
                        <span class="plugin-version">v${escapeHtml(plugin.version || '?')}</span>
                    </div>
                </div>
                <div class="plugin-header-right">
                    <span class="plugin-author">${escapeHtml(plugin.author || 'Unknown')}</span>
                    <span class="expand-icon">▼</span>
                </div>
            </div>
            <div class="plugin-accordion-content">
                <p class="plugin-description">${escapeHtml(plugin.description || 'No description available')}</p>
                
                <div class="plugin-commands">
                    <h5>📝 Useful Commands</h5>
                    <div class="commands-list">
                        ${commands.map(c => `
                            <div class="command-item">
                                <code class="command-code">${escapeHtml(c.cmd)}</code>
                                <span class="command-desc">${escapeHtml(c.desc)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                ${plugin.website ? `<a href="${escapeHtml(plugin.website)}" target="_blank" class="plugin-link">🔗 Plugin Website</a>` : ''}
            </div>
        </div>
    `;
}

// Initialize accordion functionality
function initAccordion() {
    document.querySelectorAll('.plugin-accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const isOpen = item.classList.contains('open');
            
            // Close all others
            document.querySelectorAll('.plugin-accordion-item.open').forEach(i => {
                i.classList.remove('open');
            });
            
            // Toggle current
            if (!isOpen) {
                item.classList.add('open');
            }
        });
    });
}

// Initialize event listeners
function initializeEventListeners() {
    // Initialize data-href navigation
    if (typeof initializeDataHrefNavigation === 'function') {
        initializeDataHrefNavigation();
    }
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Refresh button
    document.getElementById('refreshPluginsBtn').addEventListener('click', loadPlugins);
    
    // Search and filter
    initPluginSearch();
}

// Initialize plugin search and filter
function initPluginSearch() {
    document.getElementById('pluginSearchInput').addEventListener('input', filterPlugins);
    document.getElementById('pluginFilterSelect').addEventListener('change', filterPlugins);
}

// Filter plugins based on search and status
function filterPlugins() {
    const searchTerm = document.getElementById('pluginSearchInput').value.toLowerCase();
    const filterValue = document.getElementById('pluginFilterSelect').value;
    
    document.querySelectorAll('.plugin-accordion-item').forEach(item => {
        const name = item.querySelector('.plugin-name').textContent.toLowerCase();
        const isEnabled = item.classList.contains('enabled');
        
        const matchesSearch = name.includes(searchTerm);
        const matchesFilter = filterValue === 'all' || 
            (filterValue === 'enabled' && isEnabled) ||
            (filterValue === 'disabled' && !isEnabled);
        
        item.style.display = (matchesSearch && matchesFilter) ? '' : 'none';
    });
}

// Utility functions
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

function showToast(message, type = 'info') {
    if (typeof showNotification === 'function') {
        showNotification(message, type);
    } else {
        console.log(`[${type.toUpperCase()}]`, message);
    }
}

function logout() {
    window.location.href = '/console/login.html';
}
