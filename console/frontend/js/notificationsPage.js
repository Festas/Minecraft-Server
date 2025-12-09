/**
 * Notifications Page JavaScript
 * Handles notification listing, filtering, and preferences
 */

let currentPage = 0;
const pageSize = 20;
let currentFilters = {
    status: 'unread',
    category: '',
    severity: ''
};
let socket = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    await loadNotifications();
    setupEventListeners();
    initializeWebSocket();
});

/**
 * Check authentication
 */
async function checkAuth() {
    try {
        const response = await fetch('/api/session', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            window.location.href = '/login.html';
            return;
        }
        
        const data = await response.json();
        if (!data.authenticated) {
            window.location.href = '/login.html';
            return;
        }
        
        // Display username
        document.getElementById('username').textContent = data.username;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/login.html';
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => {
        loadNotifications();
    });

    // Mark all read button
    document.getElementById('markAllReadBtn').addEventListener('click', async () => {
        if (confirm('Mark all notifications as read?')) {
            await markAllAsRead();
        }
    });

    // Preferences button
    document.getElementById('preferencesBtn').addEventListener('click', () => {
        openPreferencesModal();
    });

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await logout();
    });

    // Filters
    document.getElementById('statusFilter').addEventListener('change', (e) => {
        currentFilters.status = e.target.value;
        currentPage = 0;
        loadNotifications();
    });

    document.getElementById('categoryFilter').addEventListener('change', (e) => {
        currentFilters.category = e.target.value;
        currentPage = 0;
        loadNotifications();
    });

    document.getElementById('severityFilter').addEventListener('change', (e) => {
        currentFilters.severity = e.target.value;
        currentPage = 0;
        loadNotifications();
    });

    // Pagination
    document.getElementById('prevPageBtn').addEventListener('click', () => {
        if (currentPage > 0) {
            currentPage--;
            loadNotifications();
        }
    });

    document.getElementById('nextPageBtn').addEventListener('click', () => {
        currentPage++;
        loadNotifications();
    });

    // Preferences modal
    document.getElementById('savePreferencesBtn').addEventListener('click', () => {
        savePreferences();
    });

    document.getElementById('cancelPreferencesBtn').addEventListener('click', () => {
        closePreferencesModal();
    });
}

/**
 * Initialize WebSocket connection
 */
function initializeWebSocket() {
    socket = io({
        transports: ['websocket'],
        upgrade: false,
        withCredentials: true
    });

    socket.on('connect', () => {
        console.log('WebSocket connected');
    });

    socket.on('notification', (notification) => {
        // Add new notification to the list
        prependNotification(notification);
    });

    socket.on('toast-notification', (notification) => {
        // Show toast notification
        showToast(notification);
    });

    socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
    });
}

/**
 * Load notifications from API
 */
