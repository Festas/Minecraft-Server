/**
 * CI/CD Dashboard JavaScript
 * Handles CI/CD status monitoring, workflow runs, and artifacts
 */

let currentPage = 1;
let currentWorkflow = '';
let currentStatus = '';
let autoRefreshInterval = null;

/**
 * Helper function to get step status icon
 */
function getStepStatusIcon(conclusion) {
    switch (conclusion) {
        case 'success':
            return '✅';
        case 'failure':
            return '❌';
        default:
            return '⏳';
    }
}

/**
 * Helper function to escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

/**
 * Initialize CI/CD dashboard
 */
async function initCICD() {
    try {
        await loadStatusOverview();
        await loadWorkflows();
        await loadWorkflowRuns();
        
        // Set up event listeners
        document.getElementById('refresh-btn')?.addEventListener('click', refreshDashboard);
        document.getElementById('workflow-filter')?.addEventListener('change', handleWorkflowFilter);
        document.getElementById('status-filter')?.addEventListener('change', handleStatusFilter);
        document.getElementById('logout-btn')?.addEventListener('click', logout);

        // Auto-refresh every 30 seconds
        autoRefreshInterval = setInterval(refreshDashboard, 30000);
        
    } catch (error) {
        console.error('Failed to initialize CI/CD dashboard:', error);
        showError('Failed to load CI/CD dashboard');
    }
}

/**
 * Load CI/CD status overview
 */
async function loadStatusOverview() {
    try {
        const response = await fetch('/api/cicd/status');
        if (!response.ok) throw new Error('Failed to fetch status');
        
        const data = await response.json();
        
        // Update stat cards
        document.getElementById('success-count').textContent = data.success || 0;
        document.getElementById('failed-count').textContent = data.failed || 0;
        document.getElementById('inprogress-count').textContent = data.inProgress || 0;
        document.getElementById('total-runs').textContent = data.totalRuns || 0;
        
    } catch (error) {
        console.error('Failed to load status overview:', error);
    }
}

/**
 * Load available workflows
 */
