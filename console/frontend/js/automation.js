// Automation & Scheduler Page
let currentEditingTask = null;
let csrfToken = null;

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication and authorization
    checkAuthAndRole();
    
    // Fetch CSRF token
    fetchCsrfToken();
    
    // Set up navigation
    setupNavigation();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize tabs
    initTabs();
    
    // Initialize preset buttons
    initPresets();
    
    // Load initial data
    loadTasks();
    loadHistory();
});

async function checkAuthAndRole() {
    try {
        const response = await fetch('/api/session', {
            credentials: 'same-origin'
        });
        const data = await response.json();
        
        if (!data.authenticated) {
            window.location.href = '/console/login.html';
            return;
        }
        
        // Store user info globally
        window.currentUser = {
            username: data.username,
            role: data.role
        };
        
        const userBadge = document.getElementById('currentUser');
        if (userBadge) {
            const roleDisplay = data.role ? ` (${capitalizeFirstLetter(data.role)})` : '';
            userBadge.textContent = (data.username || 'Admin') + roleDisplay;
        }
        
        // Check permissions and show/hide UI elements
        checkPermissions(data.role);
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/console/login.html';
    }
}

function checkPermissions(role) {
    // Define role permissions
    const permissions = {
        owner: {
            view: true,
            create: true,
            edit: true,
            delete: true,
            execute: true,
            history: true
        },
        admin: {
            view: true,
            create: true,
            edit: true,
            delete: true,
            execute: true,
            history: true
        },
        moderator: {
            view: true,
            create: false,
            edit: false,
            delete: false,
            execute: true,
            history: true
        },
        viewer: {
            view: true,
            create: false,
            edit: false,
            delete: false,
            execute: false,
            history: true
        }
    };
    
    const userPerms = permissions[role] || permissions.viewer;
    
    // Show/hide create button
    if (userPerms.create) {
        document.getElementById('createTaskBtn').classList.remove('hidden');
    }
    
    // Store permissions globally
    window.userPermissions = userPerms;
    
    // Check if user has view permission
    if (!userPerms.view) {
        document.getElementById('accessDenied').classList.remove('hidden');
        document.querySelector('.sidebar').style.display = 'none';
        document.getElementById('tasks').style.display = 'none';
        document.getElementById('history').style.display = 'none';
    }
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetSection = item.dataset.section;
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Show target section
            sections.forEach(section => {
                if (section.id === targetSection) {
                    section.classList.add('active');
                } else {
                    section.classList.remove('active');
                }
            });
            
            // Load data for section
            if (targetSection === 'history') {
                loadHistory();
            }
        });
    });
}

function setupEventListeners() {
    // Back button
    document.getElementById('backBtn').addEventListener('click', () => {
        window.location.href = '/console/index.html';
    });
    
    // Go back button (access denied)
    document.getElementById('goBackBtn')?.addEventListener('click', () => {
        window.location.href = '/console/index.html';
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Create task button
    document.getElementById('createTaskBtn').addEventListener('click', () => {
        openTaskModal();
    });
    
    // Modal close
    document.getElementById('closeTaskModal').addEventListener('click', closeTaskModal);
    document.getElementById('cancelTaskBtn').addEventListener('click', closeTaskModal);
    
    // Task form submit
    document.getElementById('taskForm').addEventListener('submit', handleTaskFormSubmit);
    
    // Task type change - update config fields (for radio buttons)
    const taskTypeRadios = document.querySelectorAll('input[name="task_type"]');
    if (taskTypeRadios.length > 0) {
        taskTypeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                updateConfigFields(e.target.value);
            });
        });
    }
    
    // History filter
    document.getElementById('historyFilter').addEventListener('change', loadHistory);
    
    // Refresh history
    document.getElementById('refreshHistoryBtn').addEventListener('click', loadHistory);
}

async function fetchCsrfToken() {
    try {
        const response = await fetch('/api/csrf-token', {
            credentials: 'same-origin'
        });
        const data = await response.json();
        csrfToken = data.token;
    } catch (error) {
        console.error('Failed to fetch CSRF token:', error);
    }
}

