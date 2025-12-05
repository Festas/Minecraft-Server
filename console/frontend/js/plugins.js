// Plugin Manager UI Logic

let csrfToken = '';
let plugins = [];
let history = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await fetchCsrfToken();
    await loadPlugins();
    await loadHistory();
    initializeEventListeners();
});

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/session');
        const data = await response.json();
        
        if (!data.authenticated) {
            window.location.href = '/console/login.html';
            return;
        }
        
        document.getElementById('currentUser').textContent = data.username;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/console/login.html';
    }
}

// Fetch CSRF token
async function fetchCsrfToken() {
    try {
        const response = await fetch('/api/csrf-token');
        const data = await response.json();
        csrfToken = data.csrfToken;
    } catch (error) {
        console.error('Failed to fetch CSRF token:', error);
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Install plugin
    document.getElementById('installBtn').addEventListener('click', handleInstall);
    document.getElementById('pluginUrl').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleInstall();
    });
    
    // Bulk install
    document.getElementById('bulkInstallBtn').addEventListener('click', showBulkModal);
    document.getElementById('bulkInstallStart').addEventListener('click', handleBulkInstall);
    document.getElementById('bulkCancel').addEventListener('click', hideBulkModal);
    
    // Refresh
    document.getElementById('refreshPluginsBtn').addEventListener('click', loadPlugins);
    
    // Clear history
    document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
    
    // Modal close
    document.getElementById('confirmNo').addEventListener('click', hideConfirmModal);
    document.getElementById('optionsCancel').addEventListener('click', hideOptionsModal);
}

// Logout
async function logout() {
    try {
        await fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            }
        });
        window.location.href = '/console/login.html';
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

// Load plugins
async function loadPlugins() {
    try {
        const response = await fetch('/api/plugins', {
            headers: {
                'CSRF-Token': csrfToken
            }
        });
        const data = await response.json();
        
        if (data.plugins) {
            plugins = data.plugins;
            renderPlugins();
        }
    } catch (error) {
        console.error('Failed to load plugins:', error);
        showToast('Failed to load plugins', 'error');
    }
}

