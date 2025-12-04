const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');

const USERS_FILE = path.join(__dirname, '../config/users.json');

/**
 * Load users from JSON file
 */
async function loadUsers() {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading users:', error);
        // Return default admin if file doesn't exist
        return {
            users: [
                {
                    username: process.env.ADMIN_USERNAME || 'admin',
                    password: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'change-this-secure-password', 10)
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
    if (req.session && req.session.authenticated) {
        return next();
    }
    
    res.status(401).json({ error: 'Authentication required' });
}

/**
 * Initialize admin user if users.json doesn't exist
 */
async function initializeUsers() {
    try {
        await fs.access(USERS_FILE);
    } catch {
        // File doesn't exist, create it with default admin
        const defaultUsers = {
            users: [
                {
                    username: process.env.ADMIN_USERNAME || 'admin',
                    password: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'change-this-secure-password', 10)
                }
            ]
        };
        await saveUsers(defaultUsers);
        console.log('Created default admin user. Please change the password!');
    }
}

module.exports = {
    verifyCredentials,
    requireAuth,
    initializeUsers,
    loadUsers,
    saveUsers
};