async function loadTasks() {
    try {
        const response = await fetch('/api/automation/tasks', {
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load tasks');
        }
        
        const data = await response.json();
        displayTasks(data.tasks);
        
        // Update stats and timeline
        updateStats(data.tasks);
        renderTimeline(data.tasks);
    } catch (error) {
        console.error('Error loading tasks:', error);
        showError('Failed to load scheduled tasks');
    }
}

function displayTasks(tasks) {
    const container = document.getElementById('tasksContainer');
    
    if (!tasks || tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⏰</div>
                <p>No scheduled tasks yet</p>
                <p style="color: var(--text-muted);">Create your first automation task to get started</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = tasks.map(task => createTaskCard(task)).join('');
    
    // Add event listeners to action buttons
    tasks.forEach(task => {
        // Execute button
        const executeBtn = document.getElementById(`execute-${task.id}`);
        if (executeBtn) {
            executeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                executeTask(task.id);
            });
        }
        
        // Edit button
        const editBtn = document.getElementById(`edit-${task.id}`);
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openTaskModal(task);
            });
        }
        
        // Delete button
        const deleteBtn = document.getElementById(`delete-${task.id}`);
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteTask(task.id, task.name);
            });
        }
        
        // Toggle button
        const toggleBtn = document.getElementById(`toggle-${task.id}`);
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleTask(task.id, !task.enabled);
            });
        }
    });
}