async function loadNotifications() {
    try {
        const params = new URLSearchParams({
            limit: pageSize,
            offset: currentPage * pageSize,
            ...currentFilters
        });

        const response = await fetch(`/api/notifications?${params}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load notifications');
        }

        const data = await response.json();
        displayNotifications(data);
        updatePagination(data);
    } catch (error) {
        console.error('Error loading notifications:', error);
        showToast({ 
            title: 'Error', 
            message: 'Failed to load notifications',
            severity: 'error'
        });
    }
}

/**
 * Display notifications in the list
 */
function displayNotifications(data) {
    const listEl = document.getElementById('notificationList');
    
    if (data.notifications.length === 0) {
        listEl.innerHTML = '<div class="empty-state">No notifications found</div>';
        return;
    }

    listEl.innerHTML = data.notifications.map(n => createNotificationElement(n)).join('');

    // Add event listeners to notification items
    listEl.querySelectorAll('.notification-item').forEach(item => {
        const id = parseInt(item.dataset.id);
        const status = item.dataset.status;

        // Mark as read on click
        if (status === 'unread') {
            item.addEventListener('click', () => markAsRead(id));
        }

        // Delete button
        const deleteBtn = item.querySelector('.notification-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteNotification(id);
            });
        }
    });
}

/**
 * Create HTML for a notification item
 */
function createNotificationElement(notification) {
    const severityClass = `severity-${notification.severity}`;
    const statusClass = notification.status === 'unread' ? 'unread' : '';
    const timestamp = new Date(notification.created_at).toLocaleString();

    return `
        <div class="notification-item ${severityClass} ${statusClass}" 
             data-id="${notification.id}" 
             data-status="${notification.status}"
             role="listitem">
            <div class="notification-icon">
                ${getSeverityIcon(notification.severity)}
            </div>
            <div class="notification-content">
                <div class="notification-header">
                    <span class="notification-title">${escapeHtml(notification.title)}</span>
                    <span class="notification-category badge">${notification.category}</span>
                    <span class="notification-time">${timestamp}</span>
                </div>
                ${notification.message ? `<div class="notification-message">${escapeHtml(notification.message)}</div>` : ''}
            </div>
            <button class="notification-delete btn-icon" aria-label="Delete notification">×</button>
        </div>
    `;
}

/**
 * Get icon for severity level
 */
function getSeverityIcon(severity) {
    const icons = {
        debug: '🔍',
        info: 'ℹ️',
        warning: '⚠️',
        error: '❌',
        critical: '🚨'
    };
    return icons[severity] || 'ℹ️';
}

/**
 * Prepend a new notification to the list
 */
function prependNotification(notification) {
    const listEl = document.getElementById('notificationList');
    
    // Remove empty state if present
    const emptyState = listEl.querySelector('.empty-state');
    if (emptyState) {
        listEl.innerHTML = '';
    }

    const notificationHtml = createNotificationElement(notification);
    listEl.insertAdjacentHTML('afterbegin', notificationHtml);

    // Add event listener to new item
    const newItem = listEl.firstElementChild;
    const id = parseInt(newItem.dataset.id);
    
    if (notification.status === 'unread') {
        newItem.addEventListener('click', () => markAsRead(id));
    }

    const deleteBtn = newItem.querySelector('.notification-delete');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteNotification(id);
        });
    }
}

/**
 * Mark notification as read
 */
async function markAsRead(id) {
    try {
        const csrfToken = await getCSRFToken();
        const response = await fetch(`/api/notifications/${id}/read`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            }
        });

        if (response.ok) {
            // Update UI
            const item = document.querySelector(`[data-id="${id}"]`);
            if (item) {
                item.classList.remove('unread');
                item.dataset.status = 'read';
            }
        }
    } catch (error) {
        console.error('Error marking as read:', error);
    }
}

/**
 * Mark all notifications as read
 */
async function markAllAsRead() {
    try {
        const csrfToken = await getCSRFToken();
        const response = await fetch('/api/notifications/read-all', {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            }
        });

        if (response.ok) {
            loadNotifications();
            showToast({
                title: 'Success',
                message: 'All notifications marked as read',
                severity: 'info'
            });
        }
    } catch (error) {
        console.error('Error marking all as read:', error);
        showToast({
            title: 'Error',
            message: 'Failed to mark all as read',
            severity: 'error'
        });
    }
}

/**
 * Delete notification
 */
async function deleteNotification(id) {
    try {
        const csrfToken = await getCSRFToken();
        const response = await fetch(`/api/notifications/${id}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'CSRF-Token': csrfToken
            }
        });

        if (response.ok) {
            // Remove from UI
            const item = document.querySelector(`[data-id="${id}"]`);
            if (item) {
                item.remove();
            }
        }
    } catch (error) {
        console.error('Error deleting notification:', error);
    }
}

/**
 * Update pagination controls
 */
