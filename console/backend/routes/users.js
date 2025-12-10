/**
 * User Management Routes
 * 
 * API endpoints for managing users (CRUD operations).
 * These endpoints are restricted to Owner role only.
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/auth');
const { requireOwner } = require('../middleware/rbac');
const { 
    getAllUsers, 
    getUser, 
    createUser, 
    updateUserRole, 
    updateUserPassword,
    updateUserStatus,
    deleteUser 
} = require('../auth/auth');
const { logAuditEvent, AUDIT_EVENTS, getClientIp } = require('../services/auditLog');
const { ROLES, isValidRole } = require('../config/rbac');

/**
 * GET /api/users
 * Get all users (excluding passwords)
 * Requires: Owner role
 */
router.get('/', requireAuth, requireOwner, async (req, res) => {
    try {
        const users = await getAllUsers();
        res.json({ users });
    } catch (error) {
        console.error('[Users API] Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

/**
 * GET /api/users/:username
 * Get a specific user by username
 * Requires: Owner role
 */
router.get('/:username', requireAuth, requireOwner, async (req, res) => {
    try {
        const { username } = req.params;
        const user = await getUser(username);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ user });
    } catch (error) {
        console.error('[Users API] Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

/**
 * POST /api/users
 * Create a new user
 * Requires: Owner role
 */
router.post('/', requireAuth, requireOwner, async (req, res) => {
    try {
        const { username, password, role } = req.body;
        
        // Validation
        if (!username || !password || !role) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                message: 'Username, password, and role are required' 
            });
        }
        
        // Validate username format
        if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username)) {
            return res.status(400).json({ 
                error: 'Invalid username',
                message: 'Username must be 3-32 characters and contain only letters, numbers, underscores, and hyphens' 
            });
        }
        
        // Validate password length
        if (password.length < 8) {
            return res.status(400).json({ 
                error: 'Invalid password',
                message: 'Password must be at least 8 characters long' 
            });
        }
        
        // Validate role
        if (!isValidRole(role)) {
            return res.status(400).json({ 
                error: 'Invalid role',
                message: `Role must be one of: ${Object.values(ROLES).join(', ')}` 
            });
        }
        
        const createdBy = req.session.username;
        const user = await createUser(username, password, role, createdBy);
        
        // Log audit event
        await logAuditEvent(
            AUDIT_EVENTS.USER_CREATED,
            createdBy,
            { 
                newUsername: username,
                role,
                createdBy
            },
            getClientIp(req)
        );
        
        res.status(201).json({ 
            success: true,
            message: 'User created successfully',
            user 
        });
    } catch (error) {
        console.error('[Users API] Error creating user:', error);
        
        if (error.message === 'User already exists') {
            return res.status(409).json({ error: error.message });
        }
        
        res.status(500).json({ error: 'Failed to create user' });
    }
});

/**
 * PUT /api/users/:username/role
 * Update user role
 * Requires: Owner role
 */
router.put('/:username/role', requireAuth, requireOwner, async (req, res) => {
    try {
        const { username } = req.params;
        const { role } = req.body;
        
        if (!role) {
            return res.status(400).json({ 
                error: 'Missing required field',
                message: 'Role is required' 
            });
        }
        
        // Validate role
        if (!isValidRole(role)) {
            return res.status(400).json({ 
                error: 'Invalid role',
                message: `Role must be one of: ${Object.values(ROLES).join(', ')}` 
            });
        }
        
        // Prevent changing own role
        if (username === req.session.username) {
            return res.status(403).json({ 
                error: 'Cannot change own role',
                message: 'You cannot change your own role. Ask another owner to do this.' 
            });
        }
        
        const user = await updateUserRole(username, role);
        
        // Log audit event
        await logAuditEvent(
            AUDIT_EVENTS.USER_ROLE_CHANGED,
            req.session.username,
            { 
                targetUsername: username,
                newRole: role
            },
            getClientIp(req)
        );
        
        // TODO: Invalidate user's sessions when role changes
        
        res.json({ 
            success: true,
            message: 'User role updated successfully',
            user 
        });
    } catch (error) {
        console.error('[Users API] Error updating user role:', error);
        
        if (error.message === 'User not found') {
            return res.status(404).json({ error: error.message });
        }
        
        res.status(500).json({ error: 'Failed to update user role' });
    }
});

/**
 * PUT /api/users/:username/password
 * Update user password
 * Requires: Owner role
 */
router.put('/:username/password', requireAuth, requireOwner, async (req, res) => {
    try {
        const { username } = req.params;
        const { password } = req.body;
        
        if (!password) {
            return res.status(400).json({ 
                error: 'Missing required field',
                message: 'Password is required' 
            });
        }
        
        // Validate password length
        if (password.length < 8) {
            return res.status(400).json({ 
                error: 'Invalid password',
                message: 'Password must be at least 8 characters long' 
            });
        }
        
        await updateUserPassword(username, password);
        
        // Log audit event
        await logAuditEvent(
            AUDIT_EVENTS.USER_PASSWORD_CHANGED,
            req.session.username,
            { 
                targetUsername: username,
                changedBy: req.session.username
            },
            getClientIp(req)
        );
        
        // TODO: Invalidate user's sessions when password changes
        
        res.json({ 
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        console.error('[Users API] Error updating password:', error);
        
        if (error.message === 'User not found') {
            return res.status(404).json({ error: error.message });
        }
        
        res.status(500).json({ error: 'Failed to update password' });
    }
});

/**
 * PUT /api/users/:username/status
 * Enable or disable a user account
 * Requires: Owner role
 */
router.put('/:username/status', requireAuth, requireOwner, async (req, res) => {
    try {
        const { username } = req.params;
        const { enabled } = req.body;
        
        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ 
                error: 'Missing required field',
                message: 'Enabled status (boolean) is required' 
            });
        }
        
        // Prevent disabling own account
        if (username === req.session.username) {
            return res.status(403).json({ 
                error: 'Cannot disable own account',
                message: 'You cannot disable your own account' 
            });
        }
        
        const user = await updateUserStatus(username, enabled);
        
        // Log audit event
        await logAuditEvent(
            enabled ? AUDIT_EVENTS.USER_ENABLED : AUDIT_EVENTS.USER_DISABLED,
            req.session.username,
            { 
                targetUsername: username,
                enabled
            },
            getClientIp(req)
        );
        
        // TODO: Invalidate user's sessions when account is disabled
        
        res.json({ 
            success: true,
            message: `User ${enabled ? 'enabled' : 'disabled'} successfully`,
            user 
        });
    } catch (error) {
        console.error('[Users API] Error updating user status:', error);
        
        if (error.message === 'User not found') {
            return res.status(404).json({ error: error.message });
        }
        
        res.status(500).json({ error: 'Failed to update user status' });
    }
});

/**
 * DELETE /api/users/:username
 * Delete a user
 * Requires: Owner role
 */
router.delete('/:username', requireAuth, requireOwner, async (req, res) => {
    try {
        const { username } = req.params;
        
        // Prevent deleting own account
        if (username === req.session.username) {
            return res.status(403).json({ 
                error: 'Cannot delete own account',
                message: 'You cannot delete your own account' 
            });
        }
        
        await deleteUser(username);
        
        // Log audit event
        await logAuditEvent(
            AUDIT_EVENTS.USER_DELETED,
            req.session.username,
            { 
                deletedUsername: username
            },
            getClientIp(req)
        );
        
        // TODO: Invalidate user's sessions when account is deleted
        
        res.json({ 
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('[Users API] Error deleting user:', error);
        
        if (error.message === 'User not found') {
            return res.status(404).json({ error: error.message });
        }
        
        if (error.message === 'Cannot delete the last owner account') {
            return res.status(403).json({ error: error.message });
        }
        
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

module.exports = router;
