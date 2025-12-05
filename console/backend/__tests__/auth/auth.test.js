const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const auth = require('../../auth/auth');

describe('Auth Module - Password Change Detection', () => {
    const USERS_FILE = path.join(__dirname, '../../config/users.json');
    const PASSWORD_HASH_FILE = path.join(__dirname, '../../config/.password_hash');
    
    // Clean up test files before and after tests
    beforeEach(async () => {
        try {
            await fs.unlink(USERS_FILE);
        } catch (error) {
            // File doesn't exist, ignore
        }
        try {
            await fs.unlink(PASSWORD_HASH_FILE);
        } catch (error) {
            // File doesn't exist, ignore
        }
    });

    afterEach(async () => {
        try {
            await fs.unlink(USERS_FILE);
        } catch (error) {
            // File doesn't exist, ignore
        }
        try {
            await fs.unlink(PASSWORD_HASH_FILE);
        } catch (error) {
            // File doesn't exist, ignore
        }
    });

    describe('initializeUsers', () => {
        it('should create users.json if it does not exist', async () => {
            const originalPassword = process.env.ADMIN_PASSWORD;
            process.env.ADMIN_PASSWORD = 'test-password-123';
            
            await auth.initializeUsers();
            
            const usersData = await fs.readFile(USERS_FILE, 'utf8');
            const users = JSON.parse(usersData);
            
            expect(users).toHaveProperty('users');
            expect(users.users).toHaveLength(1);
            expect(users.users[0]).toHaveProperty('username');
            expect(users.users[0]).toHaveProperty('password');
            
            // Restore original password
            process.env.ADMIN_PASSWORD = originalPassword;
        });

        it('should update users.json when password changes', async () => {
            const originalPassword = process.env.ADMIN_PASSWORD;
            
            // Create initial users.json
            process.env.ADMIN_PASSWORD = 'initial-password';
            await auth.initializeUsers();
            
            const initialData = await fs.readFile(USERS_FILE, 'utf8');
            const initialUsers = JSON.parse(initialData);
            const initialPasswordHash = initialUsers.users[0].password;
            
            // Change password
            process.env.ADMIN_PASSWORD = 'new-password';
            await auth.initializeUsers();
            
            const newData = await fs.readFile(USERS_FILE, 'utf8');
            const newUsers = JSON.parse(newData);
            const newPasswordHash = newUsers.users[0].password;
            
            // Password hash should have changed
            expect(newPasswordHash).not.toBe(initialPasswordHash);
            
            // Verify the new password works
            const isValid = await bcrypt.compare('new-password', newPasswordHash);
            expect(isValid).toBe(true);
            
            // Restore original password
            process.env.ADMIN_PASSWORD = originalPassword;
        });

        it('should not update users.json when password is unchanged', async () => {
            const originalPassword = process.env.ADMIN_PASSWORD;
            
            // Create initial users.json
            process.env.ADMIN_PASSWORD = 'same-password';
            await auth.initializeUsers();
            
            const initialData = await fs.readFile(USERS_FILE, 'utf8');
            const initialUsers = JSON.parse(initialData);
            const initialPasswordHash = initialUsers.users[0].password;
            
            // Re-initialize with same password
            await auth.initializeUsers();
            
            const newData = await fs.readFile(USERS_FILE, 'utf8');
            const newUsers = JSON.parse(newData);
            const newPasswordHash = newUsers.users[0].password;
            
            // Password hash should remain the same
            expect(newPasswordHash).toBe(initialPasswordHash);
            
            // Restore original password
            process.env.ADMIN_PASSWORD = originalPassword;
        });
    });

    describe('verifyCredentials', () => {
        it('should verify correct credentials', async () => {
            const originalPassword = process.env.ADMIN_PASSWORD;
            const originalUsername = process.env.ADMIN_USERNAME;
            
            process.env.ADMIN_PASSWORD = 'test-password-456';
            process.env.ADMIN_USERNAME = 'testuser';
            
            await auth.initializeUsers();
            
            const isValid = await auth.verifyCredentials('testuser', 'test-password-456');
            expect(isValid).toBe(true);
            
            // Restore original values
            process.env.ADMIN_PASSWORD = originalPassword;
            process.env.ADMIN_USERNAME = originalUsername;
        });

        it('should reject incorrect password', async () => {
            const originalPassword = process.env.ADMIN_PASSWORD;
            const originalUsername = process.env.ADMIN_USERNAME;
            
            process.env.ADMIN_PASSWORD = 'correct-password';
            process.env.ADMIN_USERNAME = 'testuser';
            
            await auth.initializeUsers();
            
            const isValid = await auth.verifyCredentials('testuser', 'wrong-password');
            expect(isValid).toBe(false);
            
            // Restore original values
            process.env.ADMIN_PASSWORD = originalPassword;
            process.env.ADMIN_USERNAME = originalUsername;
        });

        it('should reject non-existent username', async () => {
            const originalPassword = process.env.ADMIN_PASSWORD;
            
            process.env.ADMIN_PASSWORD = 'test-password';
            
            await auth.initializeUsers();
            
            const isValid = await auth.verifyCredentials('nonexistent', 'test-password');
            expect(isValid).toBe(false);
            
            // Restore original password
            process.env.ADMIN_PASSWORD = originalPassword;
        });
    });
});
