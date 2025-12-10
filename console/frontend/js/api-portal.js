/**
 * API Portal JavaScript
 * Handles API key management, documentation, and playground functionality
 */

// Global state
let apiKeys = [];
let availableScopes = [];
let selectedKeyForView = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    await checkAuth();
    
    // Load data
    await loadAvailableScopes();
    await loadApiKeys();
    
    // Setup event listeners
    setupEventListeners();
});

/**
 * Check if user is authenticated
 */
async function checkAuth() {
    try {
        const response = await fetch('/api/session');
        const data = await response.json();
        
        if (!data.authenticated) {
            window.location.href = '/console/login.html';
            return;
        }
        
        document.getElementById('currentUser').textContent = data.username || 'User';
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/console/login.html';
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    
    // Create key button
    document.getElementById('createKeyBtn').addEventListener('click', openCreateKeyModal);
    
    // Create key form
    document.getElementById('createKeyForm').addEventListener('submit', handleCreateKey);
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Playground
    document.getElementById('playgroundEndpoint').addEventListener('change', updateCodeExample);
    document.getElementById('tryRequestBtn').addEventListener('click', tryApiRequest);
}

/**
 * Switch tabs
 */
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });
    
    // Load playground keys if needed
    if (tabName === 'playground') {
        loadPlaygroundKeys();
    }
}

/**
 * Load available scopes
 */
async function loadAvailableScopes() {
    try {
        const response = await fetch('/api/api-keys/scopes');
        const data = await response.json();
        
        if (data.success) {
            availableScopes = data.scopes;
            renderScopeSelector();
        }
    } catch (error) {
        console.error('Failed to load scopes:', error);
        showToast('Failed to load available scopes', 'error');
    }
}

/**
 * Load API keys
 */
async function loadApiKeys() {
    try {
        const response = await fetch('/api/api-keys');
        const data = await response.json();
        
        if (data.success) {
            apiKeys = data.api_keys;
            renderApiKeys();
        }
    } catch (error) {
        console.error('Failed to load API keys:', error);
        showToast('Failed to load API keys', 'error');
    }
}

/**
 * Render API keys list
 */
function renderApiKeys() {
    const container = document.getElementById('apiKeysList');
    
    if (apiKeys.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
                <p style="font-size: 18px; margin-bottom: 8px;">No API keys yet</p>
                <p>Create your first API key to get started with the API</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = apiKeys.map(key => `
        <div class="api-key-card">
            <div class="api-key-header">
                <div>
                    <h3 style="margin: 0;">${escapeHtml(key.name)}</h3>
                    <span class="api-key-prefix">${escapeHtml(key.key_prefix)}...</span>
                </div>
                <div style="display: flex; gap: 8px;">
                    <span class="badge ${key.enabled ? 'badge-enabled' : 'badge-disabled'}">
                        ${key.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                </div>
            </div>
            <div style="margin: 12px 0;">
                ${key.scopes.map(scope => `<span class="scope-tag">${escapeHtml(scope)}</span>`).join('')}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
                <div style="font-size: 13px; color: var(--text-muted);">
                    <div>Rate Limit: ${key.rate_limit_per_hour}/hour</div>
                    <div>Usage: ${key.use_count || 0} requests</div>
                    ${key.last_used ? `<div>Last used: ${new Date(key.last_used).toLocaleString()}</div>` : ''}
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-sm btn-secondary" onclick="viewKey('${key.id}')">View Stats</button>
                    <button class="btn btn-sm btn-secondary" onclick="editKey('${key.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="revokeKey('${key.id}', '${escapeHtml(key.name)}')">Revoke</button>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Render scope selector
 */
function renderScopeSelector() {
    const container = document.getElementById('scopeSelector');
    
    container.innerHTML = availableScopes.map(scope => `
        <div class="scope-option">
            <label style="display: flex; align-items: start; cursor: pointer;">
                <input type="checkbox" name="scopes" value="${scope.scope}" style="margin-right: 8px; margin-top: 2px;">
                <div>
                    <div style="font-weight: 500;">${escapeHtml(scope.scope)}</div>
                    <div style="font-size: 13px; color: var(--text-muted);">${escapeHtml(scope.description)}</div>
                </div>
            </label>
        </div>
    `).join('');
}

/**
 * Open create key modal
 */
function openCreateKeyModal() {
    document.getElementById('createKeyModal').style.display = 'block';
}

/**
 * Close create key modal
 */
function closeCreateKeyModal() {
    document.getElementById('createKeyModal').style.display = 'none';
    document.getElementById('createKeyForm').reset();
}

/**
 * Handle create key form submission
 */
async function handleCreateKey(e) {
    e.preventDefault();
    
    const name = document.getElementById('keyName').value;
    const scopes = Array.from(document.querySelectorAll('input[name="scopes"]:checked')).map(cb => cb.value);
    const rateLimit = parseInt(document.getElementById('rateLimit').value);
    const expiresAt = document.getElementById('expiresAt').value || null;
    
    if (scopes.length === 0) {
        showToast('Please select at least one scope', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/api-keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                scopes,
                rate_limit_per_hour: rateLimit,
                expires_at: expiresAt
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('API key created successfully', 'success');
            closeCreateKeyModal();
            await loadApiKeys();
            
            // Show the new key
            showNewKey(data.api_key.api_key);
        } else {
            showToast(data.error || 'Failed to create API key', 'error');
        }
    } catch (error) {
        console.error('Failed to create API key:', error);
        showToast('Failed to create API key', 'error');
    }
}

/**
 * Show new API key modal
 */
function showNewKey(apiKey) {
    document.getElementById('newKeyValue').textContent = apiKey;
    document.getElementById('showNewKeyModal').style.display = 'block';
}

/**
 * Close show new key modal
 */
function closeShowNewKeyModal() {
    document.getElementById('showNewKeyModal').style.display = 'none';
}

/**
 * Copy new key to clipboard
 */
function copyNewKey() {
    const keyValue = document.getElementById('newKeyValue').textContent;
    navigator.clipboard.writeText(keyValue).then(() => {
        showToast('API key copied to clipboard', 'success');
    });
}

/**
 * View key details
 */
async function viewKey(keyId) {
    try {
        const response = await fetch(`/api/api-keys/${keyId}/stats?start_date=${new Date(Date.now() - 30*24*60*60*1000).toISOString()}&end_date=${new Date().toISOString()}`);
        const data = await response.json();
        
        if (data.success) {
            const key = apiKeys.find(k => k.id === keyId);
            showKeyStats(key, data.stats);
        }
    } catch (error) {
        console.error('Failed to load key stats:', error);
        showToast('Failed to load API key statistics', 'error');
    }
}

/**
 * Show key statistics
 */
function showKeyStats(key, stats) {
    const content = document.getElementById('viewKeyContent');
    
    content.innerHTML = `
        <div style="margin: 16px 0;">
            <h3>${escapeHtml(key.name)}</h3>
            <p><code>${escapeHtml(key.key_prefix)}...</code></p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${stats.total_requests || 0}</div>
                <div class="stat-label">Total Requests</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.success_rate || 0}%</div>
                <div class="stat-label">Success Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.avg_response_time || 0}ms</div>
                <div class="stat-label">Avg Response Time</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.failed_requests || 0}</div>
                <div class="stat-label">Failed Requests</div>
            </div>
        </div>
        
        <h4>Scopes:</h4>
        <div style="margin: 12px 0;">
            ${key.scopes.map(scope => `<span class="scope-tag">${escapeHtml(scope)}</span>`).join('')}
        </div>
    `;
    
    document.getElementById('viewKeyModal').style.display = 'block';
}

/**
 * Close view key modal
 */
function closeViewKeyModal() {
    document.getElementById('viewKeyModal').style.display = 'none';
}

/**
 * Edit key
 */
async function editKey(keyId) {
    const key = apiKeys.find(k => k.id === keyId);
    if (!key) return;
    
    const newName = prompt('Enter new name:', key.name);
    if (!newName || newName === key.name) return;
    
    try {
        const response = await fetch(`/api/api-keys/${keyId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('API key updated successfully', 'success');
            await loadApiKeys();
        } else {
            showToast(data.error || 'Failed to update API key', 'error');
        }
    } catch (error) {
        console.error('Failed to update API key:', error);
        showToast('Failed to update API key', 'error');
    }
}

