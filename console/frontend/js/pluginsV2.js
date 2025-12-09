// Plugin Manager V2 UI Logic - Job Queue System

let bearerToken = '';
let plugins = [];
let jobs = [];
let pollInterval = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await promptForBearerToken();
    await loadPlugins();
    await loadJobs();
    initializeEventListeners();
    startJobPolling();
});

// Check authentication (still needed for UI access)
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
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/console/login.html';
    }
}

// Prompt for Bearer token
async function promptForBearerToken() {
    // Check if token is in localStorage
    const storedToken = localStorage.getItem('pluginAdminToken');
    
    if (storedToken) {
        bearerToken = storedToken;
        // Verify token works
        try {
            const response = await fetch('/api/v2/plugins/health', {
                headers: {
                    'Authorization': `Bearer ${bearerToken}`
                }
            });
            
            if (response.ok) {
                showToast('Bearer token loaded from storage', 'success');
                return;
            }
        } catch (error) {
            console.error('Stored token invalid:', error);
        }
    }
    
    // Prompt for token
    const token = prompt('Enter Plugin Admin Bearer Token (PLUGIN_ADMIN_TOKEN):\n\nThis token is required for plugin operations and can be found in your .env file.');
    
    if (!token) {
        showToast('Bearer token required for plugin operations', 'error');
        return;
    }
    
    bearerToken = token;
    
    // Verify token
    try {
        const response = await fetch('/api/v2/plugins/health', {
            headers: {
                'Authorization': `Bearer ${bearerToken}`
            }
        });
        
        if (response.ok) {
            localStorage.setItem('pluginAdminToken', bearerToken);
            showToast('Bearer token verified and saved', 'success');
        } else {
            showToast('Invalid Bearer token', 'error');
            bearerToken = '';
        }
    } catch (error) {
        console.error('Token verification failed:', error);
        showToast('Failed to verify token', 'error');
        bearerToken = '';
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // Initialize data-href navigation
    if (typeof initializeDataHrefNavigation === 'function') {
        initializeDataHrefNavigation();
    }
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Install plugin
    document.getElementById('installBtn').addEventListener('click', handleInstall);
    document.getElementById('pluginUrl').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleInstall();
    });
    
    // Refresh buttons
    document.getElementById('refreshJobsBtn').addEventListener('click', loadJobs);
    document.getElementById('refreshPluginsBtn').addEventListener('click', loadPlugins);
    
    // Modal close
    document.getElementById('jobModalClose').addEventListener('click', hideJobModal);
    
    // Event delegation for plugin actions
    document.addEventListener('click', function(e) {
        // Handle enable/disable toggle
        if (e.target && e.target.matches('.plugin-toggle')) {
            const pluginName = e.target.dataset.plugin;
            const enabled = e.target.checked;
            if (pluginName) {
                togglePlugin(pluginName, enabled);
            }
        }
        
        // Handle uninstall
        if (e.target && e.target.matches('.plugin-uninstall-btn')) {
            const pluginName = e.target.dataset.plugin;
            if (pluginName) {
                confirmUninstall(pluginName);
            }
        }
        
        // Handle job details
        if (e.target && e.target.matches('.job-details-btn')) {
            const jobId = e.target.dataset.jobId;
            if (jobId) {
                showJobDetails(jobId);
            }
        }
        
        // Handle job cancel
        if (e.target && e.target.matches('.job-cancel-btn')) {
            const jobId = e.target.dataset.jobId;
            if (jobId) {
                cancelJob(jobId);
            }
        }
    });
}

// Start polling for job updates
function startJobPolling() {
    // Poll every 2 seconds
    pollInterval = setInterval(() => {
        loadJobs();
    }, 2000);
}

// Stop polling
function stopJobPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
}