async function loadWorkflows() {
    try {
        const response = await fetch('/api/cicd/workflows');
        if (!response.ok) throw new Error('Failed to fetch workflows');
        
        const data = await response.json();
        const select = document.getElementById('workflow-filter');
        
        if (!select) return;
        
        // Clear existing options (except "All Workflows")
        select.innerHTML = '<option value="">All Workflows</option>';
        
        // Add workflow options
        data.workflows?.forEach(workflow => {
            const option = document.createElement('option');
            option.value = workflow.id;
            option.textContent = workflow.name;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Failed to load workflows:', error);
    }
}

/**
 * Load workflow runs
 */
async function loadWorkflowRuns() {
    const container = document.getElementById('runs-container');
    if (!container) return;
    
    try {
        // Show loading spinner
        container.innerHTML = '<div class="loading-spinner">Loading workflow runs...</div>';
        
        // Build query parameters
        const params = new URLSearchParams({
            page: currentPage,
            per_page: 20
        });
        
        if (currentWorkflow) params.append('workflow', currentWorkflow);
        if (currentStatus) params.append('status', currentStatus);
        
        const response = await fetch(`/api/cicd/runs?${params}`);
        if (!response.ok) throw new Error('Failed to fetch workflow runs');
        
        const data = await response.json();
        
        if (!data.runs || data.runs.length === 0) {
            container.innerHTML = '<p class="no-data">No workflow runs found</p>';
            return;
        }
        
        // Create table
        const table = document.createElement('table');
        table.className = 'data-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Status</th>
                    <th>Workflow</th>
                    <th>Branch</th>
                    <th>Commit</th>
                    <th>Event</th>
                    <th>Actor</th>
                    <th>Started</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="runs-tbody"></tbody>
        `;
        
        container.innerHTML = '';
        container.appendChild(table);
        
        const tbody = document.getElementById('runs-tbody');
        
        data.runs.forEach(run => {
            const row = createRunRow(run);
            tbody.appendChild(row);
        });
        
        // Add pagination if needed
        if (data.total > 20) {
            const pagination = createPagination(data.total, currentPage, 20);
            container.appendChild(pagination);
        }
        
    } catch (error) {
        console.error('Failed to load workflow runs:', error);
        container.innerHTML = '<p class="error-message">Failed to load workflow runs</p>';
    }
}

/**
 * Create workflow run table row
 */
function createRunRow(run) {
    const row = document.createElement('tr');
    row.className = `run-row status-${run.conclusion || run.status}`;
    
    // Status badge
    const statusBadge = getStatusBadge(run.status, run.conclusion);
    
    // Format date
    const startedAt = run.runStartedAt ? new Date(run.runStartedAt).toLocaleString() : 'N/A';
    
    row.innerHTML = `
        <td>${statusBadge}</td>
        <td>
            <strong>${escapeHtml(run.name)}</strong>
            <div class="run-subtitle">#${run.runNumber}</div>
        </td>
        <td><span class="badge badge-secondary">${escapeHtml(run.branch)}</span></td>
        <td>
            <code>${escapeHtml(run.commitSha || 'N/A')}</code>
            ${run.commitMessage ? `<div class="run-subtitle">${escapeHtml(run.commitMessage.split('\n')[0])}</div>` : ''}
        </td>
        <td><span class="badge">${escapeHtml(run.event)}</span></td>
        <td>${escapeHtml(run.actor || 'N/A')}</td>
        <td>${startedAt}</td>
        <td>
            <button class="btn-sm btn-primary" onclick="viewRunDetails(${run.id})">
                Details
            </button>
            <button class="btn-sm btn-secondary" onclick="viewArtifacts(${run.id})">
                Artifacts
            </button>
            <a href="${escapeHtml(run.url)}" target="_blank" class="btn-sm btn-secondary">
                GitHub
            </a>
        </td>
    `;
    
    return row;
}

/**
 * Get status badge HTML
 */
function getStatusBadge(status, conclusion) {
    if (status === 'completed') {
        switch (conclusion) {
            case 'success':
                return '<span class="status-badge status-success">✅ Success</span>';
            case 'failure':
                return '<span class="status-badge status-failure">❌ Failed</span>';
            case 'cancelled':
                return '<span class="status-badge status-cancelled">🚫 Cancelled</span>';
            default:
                return '<span class="status-badge status-unknown">❓ ' + escapeHtml(conclusion) + '</span>';
        }
    } else if (status === 'in_progress') {
        return '<span class="status-badge status-running">⏳ Running</span>';
    } else if (status === 'queued') {
        return '<span class="status-badge status-queued">⏸️ Queued</span>';
    }
    return '<span class="status-badge">' + escapeHtml(status) + '</span>';
}

/**
 * View workflow run details
 */
async function viewRunDetails(runId) {
    const modal = document.getElementById('run-details-modal');
    const content = document.getElementById('run-details-content');
    
    if (!modal || !content) return;
    
    modal.style.display = 'flex';
    content.innerHTML = '<div class="loading-spinner">Loading details...</div>';
    
    try {
        const response = await fetch(`/api/cicd/runs/${runId}`);
        if (!response.ok) throw new Error('Failed to fetch run details');
        
        const run = await response.json();
        
        // Create details view
        let html = `
            <div class="run-details">
                <div class="detail-section">
                    <h4>Run Information</h4>
                    <table class="detail-table">
                        <tr><td><strong>Workflow:</strong></td><td>${escapeHtml(run.name)}</td></tr>
                        <tr><td><strong>Run Number:</strong></td><td>#${run.runNumber}</td></tr>
                        <tr><td><strong>Status:</strong></td><td>${getStatusBadge(run.status, run.conclusion)}</td></tr>
                        <tr><td><strong>Branch:</strong></td><td>${escapeHtml(run.branch)}</td></tr>
                        <tr><td><strong>Commit:</strong></td><td><code>${escapeHtml(run.commitSha)}</code></td></tr>
                        <tr><td><strong>Event:</strong></td><td>${escapeHtml(run.event)}</td></tr>
                        <tr><td><strong>Actor:</strong></td><td>${escapeHtml(run.actor)}</td></tr>
                        <tr><td><strong>Started:</strong></td><td>${new Date(run.runStartedAt).toLocaleString()}</td></tr>
                    </table>
                </div>
        `;
        
        if (run.commitMessage) {
            html += `
                <div class="detail-section">
                    <h4>Commit Message</h4>
                    <pre class="commit-message">${escapeHtml(run.commitMessage)}</pre>
                </div>
            `;
        }
        
        if (run.jobs && run.jobs.length > 0) {
            html += `
                <div class="detail-section">
                    <h4>Jobs</h4>
                    <div class="jobs-list">
            `;
            
            run.jobs.forEach(job => {
                html += `
                    <div class="job-card">
                        <div class="job-header">
                            <span class="job-name">${escapeHtml(job.name)}</span>
                            ${getStatusBadge(job.status, job.conclusion)}
                        </div>
                        ${job.steps && job.steps.length > 0 ? `
                            <div class="steps-list">
                                ${job.steps.map(step => `
                                    <div class="step-item">
                                        <span class="step-status">${getStepStatusIcon(step.conclusion)}</span>
                                        <span class="step-name">${escapeHtml(step.name)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        content.innerHTML = html;
        
    } catch (error) {
        console.error('Failed to load run details:', error);
        content.innerHTML = '<p class="error-message">Failed to load run details</p>';
    }
}

/**
 * View artifacts for a workflow run
 */
async function viewArtifacts(runId) {
    const modal = document.getElementById('artifacts-modal');
    const content = document.getElementById('artifacts-content');
    
    if (!modal || !content) return;
    
    modal.style.display = 'flex';
    content.innerHTML = '<div class="loading-spinner">Loading artifacts...</div>';
    
    try {
        const response = await fetch(`/api/cicd/runs/${runId}/artifacts`);
        if (!response.ok) throw new Error('Failed to fetch artifacts');
        
        const data = await response.json();
        
        if (!data.artifacts || data.artifacts.length === 0) {
            content.innerHTML = '<p class="no-data">No artifacts available for this run</p>';
            return;
        }
        
        let html = '<div class="artifacts-list">';
        
        data.artifacts.forEach(artifact => {
            const sizeInMB = (artifact.sizeInBytes / (1024 * 1024)).toFixed(2);
            const createdAt = new Date(artifact.createdAt).toLocaleString();
            const expiresAt = new Date(artifact.expiresAt).toLocaleString();
            
            html += `
                <div class="artifact-card">
                    <div class="artifact-icon">📦</div>
                    <div class="artifact-info">
                        <div class="artifact-name">${escapeHtml(artifact.name)}</div>
                        <div class="artifact-meta">
                            <span>Size: ${sizeInMB} MB</span>
                            <span>Created: ${createdAt}</span>
                            <span>Expires: ${expiresAt}</span>
                        </div>
                    </div>
                    <div class="artifact-actions">
                        ${!artifact.expired ? `
                            <a href="${artifact.downloadUrl}" class="btn-sm btn-primary" download>
                                Download
                            </a>
                        ` : `
                            <span class="badge badge-danger">Expired</span>
                        `}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        content.innerHTML = html;
        
    } catch (error) {
        console.error('Failed to load artifacts:', error);
        content.innerHTML = '<p class="error-message">Failed to load artifacts</p>';
    }
}

/**
 * Close run details modal
 */
function closeRunDetailsModal() {
    const modal = document.getElementById('run-details-modal');
    if (modal) modal.style.display = 'none';
}

/**
 * Close artifacts modal
 */
function closeArtifactsModal() {
    const modal = document.getElementById('artifacts-modal');
    if (modal) modal.style.display = 'none';
}

/**
 * Handle workflow filter change
 */
function handleWorkflowFilter(event) {
    currentWorkflow = event.target.value;
    currentPage = 1;
    loadWorkflowRuns();
}

/**
 * Handle status filter change
 */
function handleStatusFilter(event) {
    currentStatus = event.target.value;
    currentPage = 1;
    loadWorkflowRuns();
}

/**
 * Refresh dashboard
 */
async function refreshDashboard() {
    await loadStatusOverview();
    await loadWorkflowRuns();
}

/**
 * Create pagination controls
 */
function createPagination(total, current, perPage) {
    const totalPages = Math.ceil(total / perPage);
    const div = document.createElement('div');
    div.className = 'pagination';
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Previous';
    prevBtn.className = 'btn-secondary';
    prevBtn.disabled = current === 1;
    prevBtn.onclick = () => {
        currentPage--;
        loadWorkflowRuns();
    };
    div.appendChild(prevBtn);
    
    // Page info
    const pageInfo = document.createElement('span');
    pageInfo.textContent = `Page ${current} of ${totalPages}`;
    pageInfo.className = 'page-info';
    div.appendChild(pageInfo);
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.className = 'btn-secondary';
    nextBtn.disabled = current >= totalPages;
    nextBtn.onclick = () => {
        currentPage++;
        loadWorkflowRuns();
    };
    div.appendChild(nextBtn);
    
    return div;
}

/**
 * Show error message
 */
function showError(message) {
    // Use existing notification system if available
    if (typeof showNotification === 'function') {
        showNotification(message, 'error');
    } else {
        alert(message);
    }
}

/**
 * Logout user
 */
async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

/**
 * Close modals when clicking outside
 */
window.addEventListener('click', (event) => {
    const runModal = document.getElementById('run-details-modal');
    const artifactsModal = document.getElementById('artifacts-modal');
    
    if (event.target === runModal) {
        closeRunDetailsModal();
    }
    if (event.target === artifactsModal) {
        closeArtifactsModal();
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', initCICD);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
});
