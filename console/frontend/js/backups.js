/**
 * Backups Page JavaScript
 * Handles backup, restore, and migration operations
 */

(function() {
    'use strict';

    let backupJobs = [];
    let restoreJobs = [];
    let migrationJobs = [];
    let selectedBackupForRestore = null;

    /**
     * Initialize the backups page
     */
    function init() {
        console.log('[Backups] Initializing backups page...');

        // Set up tab switching
        setupTabs();

        // Set up form handlers
        setupForms();

        // Load initial data
        loadStorageInfo();
        loadBackupJobs();
        loadRestoreJobs();
        loadMigrationJobs();

        // Set up auto-refresh
        setInterval(() => {
            refreshActiveJobs();
            loadStorageInfo();
        }, 5000); // Refresh every 5 seconds

        console.log('[Backups] Initialization complete');
    }

    /**
     * Set up tab switching
     */
    function setupTabs() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab || tab.dataset.subtab;
                if (!tabName) return;

                // Handle main tabs
                if (tab.dataset.tab) {
                    // Remove active class from all main tabs
                    document.querySelectorAll('.tab[data-tab]').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');

                    // Hide all main tab contents
                    document.querySelectorAll('.main-content > .tab-content').forEach(content => {
                        content.classList.remove('active');
                    });

                    // Show selected tab content
                    const tabContent = document.getElementById(`${tabName}-tab`);
                    if (tabContent) {
                        tabContent.classList.add('active');
                    }

                    // Load data for the selected tab
                    if (tabName === 'backups') {
                        loadBackupJobs();
                    } else if (tabName === 'restore') {
                        loadBackupJobsForRestore();
                    } else if (tabName === 'migration') {
                        loadMigrationBackups();
                    }
                }

                // Handle history sub-tabs
                if (tab.dataset.subtab) {
                    // Remove active class from all sub-tabs
                    tab.parentElement.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');

                    // Hide all sub-tab contents
                    const parent = tab.closest('.tab-content');
                    parent.querySelectorAll(':scope > .tab-content').forEach(content => {
                        content.classList.remove('active');
                    });

                    // Show selected sub-tab content
                    const subTabContent = document.getElementById(tabName);
                    if (subTabContent) {
                        subTabContent.classList.add('active');
                    }
                }
            });
        });
    }

    /**
     * Set up form handlers
     */
    function setupForms() {
        // Create backup form
        const createBackupForm = document.getElementById('create-backup-form');
        if (createBackupForm) {
            createBackupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await createBackup();
            });
        }

        // Migration export form
        const migrationExportForm = document.getElementById('migration-export-form');
        if (migrationExportForm) {
            migrationExportForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await createMigrationExport();
            });
        }

        // Backup type change handler for estimated size
        const backupTypeSelect = document.getElementById('backup-type');
        if (backupTypeSelect) {
            backupTypeSelect.addEventListener('change', () => {
                updateEstimatedSize(backupTypeSelect.value);
            });
            // Show estimated size on load
            updateEstimatedSize(backupTypeSelect.value);
        }
    }

    /**
     * Load storage information
     */
    async function loadStorageInfo() {
        try {
            const response = await fetch('/api/backups/storage');
            if (!response.ok) {
                console.warn('[Backups] Storage endpoint not available yet');
                return;
            }

            const data = await response.json();
            renderStorageOverview(data);
        } catch (error) {
            console.error('[Backups] Error loading storage info:', error);
        }
    }

    /**
     * Render storage overview
     */
    function renderStorageOverview(data) {
        // Update storage bar
        const storageBarFill = document.getElementById('storage-bar-fill');
        const storageUsageText = document.getElementById('storage-usage-text');
        
        if (data.totalSpace && data.usedSpace !== undefined) {
            const percentage = (data.usedSpace / data.totalSpace * 100).toFixed(1);
            storageBarFill.style.width = percentage + '%';
            storageUsageText.textContent = `${formatBytes(data.usedSpace)} / ${formatBytes(data.totalSpace)} (${percentage}%)`;
            
            // Update bar color based on usage
            storageBarFill.classList.remove('warning', 'danger');
            if (percentage > 90) {
                storageBarFill.classList.add('danger');
            } else if (percentage > 75) {
                storageBarFill.classList.add('warning');
            }
        }

        // Update stats
        document.getElementById('total-backups').textContent = data.backupCount || 0;
        document.getElementById('total-size').textContent = formatBytes(data.usedSpace || 0);
        document.getElementById('available-space').textContent = formatBytes(data.freeSpace || 0);
        document.getElementById('last-backup').textContent = data.lastBackup 
            ? formatRelativeTime(new Date(data.lastBackup)) 
            : 'Never';

        // Update chart if data available
        if (data.byType) {
            updateStorageChart(data.byType);
        }
    }

    /**
     * Update storage chart
     */
    function updateStorageChart(byType) {
        const chartContainer = document.getElementById('storage-chart-container');
        if (!chartContainer) return;

        // Simple text-based breakdown for now (can be enhanced with chart library)
        const types = Object.entries(byType);
        if (types.length === 0) {
            chartContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No backup data</p>';
            return;
        }

        const total = types.reduce((sum, [_, size]) => sum + size, 0);
        chartContainer.innerHTML = `
            <div style="width: 100%; max-width: 400px;">
                ${types.map(([type, size]) => {
                    const percent = total > 0 ? (size / total * 100).toFixed(1) : 0;
                    const icon = getBackupTypeIcon(type);
                    return `
                        <div style="margin-bottom: 12px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 14px;">
                                <span>${icon} ${type.charAt(0).toUpperCase() + type.slice(1)}</span>
                                <span style="font-weight: 600;">${formatBytes(size)} (${percent}%)</span>
                            </div>
                            <div style="width: 100%; height: 8px; background: var(--border-color); border-radius: 4px; overflow: hidden;">
                                <div style="height: 100%; width: ${percent}%; background: ${getTypeColor(type)}; transition: width 0.3s;"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    /**
     * Get backup type icon
     */
    function getBackupTypeIcon(type) {
        const icons = {
            full: '📦',
            world: '🌍',
            plugins: '🔌',
            config: '⚙️',
            migration: '🚀'
        };
        return icons[type] || '📄';
    }

    /**
     * Get type color for chart
     */
    function getTypeColor(type) {
        const colors = {
            full: '#9b59b6',
            world: '#3498db',
            plugins: '#e67e22',
            config: '#1abc9c',
            migration: '#2c3e50'
        };
        return colors[type] || '#95a5a6';
    }

    /**
     * Update estimated size based on backup type
     */
    function updateEstimatedSize(type) {
        const estimatedSizeEl = document.getElementById('estimated-size');
        const estimatedSizeValue = document.getElementById('estimated-size-value');
        
        if (!estimatedSizeEl || !estimatedSizeValue) return;

        // Show estimated size (these are rough estimates)
        const estimates = {
            full: '500-2000 MB',
            world: '300-1500 MB',
            plugins: '50-200 MB',
            config: '1-5 MB'
        };

        estimatedSizeValue.textContent = estimates[type] || 'Unknown';
        estimatedSizeEl.style.display = 'block';
    }

    /**
     * Format relative time
     */
    function formatRelativeTime(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSecs < 60) {
            return 'Just now';
        } else if (diffMins < 60) {
            return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else if (diffDays < 7) {
            return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
        } else if (diffDays < 365) {
            // More accurate month calculation using actual date difference
            const monthsDiff = (now.getFullYear() - date.getFullYear()) * 12 + 
                               (now.getMonth() - date.getMonth());
            const months = Math.max(1, monthsDiff);
            return `${months} month${months !== 1 ? 's' : ''} ago`;
        } else {
            const years = Math.floor(diffDays / 365);
            return `${years} year${years !== 1 ? 's' : ''} ago`;
        }
    }

    /**
     * Show backup progress
     */
    function showBackupProgress(jobId) {
        const progressContainer = document.getElementById('backup-progress-container');
        const createBtn = document.getElementById('create-backup-btn');
        
        if (progressContainer) {
            progressContainer.classList.add('active');
        }
        
        if (createBtn) {
            createBtn.disabled = true;
            createBtn.textContent = 'Creating...';
        }

        // Start polling for progress
        pollBackupProgress(jobId);
    }

    /**
     * Poll backup progress
     */
    async function pollBackupProgress(jobId) {
        const maxAttempts = 120; // 10 minutes with 5 second intervals
        let attempts = 0;

        const pollInterval = setInterval(async () => {
            attempts++;

            try {
                const response = await fetch(`/api/backups/jobs/${jobId}`);
                if (!response.ok) {
                    clearInterval(pollInterval);
                    hideBackupProgress();
                    return;
                }

                const data = await response.json();
                const job = data.job;

                // Update progress bar (estimate based on status)
                const progressFill = document.getElementById('backup-progress-fill');
                const progressPercent = document.getElementById('backup-progress-percent');
                
                if (job.status === 'running') {
                    // Simulate progress for running jobs (backend doesn't report actual progress yet)
                    // TODO: Implement real progress tracking in backend for more accurate feedback
                    const progress = Math.min(90, attempts * 3);
                    if (progressFill) progressFill.style.width = progress + '%';
                    if (progressPercent) progressPercent.textContent = progress + '%';
                } else if (job.status === 'success') {
                    if (progressFill) progressFill.style.width = '100%';
                    if (progressPercent) progressPercent.textContent = '100%';
                    clearInterval(pollInterval);
                    setTimeout(() => {
                        hideBackupProgress();
                        loadBackupJobs();
                        loadStorageInfo();
                    }, 1000);
                } else if (job.status === 'failed') {
                    clearInterval(pollInterval);
                    hideBackupProgress();
                    showNotification('Backup failed: ' + (job.error_message || 'Unknown error'), 'error');
                }
            } catch (error) {
                console.error('[Backups] Error polling backup progress:', error);
            }

            if (attempts >= maxAttempts) {
                clearInterval(pollInterval);
                hideBackupProgress();
            }
        }, 5000);
    }

    /**
     * Hide backup progress
     */
    function hideBackupProgress() {
        const progressContainer = document.getElementById('backup-progress-container');
        const createBtn = document.getElementById('create-backup-btn');
        const progressFill = document.getElementById('backup-progress-fill');
        const progressPercent = document.getElementById('backup-progress-percent');
        
        if (progressContainer) {
            progressContainer.classList.remove('active');
        }
        
        if (createBtn) {
            createBtn.disabled = false;
            createBtn.textContent = 'Create Backup';
        }
        
        if (progressFill) progressFill.style.width = '0%';
        if (progressPercent) progressPercent.textContent = '0%';
    }

    /**
     * Load backup jobs
     */
    async function loadBackupJobs() {
        try {
            const response = await fetch('/api/backups/jobs');
            if (!response.ok) {
                throw new Error('Failed to load backup jobs');
            }

            const data = await response.json();
            backupJobs = data.jobs || [];

            renderBackupJobs();
        } catch (error) {
            console.error('[Backups] Error loading backup jobs:', error);
            showNotification('Failed to load backups', 'error');
        }
    }

    /**
     * Load backup jobs for restore list
     */
    async function loadBackupJobsForRestore() {
        try {
            const response = await fetch('/api/backups/jobs');
            if (!response.ok) {
                throw new Error('Failed to load backup jobs');
            }

            const data = await response.json();
            const successfulBackups = (data.jobs || []).filter(job => job.status === 'success');

            renderRestoreBackupsList(successfulBackups);
        } catch (error) {
            console.error('[Backups] Error loading backups for restore:', error);
            showNotification('Failed to load backups', 'error');
        }
    }

    /**
     * Load restore jobs
     */
    async function loadRestoreJobs() {
        try {
            const response = await fetch('/api/backups/restore/jobs');
            if (!response.ok) {
                throw new Error('Failed to load restore jobs');
            }

            const data = await response.json();
            restoreJobs = data.jobs || [];

            renderRestoreHistory();
        } catch (error) {
            console.error('[Backups] Error loading restore jobs:', error);
        }
    }

    /**
     * Load migration jobs
     */
    async function loadMigrationJobs() {
        try {
            const response = await fetch('/api/backups/migrate/jobs');
            if (!response.ok) {
                throw new Error('Failed to load migration jobs');
            }

            const data = await response.json();
            migrationJobs = data.jobs || [];

            renderMigrationHistory();
        } catch (error) {
            console.error('[Backups] Error loading migration jobs:', error);
        }
    }

    /**
     * Load migration backups
     */
    async function loadMigrationBackups() {
        try {
            const response = await fetch('/api/backups/jobs');
            if (!response.ok) {
                throw new Error('Failed to load backups');
            }

            const data = await response.json();
            const migrationBackups = (data.jobs || []).filter(job => 
                job.type === 'migration' && job.status === 'success'
            );

            renderMigrationImportList(migrationBackups);
        } catch (error) {
            console.error('[Backups] Error loading migration backups:', error);
        }
    }

    /**
     * Refresh active jobs (running or pending)
     */
    async function refreshActiveJobs() {
        const hasActiveBackup = backupJobs.some(job => 
            job.status === 'running' || job.status === 'pending'
        );
        const hasActiveRestore = restoreJobs.some(job => 
            job.status === 'running' || job.status === 'pending'
        );

        if (hasActiveBackup) {
            await loadBackupJobs();
        }
        if (hasActiveRestore) {
            await loadRestoreJobs();
        }
    }

    /**
     * Render backup jobs list
     */
    function renderBackupJobs() {
        const container = document.getElementById('backups-list');
        if (!container) return;

        if (backupJobs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <p>No backups yet. Create your first backup above!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = backupJobs.map(job => {
            const icon = getBackupTypeIcon(job.type);
            const relativeTime = formatRelativeTime(new Date(job.created_at));
            
            return `
                <div class="backup-card">
                    <div class="backup-card-header">
                        <h4 class="backup-card-title">${escapeHtml(job.name)}</h4>
                        <div class="backup-card-actions">
                            ${job.status === 'success' ? `
                                <button class="btn btn-sm btn-secondary" onclick="previewBackup('${job.id}')"
                                        title="Preview contents">
                                    👁️ Preview
                                </button>
                                <button class="btn btn-sm btn-primary" onclick="downloadBackup('${job.id}')"
                                        title="Download backup">
                                    ⬇️ Download
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="deleteBackup('${job.id}')"
                                        title="Delete backup">
                                    🗑️ Delete
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    <div class="backup-card-body">
                        <div class="backup-info-item">
                            <span class="backup-info-label">Type</span>
                            <span class="backup-info-value">
                                <span class="backup-type-badge type-${job.type}">
                                    <span class="backup-type-icon">${icon}</span>
                                    ${job.type}
                                </span>
                            </span>
                        </div>
                        <div class="backup-info-item">
                            <span class="backup-info-label">Status</span>
                            <span class="backup-info-value">
                                <span class="status-badge status-${job.status}">${job.status}</span>
                            </span>
                        </div>
                        <div class="backup-info-item">
                            <span class="backup-info-label">Created</span>
                            <span class="backup-info-value">
                                ${formatDate(job.created_at)}
                                <div class="relative-time">${relativeTime}</div>
                            </span>
                        </div>
                        <div class="backup-info-item">
                            <span class="backup-info-label">Size</span>
                            <span class="backup-info-value">${job.file_size ? formatBytes(job.file_size) : 'N/A'}</span>
                        </div>
                        <div class="backup-info-item">
                            <span class="backup-info-label">Retention</span>
                            <span class="backup-info-value">${job.retention_policy}</span>
                        </div>
                        <div class="backup-info-item">
                            <span class="backup-info-label">Created By</span>
                            <span class="backup-info-value">${escapeHtml(job.created_by)}</span>
                        </div>
                    </div>
                    ${job.status === 'running' || job.status === 'pending' ? `
                        <div class="backup-progress active" style="margin-top: 16px;">
                            <div class="backup-progress-fill" style="width: ${job.status === 'pending' ? '10' : '50'}%"></div>
                        </div>
                        <div style="text-align: center; margin-top: 8px; font-size: 13px; color: var(--text-muted);">
                            ${job.status === 'pending' ? 'Queued...' : 'In progress...'}
                        </div>
                    ` : ''}
                    ${job.error_message ? `
                        <div class="alert alert-danger" style="margin-top: 12px;">
                            <strong>Error:</strong> ${escapeHtml(job.error_message)}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    /**
     * Render backups list for restore
     */
    function renderRestoreBackupsList(backups) {
        const container = document.getElementById('restore-backups-list');
        if (!container) return;

        if (backups.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔄</div>
                    <p>No backups available for restore</p>
                </div>
            `;
            return;
        }

        container.innerHTML = backups.map(job => `
            <div class="backup-card">
                <div class="backup-card-header">
                    <h4 class="backup-card-title">${escapeHtml(job.name)}</h4>
                    <div class="backup-card-actions">
                        <button class="btn btn-sm btn-secondary" onclick="previewBackup('${job.id}')">
                            👁️ Preview
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="initiateRestore('${job.id}')">
                            🔄 Restore
                        </button>
                    </div>
                </div>
                <div class="backup-card-body">
                    <div class="backup-info-item">
                        <span class="backup-info-label">Type</span>
                        <span class="backup-info-value">
                            <span class="backup-type-badge type-${job.type}">${job.type}</span>
                        </span>
                    </div>
                    <div class="backup-info-item">
                        <span class="backup-info-label">Created</span>
                        <span class="backup-info-value">${formatDate(job.created_at)}</span>
                    </div>
                    <div class="backup-info-item">
                        <span class="backup-info-label">Size</span>
                        <span class="backup-info-value">${formatBytes(job.file_size)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render restore history
     */
    function renderRestoreHistory() {
        const container = document.getElementById('restore-history-list');
        if (!container) return;

        if (restoreJobs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📜</div>
                    <p>No restore history</p>
                </div>
            `;
            return;
        }

        container.innerHTML = restoreJobs.map(job => `
            <div class="backup-card">
                <div class="backup-card-header">
                    <h4 class="backup-card-title">Restore from ${job.backup_id}</h4>
                </div>
                <div class="backup-card-body">
                    <div class="backup-info-item">
                        <span class="backup-info-label">Status</span>
                        <span class="backup-info-value">
                            <span class="status-badge status-${job.status}">${job.status}</span>
                        </span>
                    </div>
                    <div class="backup-info-item">
                        <span class="backup-info-label">Started</span>
                        <span class="backup-info-value">${formatDate(job.created_at)}</span>
                    </div>
                    <div class="backup-info-item">
                        <span class="backup-info-label">Completed</span>
                        <span class="backup-info-value">${job.completed_at ? formatDate(job.completed_at) : 'N/A'}</span>
                    </div>
                    <div class="backup-info-item">
                        <span class="backup-info-label">Created By</span>
                        <span class="backup-info-value">${escapeHtml(job.created_by)}</span>
                    </div>
                </div>
                ${job.error_message ? `
                    <div class="alert alert-danger" style="margin-top: 12px;">
                        <strong>Error:</strong> ${escapeHtml(job.error_message)}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    /**
     * Render migration history
     */
    function renderMigrationHistory() {
        const container = document.getElementById('migration-history-list');
        if (!container) return;

        if (migrationJobs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📜</div>
                    <p>No migration history</p>
                </div>
            `;
            return;
        }

        container.innerHTML = migrationJobs.map(job => `
            <div class="backup-card">
                <div class="backup-card-header">
                    <h4 class="backup-card-title">Migration ${job.type}: ${job.id}</h4>
                </div>
                <div class="backup-card-body">
                    <div class="backup-info-item">
                        <span class="backup-info-label">Type</span>
                        <span class="backup-info-value">${job.type}</span>
                    </div>
                    <div class="backup-info-item">
                        <span class="backup-info-label">Status</span>
                        <span class="backup-info-value">
                            <span class="status-badge status-${job.status}">${job.status}</span>
                        </span>
                    </div>
                    <div class="backup-info-item">
                        <span class="backup-info-label">Created</span>
                        <span class="backup-info-value">${formatDate(job.created_at)}</span>
                    </div>
                    <div class="backup-info-item">
                        <span class="backup-info-label">Created By</span>
                        <span class="backup-info-value">${escapeHtml(job.created_by)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render migration import list
     */
    function renderMigrationImportList(backups) {
        const container = document.getElementById('migration-import-list');
        if (!container) return;

        if (backups.length === 0) {
            container.innerHTML = `
                <p>Select a migration backup to import:</p>
                <div class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <p>No migration backups available</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <p>Select a migration backup to import:</p>
            ${backups.map(job => `
                <div class="backup-card">
                    <div class="backup-card-header">
                        <h4 class="backup-card-title">${escapeHtml(job.name)}</h4>
                        <div class="backup-card-actions">
                            <button class="btn btn-sm btn-primary" onclick="importMigration('${job.id}')">
                                📥 Import
                            </button>
                        </div>
                    </div>
                    <div class="backup-card-body">
                        <div class="backup-info-item">
                            <span class="backup-info-label">Created</span>
                            <span class="backup-info-value">${formatDate(job.created_at)}</span>
                        </div>
                        <div class="backup-info-item">
                            <span class="backup-info-label">Size</span>
                            <span class="backup-info-value">${formatBytes(job.file_size)}</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        `;
    }

    /**
     * Create a new backup
     */
    async function createBackup() {
        const form = document.getElementById('create-backup-form');
        const formData = new FormData(form);
        
        const data = {
            name: formData.get('name'),
            type: formData.get('type'),
            retentionPolicy: formData.get('retentionPolicy')
        };

        try {
            const response = await fetch('/api/backups/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create backup');
            }

            const result = await response.json();
            showNotification('Backup job created successfully', 'success');
            form.reset();
            
            // Hide estimated size
            const estimatedSizeEl = document.getElementById('estimated-size');
            if (estimatedSizeEl) {
                estimatedSizeEl.style.display = 'none';
            }

            // Show progress indicator
            if (result.jobId) {
                showBackupProgress(result.jobId);
            }
            
            // Reload backups list
            setTimeout(() => loadBackupJobs(), 1000);
        } catch (error) {
            console.error('[Backups] Error creating backup:', error);
            showNotification(error.message, 'error');
        }
    }

    /**
     * Preview backup contents
     */
    window.previewBackup = async function(backupId) {
        try {
            const response = await fetch(`/api/backups/preview/${backupId}`);
            if (!response.ok) {
                throw new Error('Failed to preview backup');
            }

            const data = await response.json();
            
            const modal = document.getElementById('preview-modal');
            const content = document.getElementById('preview-content');
            
            content.innerHTML = `
                <div class="backup-info-item" style="margin-bottom: 20px;">
                    <span class="backup-info-label">File Name</span>
                    <span class="backup-info-value">${escapeHtml(data.fileName)}</span>
                </div>
                <div class="backup-info-item" style="margin-bottom: 20px;">
                    <span class="backup-info-label">Total Size</span>
                    <span class="backup-info-value">${formatBytes(data.fileSize)}</span>
                </div>
                <h4>Contents:</h4>
                <ul class="preview-list">
                    ${data.contents.map(item => `
                        <li class="preview-item">
                            <span>${item.isDirectory ? '📁' : '📄'} ${escapeHtml(item.name)}</span>
                            <span>${item.isDirectory ? '' : formatBytes(item.size)}</span>
                        </li>
                    `).join('')}
                </ul>
            `;
            
            modal.classList.add('active');
        } catch (error) {
            console.error('[Backups] Error previewing backup:', error);
            showNotification(error.message, 'error');
        }
    };

    /**
     * Close preview modal
     */
    window.closePreviewModal = function() {
        const modal = document.getElementById('preview-modal');
        modal.classList.remove('active');
    };

    /**
     * Download backup
     */
    window.downloadBackup = function(backupId) {
        window.location.href = `/api/backups/download/${backupId}`;
    };

    /**
     * Delete backup
     */
    window.deleteBackup = async function(backupId) {
        if (!confirm('Are you sure you want to delete this backup? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/backups/${backupId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete backup');
            }

            showNotification('Backup deleted successfully', 'success');
            loadBackupJobs();
        } catch (error) {
            console.error('[Backups] Error deleting backup:', error);
            showNotification(error.message, 'error');
        }
    };

    /**
     * Initiate restore
     */
    window.initiateRestore = function(backupId) {
        selectedBackupForRestore = backupId;
        const modal = document.getElementById('restore-modal');
        modal.classList.add('active');

        const confirmBtn = document.getElementById('confirm-restore-btn');
        confirmBtn.onclick = () => performRestore(backupId);
    };

    /**
     * Close restore modal
     */
    window.closeRestoreModal = function() {
        const modal = document.getElementById('restore-modal');
        modal.classList.remove('active');
        selectedBackupForRestore = null;
    };

    /**
     * Perform restore
     */
    async function performRestore(backupId) {
        try {
            const response = await fetch('/api/backups/restore', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    backupId,
                    createPreBackup: true
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to restore backup');
            }

            showNotification('Restore initiated successfully. This may take several minutes.', 'success');
            closeRestoreModal();
            
            // Switch to history tab to show progress
            setTimeout(() => {
                const historyTab = document.querySelector('.tab[data-tab="history"]');
                if (historyTab) historyTab.click();
                loadRestoreJobs();
            }, 1000);
        } catch (error) {
            console.error('[Backups] Error restoring backup:', error);
            showNotification(error.message, 'error');
        }
    }

    /**
     * Show migration step
     */
    window.showMigrationStep = function(step) {
        document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
        const stepEl = document.getElementById(`migration-${step}`);
        if (stepEl) {
            stepEl.classList.add('active');
        }

        if (step === 'import') {
            loadMigrationBackups();
        }
    };

    /**
     * Create migration export
     */
    async function createMigrationExport() {
        const form = document.getElementById('migration-export-form');
        const formData = new FormData(form);
        
        const data = {
            name: formData.get('name') || `Migration Export ${new Date().toISOString()}`
        };

        try {
            const response = await fetch('/api/backups/migrate/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create migration export');
            }

            const result = await response.json();
            showNotification('Migration export created successfully', 'success');
            form.reset();
            
            // Show download option
            if (confirm('Export created successfully. Would you like to download it now?')) {
                window.downloadBackup(result.backupId);
            }

            showMigrationStep('choice');
            loadMigrationJobs();
        } catch (error) {
            console.error('[Backups] Error creating migration export:', error);
            showNotification(error.message, 'error');
        }
    }

    /**
     * Import migration
     */
    window.importMigration = async function(backupId) {
        if (!confirm('⚠️ WARNING: This will completely replace your current server data! Are you sure?')) {
            return;
        }

        if (!confirm('This action cannot be undone. A pre-restore backup will be created. Continue?')) {
            return;
        }

        try {
            const response = await fetch('/api/backups/migrate/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ backupId })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to import migration');
            }

            showNotification('Migration import initiated. This may take several minutes.', 'success');
            showMigrationStep('choice');
            
            // Switch to history tab
            setTimeout(() => {
                const historyTab = document.querySelector('.tab[data-tab="history"]');
                if (historyTab) historyTab.click();
                loadRestoreJobs();
            }, 1000);
        } catch (error) {
            console.error('[Backups] Error importing migration:', error);
            showNotification(error.message, 'error');
        }
    };

    /**
     * Format bytes to human readable
     */
    function formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Format date
     */
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString();
    }

    /**
     * Escape HTML
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show notification
     */
    function showNotification(message, type = 'info') {
        // Use existing notification system if available
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            alert(message);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