function createTaskCard(task) {
    const perms = window.userPermissions || {};
    const taskTypeClass = `task-type-${task.task_type}`;
    const statusClass = task.enabled ? 'task-status-enabled' : 'task-status-disabled';
    const statusText = task.enabled ? 'Enabled' : 'Disabled';
    const cardStatusClass = task.enabled ? 'status-enabled' : 'status-disabled';
    
    // Task type icons
    const taskIcons = {
        backup: '💾',
        restart: '🔄',
        broadcast: '📢',
        command: '⚡'
    };
    
    const taskIcon = taskIcons[task.task_type] || '📋';
    
    return `
        <div class="task-card ${cardStatusClass}">
            <div class="task-card-header">
                <div>
                    <h3 class="task-card-title">${taskIcon} ${escapeHtml(task.name)}</h3>
                    <span class="task-type-badge ${taskTypeClass}">${task.task_type}</span>
                    <span class="${statusClass}" style="margin-left: 8px;">${statusText}</span>
                </div>
                <div class="task-card-actions">
                    ${perms.execute ? `<button id="execute-${task.id}" class="btn btn-primary btn-sm" title="Execute now">▶️</button>` : ''}
                    ${perms.edit ? `<button id="edit-${task.id}" class="btn btn-secondary btn-sm" title="Edit">✏️</button>` : ''}
                    ${perms.edit ? `<button id="toggle-${task.id}" class="btn btn-secondary btn-sm" title="Toggle">${task.enabled ? '⏸️' : '▶️'}</button>` : ''}
                    ${perms.delete ? `<button id="delete-${task.id}" class="btn btn-danger btn-sm" title="Delete">🗑️</button>` : ''}
                </div>
            </div>
            <div class="task-card-body">
                <div class="task-card-info">
                    ${task.description ? `<p>${escapeHtml(task.description)}</p>` : ''}
                    <p><strong>Schedule:</strong> <code>${escapeHtml(task.cron_expression)}</code></p>
                    ${task.last_run ? `<p><strong>Last Run:</strong> ${formatDate(task.last_run)}</p>` : ''}
                    ${task.next_run ? `<p><strong>Next Run:</strong> ${formatRelativeTime(new Date(task.next_run))}</p>` : ''}
                </div>
                <div class="task-card-stats">
                    <div class="task-stat">
                        <span class="task-stat-label">Executions</span>
                        <span class="task-stat-value">${task.run_count || 0}</span>
                    </div>
                    <div class="task-stat">
                        <span class="task-stat-label">Created By</span>
                        <span class="task-stat-value">${escapeHtml(task.created_by)}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function openTaskModal(task = null) {
    currentEditingTask = task;
    const modal = document.getElementById('taskModal');
    const form = document.getElementById('taskForm');
    const title = document.getElementById('taskModalTitle');
    
    // Reset form
    form.reset();
    
    if (task) {
        // Edit mode
        title.textContent = 'Edit Task';
        document.getElementById('taskName').value = task.name;
        document.getElementById('taskDescription').value = task.description || '';
        
        // Set radio button for task type
        const taskTypeRadio = document.querySelector(`input[name="task_type"][value="${task.task_type}"]`);
        if (taskTypeRadio) {
            taskTypeRadio.checked = true;
        }
        
        document.getElementById('cronExpression').value = task.cron_expression;
        document.getElementById('taskEnabled').checked = task.enabled;
        
        // Update config fields
        updateConfigFields(task.task_type, task.config);
    } else {
        // Create mode
        title.textContent = 'Create Task';
        document.getElementById('taskEnabled').checked = true;
    }
    
    modal.classList.add('active');
}

function closeTaskModal() {
    document.getElementById('taskModal').classList.remove('active');
    currentEditingTask = null;
}

function updateConfigFields(taskType, config = {}) {
    const container = document.getElementById('taskConfigContainer');
    
    if (!taskType) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    
    let html = '<h4>Task Configuration</h4>';
    
    switch (taskType) {
        case 'backup':
            html += '<p style="color: var(--text-muted);">No additional configuration required for backups.</p>';
            break;
            
        case 'restart':
            html += `
                <div class="config-field">
                    <label for="warningMessage">Warning Message</label>
                    <input type="text" id="warningMessage" name="warning_message" 
                           value="${escapeHtml(config.warning_message || 'Server restarting in 30 seconds!')}"
                           placeholder="Message to show players before restart">
                </div>
                <div class="config-field">
                    <label for="warningDelay">Warning Delay (seconds)</label>
                    <input type="number" id="warningDelay" name="warning_delay" 
                           value="${config.warning_delay || 30}" min="10" max="300">
                </div>
            `;
            break;
            
        case 'broadcast':
            html += `
                <div class="config-field">
                    <label for="broadcastMessage">Message *</label>
                    <textarea id="broadcastMessage" name="message" required
                              placeholder="Message to broadcast to all players">${escapeHtml(config.message || '')}</textarea>
                </div>
            `;
            break;
            
        case 'command':
            html += `
                <div class="config-field">
                    <label for="commandText">Command *</label>
                    <input type="text" id="commandText" name="command" required
                           value="${escapeHtml(config.command || '')}"
                           placeholder="e.g., weather clear">
                    <small style="color: var(--text-muted);">Enter command without leading slash</small>
                </div>
            `;
            break;
    }
    
    container.innerHTML = html;
}

async function handleTaskFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const taskData = {
        name: formData.get('name'),
        description: formData.get('description'),
        task_type: formData.get('task_type'),
        cron_expression: formData.get('cron_expression'),
        enabled: formData.get('enabled') === 'on',
        config: {}
    };
    
    // Build config based on task type
    switch (taskData.task_type) {
        case 'restart':
            taskData.config.warning_message = formData.get('warning_message');
            taskData.config.warning_delay = parseInt(formData.get('warning_delay'), 10);
            break;
        case 'broadcast':
            taskData.config.message = formData.get('message');
            break;
        case 'command':
            taskData.config.command = formData.get('command');
            break;
    }
    
    try {
        const url = currentEditingTask 
            ? `/api/automation/tasks/${currentEditingTask.id}`
            : '/api/automation/tasks';
        
        const method = currentEditingTask ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            credentials: 'same-origin',
            body: JSON.stringify(taskData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save task');
        }
        
        showSuccess(currentEditingTask ? 'Task updated successfully' : 'Task created successfully');
        closeTaskModal();
        loadTasks();
    } catch (error) {
        console.error('Error saving task:', error);
        showError(error.message);
    }
}

async function executeTask(taskId) {
    if (!confirm('Are you sure you want to execute this task now?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/automation/tasks/${taskId}/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to execute task');
        }
        
        const data = await response.json();
        
        if (data.result.status === 'success') {
            showSuccess('Task executed successfully');
        } else {
            showError(`Task execution failed: ${data.result.error_message}`);
        }
        
        loadTasks();
        loadHistory();
    } catch (error) {
        console.error('Error executing task:', error);
        showError(error.message);
    }
}

async function toggleTask(taskId, enabled) {
    try {
        const response = await fetch(`/api/automation/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            credentials: 'same-origin',
            body: JSON.stringify({ enabled })
        });
        
        if (!response.ok) {
            throw new Error('Failed to toggle task');
        }
        
        showSuccess(enabled ? 'Task enabled' : 'Task disabled');
        loadTasks();
    } catch (error) {
        console.error('Error toggling task:', error);
        showError(error.message);
    }
}

