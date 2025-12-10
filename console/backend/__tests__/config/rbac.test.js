/**
 * RBAC Configuration Tests
 */

const {
    PERMISSIONS,
    hasPermission,
    hasHigherOrEqualRole,
    getRolePermissions,
    isValidRole
} = require('../../config/rbac');

describe('RBAC Configuration', () => {
    describe('isValidRole', () => {
        it('should validate owner role', () => {
            expect(isValidRole('owner')).toBe(true);
            expect(isValidRole('OWNER')).toBe(true);
        });
        
        it('should validate admin role', () => {
            expect(isValidRole('admin')).toBe(true);
            expect(isValidRole('ADMIN')).toBe(true);
        });
        
        it('should validate moderator role', () => {
            expect(isValidRole('moderator')).toBe(true);
        });
        
        it('should validate viewer role', () => {
            expect(isValidRole('viewer')).toBe(true);
        });
        
        it('should reject invalid roles', () => {
            expect(isValidRole('invalid')).toBe(false);
            expect(isValidRole('')).toBe(false);
            expect(isValidRole(null)).toBe(false);
            expect(isValidRole(undefined)).toBe(false);
        });
    });
    
    describe('hasPermission', () => {
        it('should grant owner all permissions', () => {
            expect(hasPermission('owner', PERMISSIONS.SERVER_START)).toBe(true);
            expect(hasPermission('owner', PERMISSIONS.USER_CREATE)).toBe(true);
            expect(hasPermission('owner', PERMISSIONS.AUDIT_VIEW)).toBe(true);
            expect(hasPermission('owner', PERMISSIONS.SERVER_KILL)).toBe(true);
        });
        
        it('should grant admin server control permissions', () => {
            expect(hasPermission('admin', PERMISSIONS.SERVER_START)).toBe(true);
            expect(hasPermission('admin', PERMISSIONS.SERVER_STOP)).toBe(true);
            expect(hasPermission('admin', PERMISSIONS.SERVER_RESTART)).toBe(true);
        });
        
        it('should deny admin owner-only permissions', () => {
            expect(hasPermission('admin', PERMISSIONS.USER_CREATE)).toBe(false);
            expect(hasPermission('admin', PERMISSIONS.AUDIT_VIEW)).toBe(false);
            expect(hasPermission('admin', PERMISSIONS.SERVER_KILL)).toBe(false);
        });
        
        it('should grant moderator player management permissions', () => {
            expect(hasPermission('moderator', PERMISSIONS.PLAYER_KICK)).toBe(true);
            expect(hasPermission('moderator', PERMISSIONS.PLAYER_BAN)).toBe(true);
        });
        
        it('should deny moderator server control permissions', () => {
            expect(hasPermission('moderator', PERMISSIONS.SERVER_START)).toBe(false);
            expect(hasPermission('moderator', PERMISSIONS.SERVER_STOP)).toBe(false);
        });
        
        it('should grant viewer read-only permissions', () => {
            expect(hasPermission('viewer', PERMISSIONS.SERVER_VIEW_STATS)).toBe(true);
            expect(hasPermission('viewer', PERMISSIONS.PLAYER_VIEW)).toBe(true);
        });
        
        it('should deny viewer write permissions', () => {
            expect(hasPermission('viewer', PERMISSIONS.SERVER_START)).toBe(false);
            expect(hasPermission('viewer', PERMISSIONS.COMMAND_EXECUTE)).toBe(false);
        });
        
        it('should return false for invalid inputs', () => {
            expect(hasPermission(null, PERMISSIONS.SERVER_START)).toBe(false);
            expect(hasPermission('owner', null)).toBe(false);
            expect(hasPermission('invalid', PERMISSIONS.SERVER_START)).toBe(false);
        });
    });
    
    describe('hasHigherOrEqualRole', () => {
        it('should confirm owner has higher role than all others', () => {
            expect(hasHigherOrEqualRole('owner', 'owner')).toBe(true);
            expect(hasHigherOrEqualRole('owner', 'admin')).toBe(true);
            expect(hasHigherOrEqualRole('owner', 'moderator')).toBe(true);
            expect(hasHigherOrEqualRole('owner', 'viewer')).toBe(true);
        });
        
        it('should confirm admin has higher role than moderator and viewer', () => {
            expect(hasHigherOrEqualRole('admin', 'admin')).toBe(true);
            expect(hasHigherOrEqualRole('admin', 'moderator')).toBe(true);
            expect(hasHigherOrEqualRole('admin', 'viewer')).toBe(true);
        });
        
        it('should deny admin has higher role than owner', () => {
            expect(hasHigherOrEqualRole('admin', 'owner')).toBe(false);
        });
        
        it('should confirm moderator has higher role than viewer', () => {
            expect(hasHigherOrEqualRole('moderator', 'viewer')).toBe(true);
            expect(hasHigherOrEqualRole('moderator', 'moderator')).toBe(true);
        });
        
        it('should deny moderator has higher role than admin or owner', () => {
            expect(hasHigherOrEqualRole('moderator', 'admin')).toBe(false);
            expect(hasHigherOrEqualRole('moderator', 'owner')).toBe(false);
        });
        
        it('should handle invalid inputs', () => {
            expect(hasHigherOrEqualRole(null, 'admin')).toBe(false);
            expect(hasHigherOrEqualRole('admin', null)).toBe(false);
            expect(hasHigherOrEqualRole('invalid', 'admin')).toBe(false);
        });
    });
    
    describe('getRolePermissions', () => {
        it('should return all permissions for owner', () => {
            const permissions = getRolePermissions('owner');
            expect(permissions).toContain(PERMISSIONS.SERVER_START);
            expect(permissions).toContain(PERMISSIONS.USER_CREATE);
            expect(permissions).toContain(PERMISSIONS.AUDIT_VIEW);
            expect(permissions.length).toBeGreaterThan(0);
        });
        
        it('should return appropriate permissions for each role', () => {
            const adminPerms = getRolePermissions('admin');
            const modPerms = getRolePermissions('moderator');
            const viewerPerms = getRolePermissions('viewer');
            
            expect(adminPerms.length).toBeGreaterThan(modPerms.length);
            expect(modPerms.length).toBeGreaterThan(viewerPerms.length);
        });
        
        it('should return empty array for invalid role', () => {
            expect(getRolePermissions('invalid')).toEqual([]);
            expect(getRolePermissions(null)).toEqual([]);
        });
    });
});
