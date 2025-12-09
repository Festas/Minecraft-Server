/**
 * RBAC Map Permissions Tests
 * 
 * Tests for the new map-related permissions added to the RBAC system
 */

const { PERMISSIONS, hasPermission, ROLES } = require('../../config/rbac');

describe('RBAC - Map Permissions', () => {
    describe('MAP_VIEW permission', () => {
        test('should exist as a permission', () => {
            expect(PERMISSIONS.MAP_VIEW).toBe('map:view');
        });

        test('viewer role should have MAP_VIEW permission', () => {
            expect(hasPermission(ROLES.VIEWER, PERMISSIONS.MAP_VIEW)).toBe(true);
        });

        test('moderator role should have MAP_VIEW permission', () => {
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.MAP_VIEW)).toBe(true);
        });

        test('admin role should have MAP_VIEW permission', () => {
            expect(hasPermission(ROLES.ADMIN, PERMISSIONS.MAP_VIEW)).toBe(true);
        });

        test('owner role should have MAP_VIEW permission', () => {
            expect(hasPermission(ROLES.OWNER, PERMISSIONS.MAP_VIEW)).toBe(true);
        });
    });

    describe('MAP_PLAYER_TELEPORT permission', () => {
        test('should exist as a permission', () => {
            expect(PERMISSIONS.MAP_PLAYER_TELEPORT).toBe('map:player:teleport');
        });

        test('viewer role should NOT have MAP_PLAYER_TELEPORT permission', () => {
            expect(hasPermission(ROLES.VIEWER, PERMISSIONS.MAP_PLAYER_TELEPORT)).toBe(false);
        });

        test('moderator role should have MAP_PLAYER_TELEPORT permission', () => {
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.MAP_PLAYER_TELEPORT)).toBe(true);
        });

        test('admin role should have MAP_PLAYER_TELEPORT permission', () => {
            expect(hasPermission(ROLES.ADMIN, PERMISSIONS.MAP_PLAYER_TELEPORT)).toBe(true);
        });

        test('owner role should have MAP_PLAYER_TELEPORT permission', () => {
            expect(hasPermission(ROLES.OWNER, PERMISSIONS.MAP_PLAYER_TELEPORT)).toBe(true);
        });
    });

    describe('MAP_PLAYER_INFO permission', () => {
        test('should exist as a permission', () => {
            expect(PERMISSIONS.MAP_PLAYER_INFO).toBe('map:player:info');
        });

        test('viewer role should have MAP_PLAYER_INFO permission', () => {
            expect(hasPermission(ROLES.VIEWER, PERMISSIONS.MAP_PLAYER_INFO)).toBe(true);
        });

        test('moderator role should have MAP_PLAYER_INFO permission', () => {
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.MAP_PLAYER_INFO)).toBe(true);
        });

        test('admin role should have MAP_PLAYER_INFO permission', () => {
            expect(hasPermission(ROLES.ADMIN, PERMISSIONS.MAP_PLAYER_INFO)).toBe(true);
        });

        test('owner role should have MAP_PLAYER_INFO permission', () => {
            expect(hasPermission(ROLES.OWNER, PERMISSIONS.MAP_PLAYER_INFO)).toBe(true);
        });
    });
});
