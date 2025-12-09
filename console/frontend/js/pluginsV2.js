// Plugin Manager V2 UI Logic - Job Queue System

let bearerToken = '';
let plugins = [];
let jobs = [];
let pollInterval = null;
let healthCheckInterval = null;
let filteredJobs = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadMetaInfo();
    await promptForBearerToken();
    await checkHealth();
    await loadPlugins();
    await loadJobs();
    await loadRecentActivity();
    initializeEventListeners();
    startJobPolling();
    startHealthPolling();
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
        document.getElementById('currentUserInfo').textContent = `User: ${data.username}`;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/console/login.html';
    }
}

// Load meta information (Minecraft version, domain)
async function loadMetaInfo() {
    try {
        // Try to get server info from server status endpoint
        const response = await fetch('/api/server/status', {
            credentials: 'same-origin'
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Update Minecraft version
            const version = data.version || 'Unknown';
            document.getElementById('minecraftVersion').textContent = `Minecraft: ${version}`;
            
            // Get domain from env variable or window location
            // Domain should be injected into .env during deployment
            const domain = window.location.hostname;
            document.getElementById('domainInfo').textContent = `Domain: ${domain}`;
        }
    } catch (error) {
        console.error('Error loading meta info:', error);
        // Set defaults
        document.getElementById('minecraftVersion').textContent = 'Minecraft: Unknown';
        document.getElementById('domainInfo').textContent = `Domain: ${window.location.hostname}`;
    }
}

// Check backend health
async function checkHealth() {
    try {
        const response = await fetch('/api/v2/plugins/health', {
            headers: bearerToken ? {
                'Authorization': `Bearer ${bearerToken}`
            } : {}
        });
        
        const healthIndicator = document.getElementById('healthIndicator');
        const healthDot = healthIndicator.querySelector('.health-dot');
        const healthText = healthIndicator.querySelector('.health-text');
        const backendWarning = document.getElementById('backendWarning');
        const backendWarningMessage = document.getElementById('backendWarningMessage');
        const missingSecretsWarning = document.getElementById('missingSecretsWarning');
        const missingSecretsMessage = document.getElementById('missingSecretsMessage');
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.status === 'healthy') {
                healthDot.style.background = '#48bb78'; // green
                healthText.textContent = 'Healthy';
                healthIndicator.title = 'Backend is healthy';
                backendWarning.style.display = 'none';
            } else {
                healthDot.style.background = '#f6ad55'; // orange
                healthText.textContent = 'Degraded';
                healthIndicator.title = 'Backend is in degraded state';
                
                // Show warning
                backendWarning.style.display = 'block';
                const issues = [];
                if (data.checks) {
                    for (const [key, check] of Object.entries(data.checks)) {
                        if (!check.healthy) {
                            issues.push(`${key}: ${check.message || 'unhealthy'}`);
                        }
                    }
                }
                backendWarningMessage.textContent = `Backend checks failed: ${issues.join(', ')}`;
            }
            
            // Check for missing PLUGIN_ADMIN_TOKEN
            if (!bearerToken) {
                missingSecretsWarning.style.display = 'block';
                missingSecretsMessage.textContent = 'PLUGIN_ADMIN_TOKEN is not configured. Some features may be limited. Please set it in your .env file and refresh the page.';
            }
        } else if (response.status === 503) {
            healthDot.style.background = '#f56565'; // red
            healthText.textContent = 'Unhealthy';
            healthIndicator.title = 'Backend is unhealthy';
            
            backendWarning.style.display = 'block';
            backendWarningMessage.textContent = 'Plugin manager backend is unhealthy. Some operations may fail.';
        } else {
            healthDot.style.background = '#cbd5e0'; // gray
            healthText.textContent = 'Unknown';
            healthIndicator.title = 'Unable to check backend health';
        }
    } catch (error) {
        console.error('Health check failed:', error);
        const healthIndicator = document.getElementById('healthIndicator');
        const healthDot = healthIndicator.querySelector('.health-dot');
        const healthText = healthIndicator.querySelector('.health-text');
        
        healthDot.style.background = '#cbd5e0'; // gray
        healthText.textContent = 'Error';
        healthIndicator.title = 'Error checking backend health';
    }
}