// Render plugins list
function renderPlugins() {
    const container = document.getElementById('pluginsList');
    const count = document.getElementById('pluginCount');
    
    count.textContent = plugins.length;
    
    if (plugins.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔌</div>
                <p>No plugins installed yet</p>
                <p>Install your first plugin using the URL field above</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = plugins.map(plugin => `
        <div class="plugin-item" data-plugin="${plugin.name}">
            <div class="plugin-info">
                <div class="plugin-toggle">
                    <label class="toggle-switch">
                        <input type="checkbox" ${plugin.enabled ? 'checked' : ''} 
                               onchange="togglePlugin('${plugin.name}', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="plugin-details">
                    <div class="plugin-name">${escapeHtml(plugin.name)}</div>
                    <div class="plugin-meta">
                        ${plugin.version ? `<span class="plugin-version">v${escapeHtml(plugin.version)}</span>` : ''}
                        <span class="plugin-source">${escapeHtml(plugin.source || 'unknown')}</span>
                        ${plugin.category ? `<span class="plugin-category">${escapeHtml(plugin.category)}</span>` : ''}
                    </div>
                    ${plugin.description ? `<div class="plugin-description">${escapeHtml(plugin.description)}</div>` : ''}
                </div>
            </div>
            <div class="plugin-actions">
                ${plugin.hasBackup ? `<button class="action-btn" onclick="rollbackPlugin('${plugin.name}')" title="Rollback to backup">↩️</button>` : ''}
                <button class="action-btn danger" onclick="confirmUninstall('${plugin.name}')" title="Uninstall">🗑️</button>
            </div>
        </div>
    `).join('');
}

// Handle plugin installation
async function handleInstall() {
    const url = document.getElementById('pluginUrl').value.trim();
    const customName = document.getElementById('customName').value.trim();
    
    if (!url) {
        showToast('Please enter a plugin URL', 'error');
        return;
    }
    
    try {
        showToast('Installing plugin...', 'info');
        
        const response = await fetch('/api/plugins/install', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify({ url, customName: customName || null })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Installation failed');
        }
        
        handleInstallResult(result, url);
    } catch (error) {
        console.error('Install error:', error);
        showToast(`Installation failed: ${error.message}`, 'error');
    }
}

// Handle installation result
function handleInstallResult(result, url) {
    if (result.status === 'multiple-options') {
        showOptionsModal(result.options, url);
    } else if (result.status === 'exists') {
        showConflictDialog(result, url);
    } else if (result.status === 'installed') {
        showToast(`✅ Successfully installed ${result.pluginName} v${result.version}`, 'success');
        document.getElementById('pluginUrl').value = '';
        document.getElementById('customName').value = '';
        loadPlugins();
        loadHistory();
    }
}

// Show options modal for multiple JARs
function showOptionsModal(options, url) {
    const modal = document.getElementById('optionsModal');
    const list = document.getElementById('optionsList');
    
    list.innerHTML = options.map((option, index) => `
        <div class="option-item ${index === 0 ? 'recommended' : ''}" onclick="selectOption('${url}', '${option.downloadUrl}')">
            <div class="option-name">${escapeHtml(option.filename)} ${index === 0 ? '← Recommended' : ''}</div>
            <div class="option-size">${formatBytes(option.size)}</div>
        </div>
    `).join('');
    
    modal.style.display = 'flex';
}

// Select option from multiple JARs
async function selectOption(originalUrl, selectedUrl) {
    hideOptionsModal();
    
    try {
        showToast('Installing selected plugin...', 'info');
        
        const response = await fetch('/api/plugins/install', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify({ 
                url: originalUrl,
                selectedOption: selectedUrl 
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Installation failed');
        }
        
        handleInstallResult(result, originalUrl);
    } catch (error) {
        console.error('Install error:', error);
        showToast(`Installation failed: ${error.message}`, 'error');
    }
}

// Show conflict dialog (plugin exists)
function showConflictDialog(result, url) {
    const { pluginName, currentVersion, newVersion, comparison } = result;
    
    let title, message, actions;
    
    if (comparison === 'upgrade') {
        title = '⬆️ Update Available';
        message = `${pluginName} v${currentVersion} → v${newVersion}`;
        actions = [
            { label: 'Update', value: 'update', class: 'btn-primary' },
            { label: 'Skip', value: null, class: 'btn-secondary' }
        ];
    } else if (comparison === 'downgrade') {
        title = '⚠️ Downgrade Warning';
        message = `${pluginName} v${currentVersion} → v${newVersion} (older version)`;
        actions = [
            { label: 'Downgrade Anyway', value: 'downgrade', class: 'btn-warning' },
            { label: 'Keep Current', value: null, class: 'btn-secondary' }
        ];
    } else {
        title = 'ℹ️ Same Version';
        message = `${pluginName} v${currentVersion} is already installed`;
        actions = [
            { label: 'Reinstall', value: 'reinstall', class: 'btn-primary' },
            { label: 'Keep Current', value: null, class: 'btn-secondary' }
        ];
    }
    
    showConfirmModal(title, message, (action) => {
        if (action) {
            proceedWithInstall(url, pluginName, action);
        }
    }, actions);
}

// Proceed with installation after conflict
async function proceedWithInstall(url, pluginName, action) {
    try {
        showToast(`${action === 'update' ? 'Updating' : action === 'downgrade' ? 'Downgrading' : 'Reinstalling'} plugin...`, 'info');
        
        const response = await fetch('/api/plugins/proceed-install', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify({ url, pluginName, action })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Installation failed');
        }
        
        showToast(`✅ Successfully ${action === 'update' ? 'updated' : action === 'downgrade' ? 'downgraded' : 'reinstalled'} ${result.pluginName} to v${result.version}`, 'success');
        document.getElementById('pluginUrl').value = '';
        document.getElementById('customName').value = '';
        loadPlugins();
        loadHistory();
    } catch (error) {
        console.error('Install error:', error);
        showToast(`Installation failed: ${error.message}`, 'error');
    }
}

// Toggle plugin enabled state
async function togglePlugin(pluginName, enabled) {
    try {
        const response = await fetch('/api/plugins/toggle', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify({ pluginName, enabled })
        });
        
        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Toggle failed');
        }
        
        showToast(`Plugin ${enabled ? 'enabled' : 'disabled'}`, 'success');
        loadPlugins();
        loadHistory();
    } catch (error) {
        console.error('Toggle error:', error);
        showToast(`Failed to toggle plugin: ${error.message}`, 'error');
        loadPlugins(); // Reload to reset state
    }
}

// Confirm uninstall
function confirmUninstall(pluginName) {
    const actions = [
        { label: 'Delete JAR Only', value: 'jar', class: 'btn-warning' },
        { label: 'Delete JAR + Configs', value: 'full', class: 'btn-danger' },
        { label: 'Cancel', value: null, class: 'btn-secondary' }
    ];
    
    showConfirmModal(
        'Uninstall Plugin',
        `Do you want to uninstall ${pluginName}?`,
        (action) => {
            if (action) {
                uninstallPlugin(pluginName, action === 'full');
            }
        },
        actions
    );
}

// Uninstall plugin
async function uninstallPlugin(pluginName, deleteConfigs) {
    try {
        showToast('Uninstalling plugin...', 'info');
        
        const response = await fetch('/api/plugins/uninstall', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify({ pluginName, deleteConfigs })
        });
        
        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Uninstall failed');
        }
        
        showToast(`✅ Successfully uninstalled ${pluginName}`, 'success');
        loadPlugins();
        loadHistory();
    } catch (error) {
        console.error('Uninstall error:', error);
        showToast(`Uninstall failed: ${error.message}`, 'error');
    }
}