/**
 * Revoke key
 */
async function revokeKey(keyId, keyName) {
    if (!confirm(`Are you sure you want to revoke the API key "${keyName}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/api-keys/${keyId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('API key revoked successfully', 'success');
            await loadApiKeys();
        } else {
            showToast(data.error || 'Failed to revoke API key', 'error');
        }
    } catch (error) {
        console.error('Failed to revoke API key:', error);
        showToast('Failed to revoke API key', 'error');
    }
}

/**
 * Load playground keys
 */
function loadPlaygroundKeys() {
    const select = document.getElementById('playgroundKey');
    select.innerHTML = '<option value="">Select an API key...</option>' + 
        apiKeys.filter(k => k.enabled).map(key => 
            `<option value="${key.id}">${escapeHtml(key.name)} (${escapeHtml(key.key_prefix)}...)</option>`
        ).join('');
}

/**
 * Update code example
 */
function updateCodeExample() {
    const endpoint = document.getElementById('playgroundEndpoint').value;
    const codeBlock = document.getElementById('codeExample');
    
    codeBlock.textContent = `// JavaScript/Node.js Example
fetch('${window.location.origin}${endpoint}', {
    headers: {
        'Authorization': 'Bearer YOUR_API_KEY'
    }
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));

// cURL Example
curl -X GET "${window.location.origin}${endpoint}" \\
  -H "Authorization: Bearer YOUR_API_KEY"

// Python Example
import requests

response = requests.get(
    "${window.location.origin}${endpoint}",
    headers={"Authorization": "Bearer YOUR_API_KEY"}
)
print(response.json())`;
}

/**
 * Try API request in playground
 */
async function tryApiRequest() {
    const keyId = document.getElementById('playgroundKey').value;
    const endpoint = document.getElementById('playgroundEndpoint').value;
    
    if (!keyId) {
        showToast('Please select an API key', 'error');
        return;
    }
    
    const key = apiKeys.find(k => k.id === keyId);
    if (!key) return;
    
    // Note: For security, we can't use the actual API key client-side
    // Instead, we'll use session authentication
    
    try {
        const response = await fetch(endpoint);
        const data = await response.json();
        
        const resultDiv = document.getElementById('playgroundResult');
        resultDiv.innerHTML = `
            <h3>Response (Status: ${response.status})</h3>
            <div class="code-block">${JSON.stringify(data, null, 2)}</div>
        `;
    } catch (error) {
        showToast('Request failed: ' + error.message, 'error');
    }
}

/**
 * Logout
 */
async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/console/login.html';
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
        color: white;
        border-radius: 4px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};