function updatePagination(data) {
    const paginationEl = document.getElementById('pagination');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const pageInfo = document.getElementById('pageInfo');

    paginationEl.classList.remove('hidden');
    
    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = !data.hasMore;
    
    const start = currentPage * pageSize + 1;
    const end = Math.min((currentPage + 1) * pageSize, currentPage * pageSize + data.notifications.length);
    pageInfo.textContent = `Showing ${start}-${end} of ${data.total}`;
}

/**
 * Open preferences modal
 */
async function openPreferencesModal() {
    try {
        const response = await fetch('/api/notifications/preferences', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to load preferences');
        }

        const prefs = await response.json();
        populatePreferences(prefs);
        
        document.getElementById('preferencesModal').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading preferences:', error);
        showToast({
            title: 'Error',
            message: 'Failed to load preferences',
            severity: 'error'
        });
    }
}

/**
 * Close preferences modal
 */
function closePreferencesModal() {
    document.getElementById('preferencesModal').classList.add('hidden');
}

/**
 * Populate preferences form
 */
function populatePreferences(prefs) {
    document.getElementById('prefEnabled').checked = prefs.enabled;
    document.getElementById('prefSeverity').value = prefs.severity_filter || 'info';
    
    // Channels
    document.querySelectorAll('input[name="channels"]').forEach(cb => {
        cb.checked = prefs.channels && prefs.channels.includes(cb.value);
    });

    // Categories
    document.querySelectorAll('input[name="categories"]').forEach(cb => {
        cb.checked = prefs.categories && prefs.categories.includes(cb.value);
    });

    // Quiet hours
    if (prefs.quiet_hours_start) {
        document.getElementById('prefQuietStart').value = prefs.quiet_hours_start;
    }
    if (prefs.quiet_hours_end) {
        document.getElementById('prefQuietEnd').value = prefs.quiet_hours_end;
    }
}

/**
 * Save preferences
 */
async function savePreferences() {
    try {
        const channels = Array.from(document.querySelectorAll('input[name="channels"]:checked'))
            .map(cb => cb.value);

        const categories = Array.from(document.querySelectorAll('input[name="categories"]:checked'))
            .map(cb => cb.value);

        const preferences = {
            enabled: document.getElementById('prefEnabled').checked,
            channels: channels.length > 0 ? channels : ['web', 'toast', 'inbox'],
            categories: categories.length > 0 ? categories : null,
            severity_filter: document.getElementById('prefSeverity').value,
            quiet_hours_start: document.getElementById('prefQuietStart').value || null,
            quiet_hours_end: document.getElementById('prefQuietEnd').value || null
        };

        const csrfToken = await getCSRFToken();
        const response = await fetch('/api/notifications/preferences', {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify(preferences)
        });

        if (response.ok) {
            closePreferencesModal();
            showToast({
                title: 'Success',
                message: 'Preferences saved',
                severity: 'info'
            });
        } else {
            throw new Error('Failed to save preferences');
        }
    } catch (error) {
        console.error('Error saving preferences:', error);
        showToast({
            title: 'Error',
            message: 'Failed to save preferences',
            severity: 'error'
        });
    }
}

/**
 * Show toast notification
 */
function showToast(notification) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${notification.severity}`;
    
    const icon = getSeverityIcon(notification.severity);
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <div class="toast-title">${escapeHtml(notification.title)}</div>
            ${notification.message ? `<div class="toast-message">${escapeHtml(notification.message)}</div>` : ''}
        </div>
        <button class="toast-close" aria-label="Close">×</button>
    `;
    
    container.appendChild(toast);
    
    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

/**
 * Get CSRF token
 */
async function getCSRFToken() {
    const response = await fetch('/api/csrf-token', {
        credentials: 'include'
    });
    const data = await response.json();
    return data.csrfToken;
}

/**
 * Logout
 */
async function logout() {
    try {
        const csrfToken = await getCSRFToken();
        await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'CSRF-Token': csrfToken
            }
        });
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
