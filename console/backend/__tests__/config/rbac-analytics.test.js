/**
 * Analytics RBAC Tests
 * 
 * Tests for analytics permission checks across all roles
 */

const { hasPermission, ROLES, PERMISSIONS } = require('../../config/rbac');

describe('Analytics RBAC', () => {
    describe('ANALYTICS_VIEW permission', () => {
        it('should be granted to owner', () => {
            expect(hasPermission(ROLES.OWNER, PERMISSIONS.ANALYTICS_VIEW)).toBe(true);
        });

        it('should be granted to admin', () => {
            expect(hasPermission(ROLES.ADMIN, PERMISSIONS.ANALYTICS_VIEW)).toBe(true);
        });

        it('should be granted to moderator', () => {
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.ANALYTICS_VIEW)).toBe(true);
        });

        it('should be granted to viewer', () => {
            expect(hasPermission(ROLES.VIEWER, PERMISSIONS.ANALYTICS_VIEW)).toBe(true);
        });
    });

    describe('ANALYTICS_EXPORT permission', () => {
        it('should be granted to owner', () => {
            expect(hasPermission(ROLES.OWNER, PERMISSIONS.ANALYTICS_EXPORT)).toBe(true);
        });

        it('should be granted to admin', () => {
            expect(hasPermission(ROLES.ADMIN, PERMISSIONS.ANALYTICS_EXPORT)).toBe(true);
        });

        it('should be denied to moderator', () => {
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.ANALYTICS_EXPORT)).toBe(false);
        });

        it('should be denied to viewer', () => {
            expect(hasPermission(ROLES.VIEWER, PERMISSIONS.ANALYTICS_EXPORT)).toBe(false);
        });
    });

    describe('ANALYTICS_MANAGE permission', () => {
        it('should be granted to owner', () => {
            expect(hasPermission(ROLES.OWNER, PERMISSIONS.ANALYTICS_MANAGE)).toBe(true);
        });

        it('should be granted to admin', () => {
            expect(hasPermission(ROLES.ADMIN, PERMISSIONS.ANALYTICS_MANAGE)).toBe(true);
        });

        it('should be denied to moderator', () => {
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.ANALYTICS_MANAGE)).toBe(false);
        });

        it('should be denied to viewer', () => {
            expect(hasPermission(ROLES.VIEWER, PERMISSIONS.ANALYTICS_MANAGE)).toBe(false);
        });
    });

    describe('Analytics feature access summary', () => {
        it('should allow owner full analytics access', () => {
            expect(hasPermission(ROLES.OWNER, PERMISSIONS.ANALYTICS_VIEW)).toBe(true);
            expect(hasPermission(ROLES.OWNER, PERMISSIONS.ANALYTICS_EXPORT)).toBe(true);
            expect(hasPermission(ROLES.OWNER, PERMISSIONS.ANALYTICS_MANAGE)).toBe(true);
        });

        it('should allow admin full analytics access', () => {
            expect(hasPermission(ROLES.ADMIN, PERMISSIONS.ANALYTICS_VIEW)).toBe(true);
            expect(hasPermission(ROLES.ADMIN, PERMISSIONS.ANALYTICS_EXPORT)).toBe(true);
            expect(hasPermission(ROLES.ADMIN, PERMISSIONS.ANALYTICS_MANAGE)).toBe(true);
        });

        it('should allow moderator view-only analytics access', () => {
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.ANALYTICS_VIEW)).toBe(true);
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.ANALYTICS_EXPORT)).toBe(false);
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.ANALYTICS_MANAGE)).toBe(false);
        });

        it('should allow viewer view-only analytics access', () => {
            expect(hasPermission(ROLES.VIEWER, PERMISSIONS.ANALYTICS_VIEW)).toBe(true);
            expect(hasPermission(ROLES.VIEWER, PERMISSIONS.ANALYTICS_EXPORT)).toBe(false);
            expect(hasPermission(ROLES.VIEWER, PERMISSIONS.ANALYTICS_MANAGE)).toBe(false);
        });
    });
});
