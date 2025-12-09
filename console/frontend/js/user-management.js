// User Management Page
let currentEditingUser = null;

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication and authorization
    checkAuthAndRole();
    
    // Fetch CSRF token
    fetchCsrfToken();
    
    // Set up navigation
    setupNavigation();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load initial data
    loadUsers();
    loadAuditLogs();
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
        
        // Check if user is Owner
        if (data.role !== 'owner') {
            document.getElementById('accessDenied').classList.remove('hidden');
            document.querySelector('.sidebar').style.display = 'none';
            document.getElementById('users').style.display = 'none';
            document.getElementById('audit').style.display = 'none';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/console/login.html';
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
    
    // Create user
    document.getElementById('createUserBtn').addEventListener('click', showCreateUserModal);
    document.getElementById('cancelCreateBtn').addEventListener('click', hideCreateUserModal);
    document.getElementById('createUserForm').addEventListener('submit', handleCreateUser);
    
    // Edit user
    document.getElementById('cancelEditBtn').addEventListener('click', hideEditUserModal);
    document.getElementById('editUserForm').addEventListener('submit', handleEditUser);
    
    // Audit filters
    document.getElementById('applyFiltersBtn').addEventListener('click', loadAuditLogs);
    document.getElementById('exportLogsBtn').addEventListener('click', exportAuditLogs);
}

