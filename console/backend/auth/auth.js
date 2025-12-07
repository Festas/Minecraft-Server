const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

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
        return false;
    }
    
    return await bcrypt.compare(password, user.password);
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
                        password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 10)
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
                    password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 10)
                }
            ]
        };
        await saveUsers(defaultUsers);
        await savePasswordHash(process.env.ADMIN_PASSWORD);
        console.log('Created default admin user. Please keep your password secure!');
    }
}

module.exports = {
    verifyCredentials,
    requireAuth,
    initializeUsers,
    loadUsers,
    saveUsers
};
