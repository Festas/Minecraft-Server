const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { ROLES, isValidRole } = require('../config/rbac');

const USERS_FILE = path.join(__dirname, '../config/users.json');
const PASSWORD_HASH_FILE = path.join(__dirname, '../config/.password_hash');

/**
 * Load users from JSON file
 */
async function loadUsers() {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading users:', error);
        
        // Require ADMIN_PASSWORD to be set
        if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === 'change-this-secure-password') {
            console.error('ERROR: ADMIN_PASSWORD environment variable must be set to a secure password!');
            console.error('Please set ADMIN_PASSWORD in your .env file before starting the console.');
            throw new Error('ADMIN_PASSWORD not configured');
        }
        
        // Return default admin if file doesn't exist
        return {
            users: [
                {
                    username: process.env.ADMIN_USERNAME || 'admin',
                    password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 10)
                }
            ]
        };
    }
}

/**
 * Save users to JSON file
 */
async function saveUsers(users) {
    try {
        await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Error saving users:', error);
        throw error;
    }
}

/**
 * Verify user credentials
 */
async function verifyCredentials(username, password) {
    const userData = await loadUsers();
    const user = userData.users.find(u => u.username === username);
    
    if (!user) {
        return null;
    }
    
    // Check if user is enabled
    if (user.enabled === false) {
        return null;
    }
    
    const valid = await bcrypt.compare(password, user.password);
    
    if (valid) {
        // Return user object with role information (excluding password)
        return {
            username: user.username,
            role: user.role || ROLES.VIEWER,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt
        };
    }
    
    return null;
}

/**
 * Authentication middleware
 */
function requireAuth(req, res, next) {
    console.log('[AUTH] Authentication check:', {
        path: req.path,
        method: req.method,
        sessionID: req.sessionID,
        hasSession: !!req.session,
        authenticated: req.session?.authenticated || false,
        username: req.session?.username || 'NOT_SET',
        hasCookies: !!req.headers.cookie,
        timestamp: new Date().toISOString()
    });
    
    if (req.session && req.session.authenticated) {
        console.log('[AUTH] Authentication successful for:', req.session.username);
        return next();
    }
    
    console.log('[AUTH] Authentication failed:', {
        reason: !req.session ? 'NO_SESSION' : 'NOT_AUTHENTICATED',
        sessionID: req.sessionID,
        sessionData: req.session
    });
    
    res.status(401).json({ error: 'Authentication required' });
}

/**
 * Get hash of the current environment password
 */
function getPasswordHash(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Check if password has changed since last initialization
 */
async function hasPasswordChanged() {
    try {
        const currentPassword = process.env.ADMIN_PASSWORD;
        if (!currentPassword) return true;
        
        const currentHash = getPasswordHash(currentPassword);
        const storedHash = await fs.readFile(PASSWORD_HASH_FILE, 'utf8');
        
        return currentHash !== storedHash.trim();
    } catch {
        // File doesn't exist or can't be read
        return true;
    }
}

/**
 * Save the current password hash
 */
async function savePasswordHash(password) {
    try {
        const hash = getPasswordHash(password);
        await fs.writeFile(PASSWORD_HASH_FILE, hash);
    } catch (error) {
        console.error('Error saving password hash:', error);
    }
}

/**
 * Initialize admin user if users.json doesn't exist or password changed
 */
async function initializeUsers() {
    // Require ADMIN_PASSWORD to be set
    if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === 'change-this-secure-password') {
        console.error('ERROR: ADMIN_PASSWORD environment variable must be set to a secure password!');
        console.error('Please set ADMIN_PASSWORD in your .env file before starting the console.');
        throw new Error('ADMIN_PASSWORD not configured');
    }

    try {
        await fs.access(USERS_FILE);
        
        // File exists, check if password changed
        if (await hasPasswordChanged()) {
            console.log('Admin password changed detected, regenerating users.json...');
            const defaultUsers = {
                users: [
                    {
                        username: process.env.ADMIN_USERNAME || 'admin',
                        password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 10),
                        role: ROLES.OWNER,
                        createdAt: new Date().toISOString(),
                        createdBy: 'system',
                        enabled: true
                    }
                ]
            };
            await saveUsers(defaultUsers);
            await savePasswordHash(process.env.ADMIN_PASSWORD);
            console.log('Updated admin user with new password. Please keep your password secure!');
        } else {
            console.log('Using existing users.json (password unchanged)');
        }
    } catch {
        // File doesn't exist, create it
        console.log('Creating new users.json...');
        const defaultUsers = {
            users: [
                {
                    username: process.env.ADMIN_USERNAME || 'admin',
                    password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 10),
                    role: ROLES.OWNER,
                    createdAt: new Date().toISOString(),
                    createdBy: 'system',
                    enabled: true
                }
            ]
        };
        await saveUsers(defaultUsers);
        await savePasswordHash(process.env.ADMIN_PASSWORD);
        console.log('Created default admin user with Owner role. Please keep your password secure!');
    }
}