// Users Management
async function loadUsers() {
    try {
        const csrfToken = getCookie('csrf-token');
        const response = await fetch('/api/users', {
            credentials: 'same-origin',
            headers: {
                'CSRF-Token': csrfToken
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load users');
        }
        
        const data = await response.json();
        displayUsers(data.users);
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Failed to load users', 'error');
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${escapeHtml(user.username)}</td>
            <td><span class="role-badge role-${user.role}">${capitalizeFirstLetter(user.role)}</span></td>
            <td>${user.enabled ? '<span class="status-active">Active</span>' : '<span class="status-inactive">Disabled</span>'}</td>
            <td>${formatDate(user.createdAt)}</td>
            <td>${user.lastLogin ? formatDate(user.lastLogin) : 'Never'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editUser('${escapeHtml(user.username)}')">Edit</button>
                ${user.username !== window.currentUser.username ? 
                    `<button class="btn btn-sm btn-danger" onclick="deleteUser('${escapeHtml(user.username)}')">Delete</button>` :
                    '<span class="text-muted">You</span>'
                }
            </td>
        </tr>
    `).join('');
}

function showCreateUserModal() {
    document.getElementById('createUserModal').classList.remove('hidden');
}

function hideCreateUserModal() {
    document.getElementById('createUserModal').classList.add('hidden');
    document.getElementById('createUserForm').reset();
}

async function handleCreateUser(e) {
    e.preventDefault();
    
    const username = document.getElementById('newUsername').value;
    const password = document.getElementById('newPassword').value;
    const role = document.getElementById('newRole').value;
    
    try {
        const csrfToken = getCookie('csrf-token');
        const response = await fetch('/api/users', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify({ username, password, role })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || data.error || 'Failed to create user');
        }
        
        showNotification('User created successfully', 'success');
        hideCreateUserModal();
        loadUsers();
    } catch (error) {
        console.error('Error creating user:', error);
        showNotification(error.message, 'error');
    }
}

async function editUser(username) {
    try {
        const csrfToken = getCookie('csrf-token');
        const response = await fetch(`/api/users/${username}`, {
            credentials: 'same-origin',
            headers: {
                'CSRF-Token': csrfToken
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load user');
        }
        
        const data = await response.json();
        currentEditingUser = username;
        
        document.getElementById('editUsername').textContent = username;
        document.getElementById('editRole').value = data.user.role;
        document.getElementById('editEnabled').checked = data.user.enabled;
        document.getElementById('editPassword').value = '';
        
        document.getElementById('editUserModal').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading user:', error);
        showNotification('Failed to load user', 'error');
    }
}

function hideEditUserModal() {
    document.getElementById('editUserModal').classList.add('hidden');
    currentEditingUser = null;
}

async function handleEditUser(e) {
    e.preventDefault();
    
    if (!currentEditingUser) return;
    
    const role = document.getElementById('editRole').value;
    const password = document.getElementById('editPassword').value;
    const enabled = document.getElementById('editEnabled').checked;
    
    try {
        const csrfToken = getCookie('csrf-token');
        
        // Update role
        const roleResponse = await fetch(`/api/users/${currentEditingUser}/role`, {
            method: 'PUT',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify({ role })
        });
        
        if (!roleResponse.ok) {
            const data = await roleResponse.json();
            throw new Error(data.message || data.error || 'Failed to update role');
        }
        
        // Update password if provided
        if (password) {
            const passwordResponse = await fetch(`/api/users/${currentEditingUser}/password`, {
                method: 'PUT',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': csrfToken
                },
                body: JSON.stringify({ password })
            });
            
            if (!passwordResponse.ok) {
                const data = await passwordResponse.json();
                throw new Error(data.message || data.error || 'Failed to update password');
            }
        }
        
        // Update status
        const statusResponse = await fetch(`/api/users/${currentEditingUser}/status`, {
            method: 'PUT',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify({ enabled })
        });
        
        if (!statusResponse.ok) {
            const data = await statusResponse.json();
            throw new Error(data.message || data.error || 'Failed to update status');
        }
        
        showNotification('User updated successfully', 'success');
        hideEditUserModal();
        loadUsers();
    } catch (error) {
        console.error('Error updating user:', error);
        showNotification(error.message, 'error');
    }
}

async function deleteUser(username) {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
        return;
    }
    
    try {
        const csrfToken = getCookie('csrf-token');
        const response = await fetch(`/api/users/${username}`, {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: {
                'CSRF-Token': csrfToken
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || data.error || 'Failed to delete user');
        }
        
        showNotification('User deleted successfully', 'success');
        loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification(error.message, 'error');
    }
}

// Audit Logs
async function loadAuditLogs() {
    try {
        const username = document.getElementById('filterUsername').value;
        const eventType = document.getElementById('filterEventType').value;
        
        const params = new URLSearchParams();
        params.append('limit', '100');
        if (username) params.append('username', username);
        if (eventType) params.append('eventType', eventType);
        
        const csrfToken = getCookie('csrf-token');
        const response = await fetch(`/api/audit/logs?${params}`, {
            credentials: 'same-origin',
            headers: {
                'CSRF-Token': csrfToken
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load audit logs');
        }
        
        const data = await response.json();
        displayAuditLogs(data.logs);
    } catch (error) {
        console.error('Error loading audit logs:', error);
        showNotification('Failed to load audit logs', 'error');
    }
}

function displayAuditLogs(logs) {
    const tbody = document.getElementById('auditLogsTableBody');
    
    if (!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No audit logs found</td></tr>';
        return;
    }
    
    tbody.innerHTML = logs.map(log => `
        <tr>
            <td>${formatDateTime(log.timestamp)}</td>
            <td><span class="event-badge">${log.eventType}</span></td>
            <td>${escapeHtml(log.username)}</td>
            <td>${escapeHtml(log.ipAddress || 'N/A')}</td>
            <td><pre>${JSON.stringify(log.details, null, 2)}</pre></td>
        </tr>
    `).join('');
}

async function exportAuditLogs() {
    try {
        const username = document.getElementById('filterUsername').value;
        const eventType = document.getElementById('filterEventType').value;
        
        const params = new URLSearchParams();
        if (username) params.append('username', username);
        if (eventType) params.append('eventType', eventType);
        
        const csrfToken = getCookie('csrf-token');
        const response = await fetch(`/api/audit/export?${params}`, {
            credentials: 'same-origin',
            headers: {
                'CSRF-Token': csrfToken
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to export audit logs');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showNotification('Audit logs exported successfully', 'success');
    } catch (error) {
        console.error('Error exporting audit logs:', error);
        showNotification('Failed to export audit logs', 'error');
    }
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function logout() {
    try {
        const csrfToken = getCookie('csrf-token');
        await fetch('/api/logout', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'CSRF-Token': csrfToken
            }
        });
        window.location.href = '/console/login.html';
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/console/login.html';
    }
}