// Load plugins list
async function loadPlugins() {
    try {
        const response = await fetch('/api/v2/plugins/list', {
            headers: {
                'Authorization': `Bearer ${bearerToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            plugins = data.plugins;
            renderPluginsList();
        } else {
            showToast('Failed to load plugins', 'error');
        }
    } catch (error) {
        console.error('Error loading plugins:', error);
        showToast('Error loading plugins', 'error');
    }
}

// Load jobs
async function loadJobs() {
    try {
        const response = await fetch('/api/v2/plugins/jobs?limit=20', {
            headers: {
                'Authorization': `Bearer ${bearerToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            jobs = data.jobs;
            renderJobsLists();
        }
    } catch (error) {
        console.error('Error loading jobs:', error);
    }
}

// Handle install
async function handleInstall() {
    const url = document.getElementById('pluginUrl').value.trim();
    const customName = document.getElementById('customName').value.trim();
    
    if (!url) {
        showToast('Please enter a plugin URL', 'warning');
        return;
    }
    
    if (!bearerToken) {
        await promptForBearerToken();
        if (!bearerToken) return;
    }
    
    try {
        const response = await fetch('/api/v2/plugins/job', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${bearerToken}`
            },
            body: JSON.stringify({
                action: 'install',
                url: url,
                options: customName ? { customName } : {}
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(`Install job created: ${data.job.id}`, 'success');
            document.getElementById('pluginUrl').value = '';
            document.getElementById('customName').value = '';
            await loadJobs();
        } else {
            showToast(data.error || 'Failed to create install job', 'error');
        }
    } catch (error) {
        console.error('Error creating install job:', error);
        showToast('Error creating install job', 'error');
    }
}

// Toggle plugin
async function togglePlugin(pluginName, enabled) {
    if (!bearerToken) {
        await promptForBearerToken();
        if (!bearerToken) return;
    }
    
    try {
        const response = await fetch('/api/v2/plugins/job', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${bearerToken}`
            },
            body: JSON.stringify({
                action: enabled ? 'enable' : 'disable',
                name: pluginName
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(`${enabled ? 'Enable' : 'Disable'} job created for ${pluginName}`, 'success');
            await loadJobs();
        } else {
            showToast(data.error || 'Failed to create toggle job', 'error');
            await loadPlugins(); // Reload to reset toggle
        }
    } catch (error) {
        console.error('Error creating toggle job:', error);
        showToast('Error creating toggle job', 'error');
        await loadPlugins(); // Reload to reset toggle
    }
}

// Confirm uninstall
function confirmUninstall(pluginName) {
    if (confirm(`Are you sure you want to uninstall ${pluginName}?\n\nThis will delete the plugin JAR file.`)) {
        uninstallPlugin(pluginName);
    }
}

// Uninstall plugin
async function uninstallPlugin(pluginName) {
    if (!bearerToken) {
        await promptForBearerToken();
        if (!bearerToken) return;
    }
    
    try {
        const response = await fetch('/api/v2/plugins/job', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${bearerToken}`
            },
            body: JSON.stringify({
                action: 'uninstall',
                name: pluginName,
                options: { deleteConfigs: false }
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(`Uninstall job created for ${pluginName}`, 'success');
            await loadJobs();
        } else {
            showToast(data.error || 'Failed to create uninstall job', 'error');
        }
    } catch (error) {
        console.error('Error creating uninstall job:', error);
        showToast('Error creating uninstall job', 'error');
    }
}

// Cancel job
async function cancelJob(jobId) {
    if (!confirm('Are you sure you want to cancel this job?')) {
        return;
    }
    
    if (!bearerToken) {
        await promptForBearerToken();
        if (!bearerToken) return;
    }
    
    try {
        const response = await fetch(`/api/v2/plugins/job/${jobId}/cancel`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${bearerToken}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Job cancelled', 'success');
            await loadJobs();
        } else {
            showToast(data.error || 'Failed to cancel job', 'error');
        }
    } catch (error) {
        console.error('Error cancelling job:', error);
        showToast('Error cancelling job', 'error');
    }
}

// Show job details modal
async function showJobDetails(jobId) {
    const modal = document.getElementById('jobModal');
    const title = document.getElementById('jobModalTitle');
    const content = document.getElementById('jobModalContent');
    
    // Find job
    const job = jobs.find(j => j.id === jobId);
    
    if (!job) {
        showToast('Job not found', 'error');
        return;
    }
    
    title.textContent = `Job: ${job.id}`;
    
    let html = `
        <div class="job-details">
            <p><strong>Action:</strong> ${job.action}</p>
            <p><strong>Plugin:</strong> ${job.pluginName || 'N/A'}</p>
            <p><strong>URL:</strong> ${job.url || 'N/A'}</p>
            <p><strong>Status:</strong> <span class="status-${job.status}">${job.status}</span></p>
            <p><strong>Created:</strong> ${formatDate(job.createdAt)}</p>
            ${job.startedAt ? `<p><strong>Started:</strong> ${formatDate(job.startedAt)}</p>` : ''}
            ${job.completedAt ? `<p><strong>Completed:</strong> ${formatDate(job.completedAt)}</p>` : ''}
            ${job.error ? `<p><strong>Error:</strong> <span style="color: #e53e3e">${job.error}</span></p>` : ''}
        </div>
        
        ${job.logs && job.logs.length > 0 ? `
            <div class="job-logs">
                <h4>Logs:</h4>
                <div class="logs-container" style="background: #1a202c; color: #e2e8f0; padding: 1rem; border-radius: 4px; max-height: 300px; overflow-y: auto; font-family: monospace; font-size: 0.875rem;">
                    ${job.logs.map(log => `
                        <div class="log-entry">
                            <span style="color: #a0aec0">${formatTime(log.timestamp)}</span> ${escapeHtml(log.message)}
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '<p>No logs yet.</p>'}
    `;
    
    content.innerHTML = html;
    modal.classList.remove('hidden');
}

// Hide job modal
function hideJobModal() {
    document.getElementById('jobModal').classList.add('hidden');
}

// Render plugins list
function renderPluginsList() {
    const container = document.getElementById('pluginsList');
    const countBadge = document.getElementById('pluginCount');
    
    countBadge.textContent = plugins.length;
    
    if (plugins.length === 0) {
        container.innerHTML = '<div class="empty-state">No plugins installed</div>';
        return;
    }
    
    const html = plugins.map(plugin => `
        <div class="plugin-item">
            <div class="plugin-info">
                <div class="plugin-header">
                    <h4 class="plugin-name">${escapeHtml(plugin.name)}</h4>
                    <span class="plugin-version">${escapeHtml(plugin.version || 'Unknown')}</span>
                </div>
                <p class="plugin-description">${escapeHtml(plugin.description || 'No description')}</p>
            </div>
            <div class="plugin-actions">
                <label class="toggle-switch">
                    <input type="checkbox" class="plugin-toggle" data-plugin="${escapeHtml(plugin.name)}" ${plugin.enabled ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
                <button class="btn btn-sm btn-danger plugin-uninstall-btn" data-plugin="${escapeHtml(plugin.name)}">
                    🗑️ Uninstall
                </button>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

// Render jobs lists
function renderJobsLists() {
    // Split jobs into active and recent
    const activeJobs = jobs.filter(j => ['queued', 'running'].includes(j.status));
    const recentJobs = jobs.slice(0, 10);
    
    // Update active jobs count
    document.getElementById('activeJobsCount').textContent = activeJobs.length;
    
    // Render active jobs
    const activeContainer = document.getElementById('activeJobsList');
    if (activeJobs.length === 0) {
        activeContainer.innerHTML = '<div class="empty-state">No active jobs</div>';
    } else {
        activeContainer.innerHTML = activeJobs.map(renderJobItem).join('');
    }
    
    // Render recent jobs
    const recentContainer = document.getElementById('recentJobsList');
    if (recentJobs.length === 0) {
        recentContainer.innerHTML = '<div class="empty-state">No recent jobs</div>';
    } else {
        recentContainer.innerHTML = recentJobs.map(renderJobItem).join('');
    }
}

// Render individual job item
function renderJobItem(job) {
    const statusColors = {
        queued: '#805ad5',
        running: '#3182ce',
        completed: '#38a169',
        failed: '#e53e3e',
        cancelled: '#718096'
    };
    
    const statusIcons = {
        queued: '⏳',
        running: '⚙️',
        completed: '✅',
        failed: '❌',
        cancelled: '🚫'
    };
    
    return `
        <div class="job-item" data-status="${job.status}">
            <div class="job-info">
                <div class="job-header">
                    <span class="job-icon">${statusIcons[job.status]}</span>
                    <strong>${job.action}</strong>
                    ${job.pluginName ? `<span class="job-plugin-name">${escapeHtml(job.pluginName)}</span>` : ''}
                </div>
                <div class="job-meta">
                    <span class="job-id" style="font-family: monospace; font-size: 0.75rem; color: #718096">${job.id}</span>
                    <span class="job-time">${formatDate(job.createdAt)}</span>
                </div>
                ${job.error ? `<div class="job-error" style="color: #e53e3e; font-size: 0.875rem; margin-top: 0.25rem;">${escapeHtml(job.error)}</div>` : ''}
            </div>
            <div class="job-actions">
                <span class="job-status" style="background: ${statusColors[job.status]}; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">
                    ${job.status.toUpperCase()}
                </span>
                <button class="btn btn-sm job-details-btn" data-job-id="${job.id}">Details</button>
                ${['queued', 'running'].includes(job.status) ? `
                    <button class="btn btn-sm btn-danger job-cancel-btn" data-job-id="${job.id}">Cancel</button>
                ` : ''}
            </div>
        </div>
    `;
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
    return text.replace(/[&<>"']/g, m => map[m]);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
}

function formatTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString();
}

function showToast(message, type = 'info') {
    if (typeof showNotification === 'function') {
        showNotification(message, type);
    } else {
        console.log(`[${type.toUpperCase()}]`, message);
        alert(message);
    }
}

function logout() {
    localStorage.removeItem('pluginAdminToken');
    window.location.href = '/console/login.html';
}