async function deleteTask(taskId, taskName) {
    if (!confirm(`Are you sure you want to delete "${taskName}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/automation/tasks/${taskId}`, {
            method: 'DELETE',
            headers: {
                'X-CSRF-Token': csrfToken
            },
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete task');
        }
        
        showSuccess('Task deleted successfully');
        loadTasks();
    } catch (error) {
        console.error('Error deleting task:', error);
        showError(error.message);
    }
}

async function loadHistory() {
    try {
        const filter = document.getElementById('historyFilter').value;
        const params = new URLSearchParams();
        
        if (filter) {
            params.append('task_type', filter);
        }
        
        params.append('limit', '50');
        
        const response = await fetch(`/api/automation/history?${params}`, {
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load history');
        }
        
        const data = await response.json();
        displayHistory(data.history);
        
        // Update runs today stat from history
        updateRunsTodayStat(data.history);
    } catch (error) {
        console.error('Error loading history:', error);
        showError('Failed to load execution history');
    }
}

function displayHistory(history) {
    const container = document.getElementById('historyContainer');
    
    if (!history || history.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <p>No execution history yet</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = history.map(entry => `
        <div class="history-entry">
            <div class="history-header">
                <div>
                    <strong>${escapeHtml(entry.task_name)}</strong>
                    <span class="task-type-badge task-type-${entry.task_type}" style="margin-left: 8px;">${entry.task_type}</span>
                </div>
                <span class="history-status status-${entry.status}">${entry.status.toUpperCase()}</span>
            </div>
            <div style="margin-top: 8px; color: var(--text-muted); font-size: 14px;">
                <div><strong>Executed:</strong> ${formatDate(entry.executed_at)} by ${escapeHtml(entry.executed_by)}</div>
                <div><strong>Type:</strong> ${entry.execution_type === 'manual' ? 'Manual' : 'Scheduled'}</div>
                ${entry.duration_ms ? `<div><strong>Duration:</strong> ${entry.duration_ms}ms</div>` : ''}
                ${entry.error_message ? `<div style="color: var(--danger-color);"><strong>Error:</strong> ${escapeHtml(entry.error_message)}</div>` : ''}
            </div>
        </div>
    `).join('');
}

function formatDate(dateString) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showSuccess(message) {
    if (typeof showNotification === 'function') {
        showNotification(message, 'success');
    } else {
        alert(message);
    }
}

function showError(message) {
    if (typeof showNotification === 'function') {
        showNotification(message, 'error');
    } else {
        alert('Error: ' + message);
    }
}

// ============================================
// New Functions for Enhanced UI
// ============================================

/**
 * Update stats row with task counts
 */
function updateStats(tasks) {
    const total = tasks.length;
    const active = tasks.filter(t => t.enabled).length;
    const paused = tasks.filter(t => !t.enabled).length;
    
    document.getElementById('totalTasks').textContent = total;
    document.getElementById('activeTasks').textContent = active;
    document.getElementById('pausedTasks').textContent = paused;
}

/**
 * Update runs today stat from history
 */
function updateRunsTodayStat(history) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const runsToday = history.filter(entry => {
        const executedDate = new Date(entry.executed_at);
        executedDate.setHours(0, 0, 0, 0);
        return executedDate.getTime() === today.getTime();
    }).length;
    
    document.getElementById('runsToday').textContent = runsToday;
}

/**
 * Render timeline of upcoming executions in next 24 hours
 */
function renderTimeline(tasks) {
    const container = document.getElementById('timelineContainer');
    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // Filter enabled tasks with next_run within 24 hours
    const upcomingTasks = tasks
        .filter(task => {
            if (!task.enabled || !task.next_run) return false;
            const nextRun = new Date(task.next_run);
            return nextRun >= now && nextRun <= next24h;
        })
        .sort((a, b) => new Date(a.next_run) - new Date(b.next_run));
    
    if (upcomingTasks.length === 0) {
        container.innerHTML = `
            <div class="timeline-empty">
                <div class="timeline-empty-icon">⏰</div>
                <p>No upcoming executions scheduled in the next 24 hours</p>
            </div>
        `;
        return;
    }
    
    // Task type icons
    const taskIcons = {
        backup: '💾',
        restart: '🔄',
        broadcast: '📢',
        command: '⚡'
    };
    
    container.innerHTML = upcomingTasks.map(task => {
        const icon = taskIcons[task.task_type] || '📋';
        const relativeTime = formatRelativeTime(new Date(task.next_run));
        
        return `
            <div class="timeline-item">
                <div class="timeline-time">${relativeTime}</div>
                <div class="timeline-content">
                    <div class="timeline-task-name">${icon} ${escapeHtml(task.name)}</div>
                    <div class="timeline-task-type">
                        <span class="task-type-badge task-type-${task.task_type}">${task.task_type}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Format date/time relative to now (e.g., "In 2h", "3m ago")
 */
function formatRelativeTime(date) {
    const now = new Date();
    const diffMs = date - now;
    const diffMinutes = Math.floor(Math.abs(diffMs) / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    const isPast = diffMs < 0;
    const prefix = isPast ? '' : 'In ';
    const suffix = isPast ? ' ago' : '';
    
    if (diffDays > 0) {
        return `${prefix}${diffDays}d${suffix}`;
    } else if (diffHours > 0) {
        return `${prefix}${diffHours}h${suffix}`;
    } else if (diffMinutes > 0) {
        return `${prefix}${diffMinutes}m${suffix}`;
    } else {
        return 'Now';
    }
}

/**
 * Initialize tab navigation
 */
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    if (tabButtons.length === 0) {
        return;
    }
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            
            // Update active button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update active content
            tabContents.forEach(content => {
                if (content.id === targetTab) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
            
            // Load data for the selected tab
            if (targetTab === 'history') {
                loadHistory();
            }
        });
    });
}

/**
 * Initialize preset buttons for cron expressions
 */
function initPresets() {
    const presetButtons = document.querySelectorAll('.preset-button');
    const cronInput = document.getElementById('cronExpression');
    
    if (!cronInput || presetButtons.length === 0) {
        return;
    }
    
    presetButtons.forEach(button => {
        button.addEventListener('click', () => {
            const cronExpression = button.dataset.cron;
            if (cronInput) {
                cronInput.value = cronExpression;
                
                // Visual feedback
                button.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    button.style.transform = '';
                }, 100);
            }
        });
    });
}

async function logout() {
    try {
        await fetch('/api/logout', {
            method: 'POST',
            headers: {
                'X-CSRF-Token': csrfToken
            },
            credentials: 'same-origin'
        });
        window.location.href = '/console/login.html';
    } catch (error) {
        console.error('Logout failed:', error);
        window.location.href = '/console/login.html';
    }
}