// Rollback plugin
async function rollbackPlugin(pluginName) {
    showConfirmModal(
        'Rollback Plugin',
        `Are you sure you want to rollback ${pluginName} to the backup version?`,
        async (confirmed) => {
            if (!confirmed) return;
            
            try {
                showToast('Rolling back plugin...', 'info');
                
                const response = await fetch('/api/plugins/rollback', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({ pluginName })
                });
                
                if (!response.ok) {
                    const result = await response.json();
                    throw new Error(result.error || 'Rollback failed');
                }
                
                const result = await response.json();
                showToast(`✅ Successfully rolled back ${pluginName} to v${result.version}`, 'success');
                loadPlugins();
                loadHistory();
            } catch (error) {
                console.error('Rollback error:', error);
                showToast(`Rollback failed: ${error.message}`, 'error');
            }
        }
    );
}

// Load history
async function loadHistory() {
    try {
        const response = await fetch('/api/plugins/history', {
            headers: {
                'CSRF-Token': csrfToken
            }
        });
        const data = await response.json();
        
        if (data.history) {
            history = data.history;
            renderHistory();
        }
    } catch (error) {
        console.error('Failed to load history:', error);
    }
}

// Render history
function renderHistory() {
    const container = document.getElementById('historyList');
    
    if (history.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No installation history yet</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = history.slice(0, 20).map(entry => {
        const icon = getHistoryIcon(entry.action);
        const time = formatTime(entry.timestamp);
        
        return `
            <div class="history-item">
                <div class="history-icon">${icon}</div>
                <div class="history-details">
                    <div class="history-action">${formatHistoryAction(entry)}</div>
                    <div class="history-time">${time}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Get history icon
function getHistoryIcon(action) {
    const icons = {
        'installed': '✅',
        'updated': '⬆️',
        'downgraded': '⬇️',
        'reinstalled': '🔄',
        'uninstalled': '🗑️',
        'rolled-back': '↩️',
        'enabled': '✅',
        'disabled': '⏸️'
    };
    return icons[action] || '📝';
}

// Format history action
function formatHistoryAction(entry) {
    const action = entry.action.charAt(0).toUpperCase() + entry.action.slice(1);
    const version = entry.version ? ` v${entry.version}` : '';
    return `${action} ${escapeHtml(entry.plugin)}${version}`;
}

// Clear history
async function clearHistory() {
    showConfirmModal(
        'Clear History',
        'Are you sure you want to clear all installation history?',
        async (confirmed) => {
            if (!confirmed) return;
            
            try {
                // Clear history by writing empty array
                history = [];
                renderHistory();
                showToast('History cleared', 'success');
            } catch (error) {
                console.error('Failed to clear history:', error);
                showToast('Failed to clear history', 'error');
            }
        }
    );
}

// Bulk install modal
function showBulkModal() {
    document.getElementById('bulkModal').style.display = 'flex';
    document.getElementById('bulkUrls').value = '';
    document.getElementById('bulkProgress').style.display = 'none';
}

function hideBulkModal() {
    document.getElementById('bulkModal').style.display = 'none';
}

// Handle bulk install
async function handleBulkInstall() {
    const urlsText = document.getElementById('bulkUrls').value.trim();
    
    if (!urlsText) {
        showToast('Please enter at least one URL', 'error');
        return;
    }
    
    const urls = urlsText.split('\n').map(u => u.trim()).filter(u => u);
    
    if (urls.length === 0) {
        showToast('No valid URLs found', 'error');
        return;
    }
    
    const progressDiv = document.getElementById('bulkProgress');
    progressDiv.style.display = 'block';
    progressDiv.innerHTML = '';
    
    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        const progressItem = document.createElement('div');
        progressItem.className = 'progress-item pending';
        progressItem.textContent = `⏳ ${url}`;
        progressDiv.appendChild(progressItem);
        
        try {
            const response = await fetch('/api/plugins/install', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': csrfToken
                },
                body: JSON.stringify({ url })
            });
            
            const result = await response.json();
            
            if (response.ok && result.status === 'installed') {
                progressItem.className = 'progress-item success';
                progressItem.textContent = `✅ ${result.pluginName} v${result.version}`;
            } else {
                progressItem.className = 'progress-item error';
                progressItem.textContent = `❌ ${url} - ${result.error || 'Failed'}`;
            }
        } catch (error) {
            progressItem.className = 'progress-item error';
            progressItem.textContent = `❌ ${url} - ${error.message}`;
        }
    }
    
    loadPlugins();
    loadHistory();
    showToast('Bulk installation completed', 'info');
}

// Utility functions
function showConfirmModal(title, message, callback, actions = null) {
    const modal = document.getElementById('confirmModal');
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    
    if (actions) {
        const actionsDiv = modal.querySelector('.modal-actions');
        actionsDiv.innerHTML = actions.map(action => 
            `<button class="btn ${action.class}" data-value="${action.value || ''}">${action.label}</button>`
        ).join('');
        
        actionsDiv.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                const value = btn.dataset.value;
                hideConfirmModal();
                callback(value || null);
            });
        });
    } else {
        document.getElementById('confirmYes').onclick = () => {
            hideConfirmModal();
            callback(true);
        };
    }
    
    modal.style.display = 'flex';
}

function hideConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
}

function hideOptionsModal() {
    document.getElementById('optionsModal').style.display = 'none';
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' minutes ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' hours ago';
    if (diff < 604800000) return Math.floor(diff / 86400000) + ' days ago';
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}