// Start health polling
function startHealthPolling() {
    // Poll every 10 seconds
    healthCheckInterval = setInterval(() => {
        checkHealth();
    }, 10000);
}

// Load recent activity from backend
async function loadRecentActivity() {
    try {
        const activityList = document.getElementById('recentActivityList');
        
        // For now, use recent jobs as activity
        // In the future, this could pull from a dedicated history API
        const response = await fetch('/api/v2/plugins/jobs?limit=10', {
            headers: {
                'Authorization': `Bearer ${bearerToken}`
            }
        });
        
        if (!response.ok) {
            activityList.innerHTML = '<div class="empty-state">Unable to load activity</div>';
            return;
        }
        
        const data = await response.json();
        
        if (data.success && data.jobs && data.jobs.length > 0) {
            const completedJobs = data.jobs.filter(job => 
                job.status === 'completed' || job.status === 'failed'
            );
            
            if (completedJobs.length === 0) {
                activityList.innerHTML = '<div class="empty-state">No recent activity</div>';
                return;
            }
            
            activityList.innerHTML = completedJobs.slice(0, 5).map(job => {
                const duration = job.completedAt && job.startedAt 
                    ? formatDuration(new Date(job.completedAt) - new Date(job.startedAt))
                    : 'N/A';
                
                const statusIcon = job.status === 'completed' ? '✅' : '❌';
                const statusClass = job.status === 'completed' ? 'success' : 'error';
                
                return `
                    <div class="activity-item" style="padding: 0.75rem; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                        <div style="flex: 1;">
                            <strong>${statusIcon} ${job.action}</strong>: ${job.pluginName || 'Unknown'}
                            <div style="font-size: 0.85rem; opacity: 0.7; margin-top: 0.25rem;">
                                ${new Date(job.completedAt).toLocaleString()} • Duration: ${duration}
                            </div>
                        </div>
                        <span class="badge badge-${statusClass}">${job.status}</span>
                    </div>
                `;
            }).join('');
        } else {
            activityList.innerHTML = '<div class="empty-state">No recent activity</div>';
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
        document.getElementById('recentActivityList').innerHTML = '<div class="empty-state">Error loading activity</div>';
    }
}

// Format duration in ms to human readable
function formatDuration(ms) {
    if (!ms || ms < 0) return 'N/A';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
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
    document.getElementById('refreshActivityBtn').addEventListener('click', loadRecentActivity);
    
    // Job search/filter
    document.getElementById('jobSearchInput').addEventListener('input', (e) => {
        filterJobs(e.target.value);
    });
    
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
            filteredJobs = jobs; // Initialize filtered jobs
            renderJobsLists();
        }
    } catch (error) {
        console.error('Error loading jobs:', error);
    }
}

// Filter jobs by search term
function filterJobs(searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
        filteredJobs = jobs;
    } else {
        const term = searchTerm.toLowerCase();
        filteredJobs = jobs.filter(job => {
            const pluginName = (job.pluginName || '').toLowerCase();
            const action = (job.action || '').toLowerCase();
            return pluginName.includes(term) || action.includes(term);
        });
    }
    renderJobsLists();
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
    // Use filtered jobs or all jobs
    const jobsToRender = filteredJobs || jobs;
    
    // Split jobs into active and recent
    const activeJobs = jobsToRender.filter(j => ['queued', 'running'].includes(j.status));
    const recentJobs = jobsToRender.slice(0, 10);
    
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
    
    // Calculate duration
    let duration = 'N/A';
    if (job.completedAt && job.startedAt) {
        const durationMs = new Date(job.completedAt) - new Date(job.startedAt);
        duration = formatDuration(durationMs);
    } else if (job.startedAt && job.status === 'running') {
        const durationMs = new Date() - new Date(job.startedAt);
        duration = formatDuration(durationMs) + ' (running)';
    }
    
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
                    ${duration !== 'N/A' ? `<span class="job-duration" style="color: #4a5568;">• Duration: ${duration}</span>` : ''}
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