/**
 * Update last login timestamp for a user
 */
async function updateLastLogin(username) {
    try {
        const userData = await loadUsers();
        const user = userData.users.find(u => u.username === username);
        
        if (user) {
            user.lastLogin = new Date().toISOString();
            await saveUsers(userData);
        }
    } catch (error) {
        console.error('Error updating last login:', error);
    }
}

/**
 * Get user by username (excluding password)
 */
async function getUser(username) {
    const userData = await loadUsers();
    const user = userData.users.find(u => u.username === username);
    
    if (!user) {
        return null;
    }
    
    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
}

/**
 * Get all users (excluding passwords)
 */
async function getAllUsers() {
    const userData = await loadUsers();
    
    // Return users without passwords
    return userData.users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    });
}

/**
 * Create a new user
 */
async function createUser(username, password, role, createdBy) {
    if (!isValidRole(role)) {
        throw new Error('Invalid role');
    }
    
    const userData = await loadUsers();
    
    // Check if user already exists
    if (userData.users.find(u => u.username === username)) {
        throw new Error('User already exists');
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        username,
        password: hashedPassword,
        role: role.toLowerCase(),
        createdAt: new Date().toISOString(),
        createdBy,
        enabled: true
    };
    
    userData.users.push(newUser);
    await saveUsers(userData);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
}

/**
 * Update user role
 */
async function updateUserRole(username, newRole) {
    if (!isValidRole(newRole)) {
        throw new Error('Invalid role');
    }
    
    const userData = await loadUsers();
    const user = userData.users.find(u => u.username === username);
    
    if (!user) {
        throw new Error('User not found');
    }
    
    user.role = newRole.toLowerCase();
    await saveUsers(userData);
    
    // Return updated user without password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
}

/**
 * Update user password
 */
async function updateUserPassword(username, newPassword) {
    const userData = await loadUsers();
    const user = userData.users.find(u => u.username === username);
    
    if (!user) {
        throw new Error('User not found');
    }
    
    user.password = await bcrypt.hash(newPassword, 10);
    await saveUsers(userData);
    
    return true;
}

/**
 * Enable or disable a user
 */
async function updateUserStatus(username, enabled) {
    const userData = await loadUsers();
    const user = userData.users.find(u => u.username === username);
    
    if (!user) {
        throw new Error('User not found');
    }
    
    user.enabled = enabled;
    await saveUsers(userData);
    
    // Return updated user without password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
}

/**
 * Delete a user
 */
async function deleteUser(username) {
    const userData = await loadUsers();
    const userIndex = userData.users.findIndex(u => u.username === username);
    
    if (userIndex === -1) {
        throw new Error('User not found');
    }
    
    // Prevent deleting the last owner
    const user = userData.users[userIndex];
    if (user.role === ROLES.OWNER) {
        const ownerCount = userData.users.filter(u => u.role === ROLES.OWNER).length;
        if (ownerCount <= 1) {
            throw new Error('Cannot delete the last owner account');
        }
    }
    
    userData.users.splice(userIndex, 1);
    await saveUsers(userData);
    
    return true;
}

module.exports = {
    verifyCredentials,
    requireAuth,
    initializeUsers,
    loadUsers,
    saveUsers,
    updateLastLogin,
    getUser,
    getAllUsers,
    createUser,
    updateUserRole,
    updateUserPassword,
    updateUserStatus,
    deleteUser
};
