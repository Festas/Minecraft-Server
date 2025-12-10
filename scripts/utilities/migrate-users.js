#!/usr/bin/env node

/**
 * Migration Script: Single Admin to Multi-User RBAC
 * 
 * This script helps migrate from the old single-admin user format
 * to the new multi-user RBAC format with roles.
 */

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

const USERS_FILE = path.join(__dirname, '../console/backend/config/users.json');
const BACKUP_FILE = path.join(__dirname, '../console/backend/config/users.json.backup');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function migrateUsers() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Multi-User RBAC Migration Script');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    
    try {
        // Check if users.json exists
        let usersData;
        try {
            const data = await fs.readFile(USERS_FILE, 'utf8');
            usersData = JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('✗ users.json not found');
                console.log('  The file will be auto-generated on first startup.');
                console.log('  No migration needed.');
                rl.close();
                return;
            }
            throw error;
        }
        
        console.log('✓ Found users.json');
        console.log('');
        
        // Check if already migrated
        const alreadyMigrated = usersData.users.every(user => user.role !== undefined);
        
        if (alreadyMigrated) {
            console.log('✓ Users already have roles assigned');
            console.log('  Migration already completed.');
            console.log('');
            console.log('Current users:');
            usersData.users.forEach(user => {
                console.log(`  - ${user.username} (${user.role})`);
            });
            rl.close();
            return;
        }
        
        console.log('Found users without roles:');
        usersData.users.forEach(user => {
            console.log(`  - ${user.username}`);
        });
        console.log('');
        
        const answer = await askQuestion('Proceed with migration? (yes/no): ');
        if (answer.toLowerCase() !== 'yes') {
            console.log('Migration cancelled.');
            rl.close();
            return;
        }
        
        // Create backup
        console.log('');
        console.log('Creating backup...');
        await fs.writeFile(BACKUP_FILE, JSON.stringify(usersData, null, 2));
        console.log(`✓ Backup created: ${BACKUP_FILE}`);
        
        // Migrate users
        console.log('');
        console.log('Migrating users...');
        
        const migratedUsers = {
            users: []
        };
        
        for (const user of usersData.users) {
            console.log('');
            console.log(`User: ${user.username}`);
            console.log('Available roles:');
            console.log('  1. owner     - Full system access (recommended for first user)');
            console.log('  2. admin     - Administrative access for server management');
            console.log('  3. moderator - Moderation access for player management');
            console.log('  4. viewer    - Read-only access');
            
            let role;
            while (!role) {
                const roleInput = await askQuestion('Select role (1-4) or type role name: ');
                
                switch (roleInput.toLowerCase()) {
                    case '1':
                    case 'owner':
                        role = 'owner';
                        break;
                    case '2':
                    case 'admin':
                        role = 'admin';
                        break;
                    case '3':
                    case 'moderator':
                        role = 'moderator';
                        break;
                    case '4':
                    case 'viewer':
                        role = 'viewer';
                        break;
                    default:
                        console.log('Invalid selection. Please try again.');
                }
            }
            
            const migratedUser = {
                username: user.username,
                password: user.password,
                role: role,
                createdAt: new Date().toISOString(),
                createdBy: 'migration-script',
                enabled: true
            };
            
            migratedUsers.users.push(migratedUser);
            console.log(`✓ Migrated ${user.username} as ${role}`);
        }
        
        // Verify at least one owner exists
        const hasOwner = migratedUsers.users.some(u => u.role === 'owner');
        if (!hasOwner) {
            console.log('');
            console.log('⚠ WARNING: No owner account assigned!');
            console.log('  At least one user must be an owner.');
            console.log('');
            
            const firstUser = migratedUsers.users[0];
            const makeOwner = await askQuestion(`Make ${firstUser.username} an owner? (yes/no): `);
            
            if (makeOwner.toLowerCase() === 'yes') {
                firstUser.role = 'owner';
                console.log(`✓ ${firstUser.username} upgraded to owner`);
            } else {
                console.log('Migration cancelled - at least one owner required.');
                rl.close();
                return;
            }
        }
        
        // Save migrated users
        console.log('');
        console.log('Saving migrated users...');
        await fs.writeFile(USERS_FILE, JSON.stringify(migratedUsers, null, 2));
        console.log('✓ Migration completed successfully');
        
        console.log('');
        console.log('Summary:');
        migratedUsers.users.forEach(user => {
            console.log(`  - ${user.username}: ${user.role}`);
        });
        
        console.log('');
        console.log('Next steps:');
        console.log('  1. Review the migrated users.json file');
        console.log('  2. Restart the console application');
        console.log('  3. Login and verify access levels');
        console.log('  4. Read docs/user-management.md for more information');
        console.log('');
        console.log('Backup file: ' + BACKUP_FILE);
        console.log('To restore backup: cp ' + BACKUP_FILE + ' ' + USERS_FILE);
        
    } catch (error) {
        console.error('');
        console.error('✗ Migration failed:', error.message);
        console.error('');
        console.error('Backup file (if created): ' + BACKUP_FILE);
        process.exit(1);
    } finally {
        rl.close();
    }
}

// Run migration
migrateUsers().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
