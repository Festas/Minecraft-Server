/**
 * Tests for Advanced Player Management RBAC Permissions
 */

const { PERMISSIONS, hasPermission, ROLES } = require('../../config/rbac');

describe('Player Management RBAC Permissions', () => {
    describe('New Player Management Permissions', () => {
        test('PLAYER_WARN permission exists', () => {
            expect(PERMISSIONS.PLAYER_WARN).toBe('player:warn');
        });

        test('PLAYER_MUTE permission exists', () => {
            expect(PERMISSIONS.PLAYER_MUTE).toBe('player:mute');
        });

        test('PLAYER_UNMUTE permission exists', () => {
            expect(PERMISSIONS.PLAYER_UNMUTE).toBe('player:unmute');
        });

        test('PLAYER_TELEPORT permission exists', () => {
            expect(PERMISSIONS.PLAYER_TELEPORT).toBe('player:teleport');
        });

        test('PLAYER_VIEW_DETAILS permission exists', () => {
            expect(PERMISSIONS.PLAYER_VIEW_DETAILS).toBe('player:view:details');
        });

        test('PLAYER_VIEW_INVENTORY permission exists', () => {
            expect(PERMISSIONS.PLAYER_VIEW_INVENTORY).toBe('player:view:inventory');
        });

        test('PLAYER_ACTION_HISTORY permission exists', () => {
            expect(PERMISSIONS.PLAYER_ACTION_HISTORY).toBe('player:action:history');
        });
    });

    describe('Owner Role Permissions', () => {
        test('Owner has all player management permissions', () => {
            expect(hasPermission(ROLES.OWNER, PERMISSIONS.PLAYER_WARN)).toBe(true);
            expect(hasPermission(ROLES.OWNER, PERMISSIONS.PLAYER_MUTE)).toBe(true);
            expect(hasPermission(ROLES.OWNER, PERMISSIONS.PLAYER_UNMUTE)).toBe(true);
            expect(hasPermission(ROLES.OWNER, PERMISSIONS.PLAYER_TELEPORT)).toBe(true);
            expect(hasPermission(ROLES.OWNER, PERMISSIONS.PLAYER_VIEW_DETAILS)).toBe(true);
            expect(hasPermission(ROLES.OWNER, PERMISSIONS.PLAYER_VIEW_INVENTORY)).toBe(true);
            expect(hasPermission(ROLES.OWNER, PERMISSIONS.PLAYER_ACTION_HISTORY)).toBe(true);
        });
    });

    describe('Admin Role Permissions', () => {
        test('Admin has all player management permissions', () => {
            expect(hasPermission(ROLES.ADMIN, PERMISSIONS.PLAYER_WARN)).toBe(true);
            expect(hasPermission(ROLES.ADMIN, PERMISSIONS.PLAYER_MUTE)).toBe(true);
            expect(hasPermission(ROLES.ADMIN, PERMISSIONS.PLAYER_UNMUTE)).toBe(true);
            expect(hasPermission(ROLES.ADMIN, PERMISSIONS.PLAYER_TELEPORT)).toBe(true);
            expect(hasPermission(ROLES.ADMIN, PERMISSIONS.PLAYER_VIEW_DETAILS)).toBe(true);
            expect(hasPermission(ROLES.ADMIN, PERMISSIONS.PLAYER_VIEW_INVENTORY)).toBe(true);
            expect(hasPermission(ROLES.ADMIN, PERMISSIONS.PLAYER_ACTION_HISTORY)).toBe(true);
        });
    });

    describe('Moderator Role Permissions', () => {
        test('Moderator has player action permissions', () => {
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.PLAYER_WARN)).toBe(true);
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.PLAYER_MUTE)).toBe(true);
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.PLAYER_UNMUTE)).toBe(true);
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.PLAYER_TELEPORT)).toBe(true);
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.PLAYER_VIEW_DETAILS)).toBe(true);
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.PLAYER_ACTION_HISTORY)).toBe(true);
        });

        test('Moderator cannot view player inventory', () => {
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.PLAYER_VIEW_INVENTORY)).toBe(false);
        });
    });

    describe('Viewer Role Permissions', () => {
        test('Viewer can view player details', () => {
            expect(hasPermission(ROLES.VIEWER, PERMISSIONS.PLAYER_VIEW_DETAILS)).toBe(true);
        });

        test('Viewer cannot perform player actions', () => {
            expect(hasPermission(ROLES.VIEWER, PERMISSIONS.PLAYER_WARN)).toBe(false);
            expect(hasPermission(ROLES.VIEWER, PERMISSIONS.PLAYER_MUTE)).toBe(false);
            expect(hasPermission(ROLES.VIEWER, PERMISSIONS.PLAYER_UNMUTE)).toBe(false);
            expect(hasPermission(ROLES.VIEWER, PERMISSIONS.PLAYER_TELEPORT)).toBe(false);
            expect(hasPermission(ROLES.VIEWER, PERMISSIONS.PLAYER_VIEW_INVENTORY)).toBe(false);
            expect(hasPermission(ROLES.VIEWER, PERMISSIONS.PLAYER_ACTION_HISTORY)).toBe(false);
        });
    });

    describe('Whitelist Permissions', () => {
        test('Moderator can manage whitelist', () => {
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.PLAYER_WHITELIST)).toBe(true);
        });

        test('Admin can manage whitelist', () => {
            expect(hasPermission(ROLES.ADMIN, PERMISSIONS.PLAYER_WHITELIST)).toBe(true);
        });

        test('Viewer cannot manage whitelist', () => {
            expect(hasPermission(ROLES.VIEWER, PERMISSIONS.PLAYER_WHITELIST)).toBe(false);
        });
    });
});
