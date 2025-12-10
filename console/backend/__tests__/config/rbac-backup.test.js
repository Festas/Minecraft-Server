/**
 * RBAC Backup Tests
 * 
 * Tests for backup/restore/migration RBAC permissions
 */

const { PERMISSIONS, ROLE_PERMISSIONS, ROLES } = require('../../config/rbac');

describe('RBAC - Backup Permissions', () => {
    describe('Permission definitions', () => {
        it('should define all backup permissions', () => {
            expect(PERMISSIONS.BACKUP_CREATE).toBe('backup:create');
            expect(PERMISSIONS.BACKUP_VIEW).toBe('backup:view');
            expect(PERMISSIONS.BACKUP_RESTORE).toBe('backup:restore');
            expect(PERMISSIONS.BACKUP_DELETE).toBe('backup:delete');
            expect(PERMISSIONS.BACKUP_DOWNLOAD).toBe('backup:download');
            expect(PERMISSIONS.BACKUP_SCHEDULE).toBe('backup:schedule');
            expect(PERMISSIONS.BACKUP_MIGRATE_EXPORT).toBe('backup:migrate:export');
            expect(PERMISSIONS.BACKUP_MIGRATE_IMPORT).toBe('backup:migrate:import');
        });
    });

    describe('Owner role', () => {
        it('should have all backup permissions', () => {
            const ownerPermissions = ROLE_PERMISSIONS[ROLES.OWNER];
            
            expect(ownerPermissions).toContain(PERMISSIONS.BACKUP_CREATE);
            expect(ownerPermissions).toContain(PERMISSIONS.BACKUP_VIEW);
            expect(ownerPermissions).toContain(PERMISSIONS.BACKUP_RESTORE);
            expect(ownerPermissions).toContain(PERMISSIONS.BACKUP_DELETE);
            expect(ownerPermissions).toContain(PERMISSIONS.BACKUP_DOWNLOAD);
            expect(ownerPermissions).toContain(PERMISSIONS.BACKUP_SCHEDULE);
            expect(ownerPermissions).toContain(PERMISSIONS.BACKUP_MIGRATE_EXPORT);
            expect(ownerPermissions).toContain(PERMISSIONS.BACKUP_MIGRATE_IMPORT);
        });
    });

    describe('Admin role', () => {
        it('should have all backup permissions', () => {
            const adminPermissions = ROLE_PERMISSIONS[ROLES.ADMIN];
            
            expect(adminPermissions).toContain(PERMISSIONS.BACKUP_CREATE);
            expect(adminPermissions).toContain(PERMISSIONS.BACKUP_VIEW);
            expect(adminPermissions).toContain(PERMISSIONS.BACKUP_RESTORE);
            expect(adminPermissions).toContain(PERMISSIONS.BACKUP_DELETE);
            expect(adminPermissions).toContain(PERMISSIONS.BACKUP_DOWNLOAD);
            expect(adminPermissions).toContain(PERMISSIONS.BACKUP_SCHEDULE);
            expect(adminPermissions).toContain(PERMISSIONS.BACKUP_MIGRATE_EXPORT);
            expect(adminPermissions).toContain(PERMISSIONS.BACKUP_MIGRATE_IMPORT);
        });
    });

    describe('Moderator role', () => {
        it('should have limited backup permissions (view and download only)', () => {
            const moderatorPermissions = ROLE_PERMISSIONS[ROLES.MODERATOR];
            
            // Should have view and download
            expect(moderatorPermissions).toContain(PERMISSIONS.BACKUP_VIEW);
            expect(moderatorPermissions).toContain(PERMISSIONS.BACKUP_DOWNLOAD);
            
            // Should NOT have create, restore, delete, or migration
            expect(moderatorPermissions).not.toContain(PERMISSIONS.BACKUP_CREATE);
            expect(moderatorPermissions).not.toContain(PERMISSIONS.BACKUP_RESTORE);
            expect(moderatorPermissions).not.toContain(PERMISSIONS.BACKUP_DELETE);
            expect(moderatorPermissions).not.toContain(PERMISSIONS.BACKUP_SCHEDULE);
            expect(moderatorPermissions).not.toContain(PERMISSIONS.BACKUP_MIGRATE_EXPORT);
            expect(moderatorPermissions).not.toContain(PERMISSIONS.BACKUP_MIGRATE_IMPORT);
        });
    });

    describe('Viewer role', () => {
        it('should have view-only backup permissions', () => {
            const viewerPermissions = ROLE_PERMISSIONS[ROLES.VIEWER];
            
            // Should only have view
            expect(viewerPermissions).toContain(PERMISSIONS.BACKUP_VIEW);
            
            // Should NOT have any other backup permissions
            expect(viewerPermissions).not.toContain(PERMISSIONS.BACKUP_CREATE);
            expect(viewerPermissions).not.toContain(PERMISSIONS.BACKUP_RESTORE);
            expect(viewerPermissions).not.toContain(PERMISSIONS.BACKUP_DELETE);
            expect(viewerPermissions).not.toContain(PERMISSIONS.BACKUP_DOWNLOAD);
            expect(viewerPermissions).not.toContain(PERMISSIONS.BACKUP_SCHEDULE);
            expect(viewerPermissions).not.toContain(PERMISSIONS.BACKUP_MIGRATE_EXPORT);
            expect(viewerPermissions).not.toContain(PERMISSIONS.BACKUP_MIGRATE_IMPORT);
        });
    });

    describe('Permission hierarchy', () => {
        it('should grant more permissions to higher roles', () => {
            const ownerPerms = ROLE_PERMISSIONS[ROLES.OWNER];
            const adminPerms = ROLE_PERMISSIONS[ROLES.ADMIN];
            const moderatorPerms = ROLE_PERMISSIONS[ROLES.MODERATOR];
            const viewerPerms = ROLE_PERMISSIONS[ROLES.VIEWER];

            // Count backup permissions for each role
            const backupPermissions = Object.values(PERMISSIONS).filter(p => p.startsWith('backup:'));
            
            const ownerBackupCount = ownerPerms.filter(p => p.startsWith('backup:')).length;
            const adminBackupCount = adminPerms.filter(p => p.startsWith('backup:')).length;
            const moderatorBackupCount = moderatorPerms.filter(p => p.startsWith('backup:')).length;
            const viewerBackupCount = viewerPerms.filter(p => p.startsWith('backup:')).length;

            // Owner and Admin should have equal backup permissions (all)
            expect(ownerBackupCount).toBe(adminBackupCount);
            expect(ownerBackupCount).toBe(backupPermissions.length);

            // Moderator should have fewer than admin
            expect(moderatorBackupCount).toBeLessThan(adminBackupCount);
            expect(moderatorBackupCount).toBe(2); // view and download

            // Viewer should have fewest
            expect(viewerBackupCount).toBeLessThan(moderatorBackupCount);
            expect(viewerBackupCount).toBe(1); // view only
        });
    });

    describe('Critical permissions', () => {
        it('should restrict restore permission to admin and above', () => {
            const ownerPerms = ROLE_PERMISSIONS[ROLES.OWNER];
            const adminPerms = ROLE_PERMISSIONS[ROLES.ADMIN];
            const moderatorPerms = ROLE_PERMISSIONS[ROLES.MODERATOR];
            const viewerPerms = ROLE_PERMISSIONS[ROLES.VIEWER];

            expect(ownerPerms).toContain(PERMISSIONS.BACKUP_RESTORE);
            expect(adminPerms).toContain(PERMISSIONS.BACKUP_RESTORE);
            expect(moderatorPerms).not.toContain(PERMISSIONS.BACKUP_RESTORE);
            expect(viewerPerms).not.toContain(PERMISSIONS.BACKUP_RESTORE);
        });

        it('should restrict delete permission to admin and above', () => {
            const ownerPerms = ROLE_PERMISSIONS[ROLES.OWNER];
            const adminPerms = ROLE_PERMISSIONS[ROLES.ADMIN];
            const moderatorPerms = ROLE_PERMISSIONS[ROLES.MODERATOR];
            const viewerPerms = ROLE_PERMISSIONS[ROLES.VIEWER];

            expect(ownerPerms).toContain(PERMISSIONS.BACKUP_DELETE);
            expect(adminPerms).toContain(PERMISSIONS.BACKUP_DELETE);
            expect(moderatorPerms).not.toContain(PERMISSIONS.BACKUP_DELETE);
            expect(viewerPerms).not.toContain(PERMISSIONS.BACKUP_DELETE);
        });

        it('should restrict migration permissions to admin and above', () => {
            const ownerPerms = ROLE_PERMISSIONS[ROLES.OWNER];
            const adminPerms = ROLE_PERMISSIONS[ROLES.ADMIN];
            const moderatorPerms = ROLE_PERMISSIONS[ROLES.MODERATOR];
            const viewerPerms = ROLE_PERMISSIONS[ROLES.VIEWER];

            // Export
            expect(ownerPerms).toContain(PERMISSIONS.BACKUP_MIGRATE_EXPORT);
            expect(adminPerms).toContain(PERMISSIONS.BACKUP_MIGRATE_EXPORT);
            expect(moderatorPerms).not.toContain(PERMISSIONS.BACKUP_MIGRATE_EXPORT);
            expect(viewerPerms).not.toContain(PERMISSIONS.BACKUP_MIGRATE_EXPORT);

            // Import
            expect(ownerPerms).toContain(PERMISSIONS.BACKUP_MIGRATE_IMPORT);
            expect(adminPerms).toContain(PERMISSIONS.BACKUP_MIGRATE_IMPORT);
            expect(moderatorPerms).not.toContain(PERMISSIONS.BACKUP_MIGRATE_IMPORT);
            expect(viewerPerms).not.toContain(PERMISSIONS.BACKUP_MIGRATE_IMPORT);
        });
    });

    describe('Permission format', () => {
        it('should follow naming convention', () => {
            const backupPermissions = Object.entries(PERMISSIONS)
                .filter(([key]) => key.startsWith('BACKUP_'));

            backupPermissions.forEach(([key, value]) => {
                // Should be snake_case in key
                expect(key).toMatch(/^BACKUP_[A-Z_]+$/);
                
                // Should be colon-separated lowercase in value
                expect(value).toMatch(/^backup:[a-z:]+$/);
            });
        });

        it('should have unique permission values', () => {
            const backupPermissionValues = Object.values(PERMISSIONS)
                .filter(p => p.startsWith('backup:'));
            
            const uniqueValues = new Set(backupPermissionValues);
            expect(uniqueValues.size).toBe(backupPermissionValues.length);
        });
    });
});
