/**
 * Automation RBAC Tests
 * 
 * Tests for role-based access control on automation endpoints
 */

const { hasPermission, PERMISSIONS, ROLES } = require('../../config/rbac');

describe('Automation RBAC', () => {
    describe('Permission Definitions', () => {
        it('should have all required automation permissions defined', () => {
            expect(PERMISSIONS.AUTOMATION_CREATE).toBe('automation:create');
            expect(PERMISSIONS.AUTOMATION_EDIT).toBe('automation:edit');
            expect(PERMISSIONS.AUTOMATION_DELETE).toBe('automation:delete');
            expect(PERMISSIONS.AUTOMATION_EXECUTE).toBe('automation:execute');
            expect(PERMISSIONS.AUTOMATION_VIEW).toBe('automation:view');
            expect(PERMISSIONS.AUTOMATION_HISTORY).toBe('automation:history');
        });
    });

    describe('Owner Role Permissions', () => {
        it('should have all automation permissions', () => {
            expect(hasPermission(ROLES.OWNER, PERMISSIONS.AUTOMATION_CREATE)).toBe(true);
            expect(hasPermission(ROLES.OWNER, PERMISSIONS.AUTOMATION_EDIT)).toBe(true);
            expect(hasPermission(ROLES.OWNER, PERMISSIONS.AUTOMATION_DELETE)).toBe(true);
            expect(hasPermission(ROLES.OWNER, PERMISSIONS.AUTOMATION_EXECUTE)).toBe(true);
            expect(hasPermission(ROLES.OWNER, PERMISSIONS.AUTOMATION_VIEW)).toBe(true);
            expect(hasPermission(ROLES.OWNER, PERMISSIONS.AUTOMATION_HISTORY)).toBe(true);
        });
    });

    describe('Admin Role Permissions', () => {
        it('should have all automation permissions', () => {
            expect(hasPermission(ROLES.ADMIN, PERMISSIONS.AUTOMATION_CREATE)).toBe(true);
            expect(hasPermission(ROLES.ADMIN, PERMISSIONS.AUTOMATION_EDIT)).toBe(true);
            expect(hasPermission(ROLES.ADMIN, PERMISSIONS.AUTOMATION_DELETE)).toBe(true);
            expect(hasPermission(ROLES.ADMIN, PERMISSIONS.AUTOMATION_EXECUTE)).toBe(true);
            expect(hasPermission(ROLES.ADMIN, PERMISSIONS.AUTOMATION_VIEW)).toBe(true);
            expect(hasPermission(ROLES.ADMIN, PERMISSIONS.AUTOMATION_HISTORY)).toBe(true);
        });
    });

    describe('Moderator Role Permissions', () => {
        it('should have execute, view, and history permissions', () => {
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.AUTOMATION_EXECUTE)).toBe(true);
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.AUTOMATION_VIEW)).toBe(true);
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.AUTOMATION_HISTORY)).toBe(true);
        });

        it('should NOT have create, edit, or delete permissions', () => {
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.AUTOMATION_CREATE)).toBe(false);
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.AUTOMATION_EDIT)).toBe(false);
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.AUTOMATION_DELETE)).toBe(false);
        });
    });

    describe('Viewer Role Permissions', () => {
        it('should have view and history permissions only', () => {
            expect(hasPermission(ROLES.VIEWER, PERMISSIONS.AUTOMATION_VIEW)).toBe(true);
            expect(hasPermission(ROLES.VIEWER, PERMISSIONS.AUTOMATION_HISTORY)).toBe(true);
        });

        it('should NOT have create, edit, delete, or execute permissions', () => {
            expect(hasPermission(ROLES.VIEWER, PERMISSIONS.AUTOMATION_CREATE)).toBe(false);
            expect(hasPermission(ROLES.VIEWER, PERMISSIONS.AUTOMATION_EDIT)).toBe(false);
            expect(hasPermission(ROLES.VIEWER, PERMISSIONS.AUTOMATION_DELETE)).toBe(false);
            expect(hasPermission(ROLES.VIEWER, PERMISSIONS.AUTOMATION_EXECUTE)).toBe(false);
        });
    });

    describe('Permission Matrix', () => {
        const roles = [ROLES.OWNER, ROLES.ADMIN, ROLES.MODERATOR, ROLES.VIEWER];
        const permissions = [
            { perm: PERMISSIONS.AUTOMATION_CREATE, expected: [true, true, false, false] },
            { perm: PERMISSIONS.AUTOMATION_EDIT, expected: [true, true, false, false] },
            { perm: PERMISSIONS.AUTOMATION_DELETE, expected: [true, true, false, false] },
            { perm: PERMISSIONS.AUTOMATION_EXECUTE, expected: [true, true, true, false] },
            { perm: PERMISSIONS.AUTOMATION_VIEW, expected: [true, true, true, true] },
            { perm: PERMISSIONS.AUTOMATION_HISTORY, expected: [true, true, true, true] }
        ];

        permissions.forEach(({ perm, expected }) => {
            it(`should enforce ${perm} permission correctly across all roles`, () => {
                roles.forEach((role, index) => {
                    expect(hasPermission(role, perm)).toBe(expected[index]);
                });
            });
        });
    });

    describe('Edge Cases', () => {
        it('should return false for invalid role', () => {
            expect(hasPermission('invalid-role', PERMISSIONS.AUTOMATION_VIEW)).toBe(false);
        });

        it('should return false for null role', () => {
            expect(hasPermission(null, PERMISSIONS.AUTOMATION_VIEW)).toBe(false);
        });

        it('should return false for undefined role', () => {
            expect(hasPermission(undefined, PERMISSIONS.AUTOMATION_VIEW)).toBe(false);
        });

        it('should return false for invalid permission', () => {
            expect(hasPermission(ROLES.OWNER, 'invalid:permission')).toBe(false);
        });
    });

    describe('Case Sensitivity', () => {
        it('should handle lowercase role names', () => {
            expect(hasPermission('owner', PERMISSIONS.AUTOMATION_VIEW)).toBe(true);
            expect(hasPermission('admin', PERMISSIONS.AUTOMATION_VIEW)).toBe(true);
            expect(hasPermission('moderator', PERMISSIONS.AUTOMATION_VIEW)).toBe(true);
            expect(hasPermission('viewer', PERMISSIONS.AUTOMATION_VIEW)).toBe(true);
        });

        it('should handle uppercase role names', () => {
            expect(hasPermission('OWNER', PERMISSIONS.AUTOMATION_VIEW)).toBe(true);
            expect(hasPermission('ADMIN', PERMISSIONS.AUTOMATION_VIEW)).toBe(true);
            expect(hasPermission('MODERATOR', PERMISSIONS.AUTOMATION_VIEW)).toBe(true);
            expect(hasPermission('VIEWER', PERMISSIONS.AUTOMATION_VIEW)).toBe(true);
        });

        it('should handle mixed case role names', () => {
            expect(hasPermission('Owner', PERMISSIONS.AUTOMATION_VIEW)).toBe(true);
            expect(hasPermission('Admin', PERMISSIONS.AUTOMATION_VIEW)).toBe(true);
            expect(hasPermission('Moderator', PERMISSIONS.AUTOMATION_VIEW)).toBe(true);
            expect(hasPermission('Viewer', PERMISSIONS.AUTOMATION_VIEW)).toBe(true);
        });
    });

    describe('Privilege Hierarchy', () => {
        it('owner should have all permissions that admin has', () => {
            const adminPerms = [
                PERMISSIONS.AUTOMATION_CREATE,
                PERMISSIONS.AUTOMATION_EDIT,
                PERMISSIONS.AUTOMATION_DELETE,
                PERMISSIONS.AUTOMATION_EXECUTE,
                PERMISSIONS.AUTOMATION_VIEW,
                PERMISSIONS.AUTOMATION_HISTORY
            ];

            adminPerms.forEach(perm => {
                const adminHas = hasPermission(ROLES.ADMIN, perm);
                const ownerHas = hasPermission(ROLES.OWNER, perm);
                expect(ownerHas).toBe(adminHas);
            });
        });

        it('admin should have all permissions that moderator has', () => {
            const moderatorPerms = [
                PERMISSIONS.AUTOMATION_EXECUTE,
                PERMISSIONS.AUTOMATION_VIEW,
                PERMISSIONS.AUTOMATION_HISTORY
            ];

            moderatorPerms.forEach(perm => {
                const moderatorHas = hasPermission(ROLES.MODERATOR, perm);
                const adminHas = hasPermission(ROLES.ADMIN, perm);
                if (moderatorHas) {
                    expect(adminHas).toBe(true);
                }
            });
        });

        it('moderator should have all permissions that viewer has', () => {
            const viewerPerms = [
                PERMISSIONS.AUTOMATION_VIEW,
                PERMISSIONS.AUTOMATION_HISTORY
            ];

            viewerPerms.forEach(perm => {
                const viewerHas = hasPermission(ROLES.VIEWER, perm);
                const moderatorHas = hasPermission(ROLES.MODERATOR, perm);
                if (viewerHas) {
                    expect(moderatorHas).toBe(true);
                }
            });
        });
    });

    describe('Security Principles', () => {
        it('should follow principle of least privilege for viewer', () => {
            // Viewer should only have read-only access
            const writePermissions = [
                PERMISSIONS.AUTOMATION_CREATE,
                PERMISSIONS.AUTOMATION_EDIT,
                PERMISSIONS.AUTOMATION_DELETE,
                PERMISSIONS.AUTOMATION_EXECUTE
            ];

            writePermissions.forEach(perm => {
                expect(hasPermission(ROLES.VIEWER, perm)).toBe(false);
            });
        });

        it('should allow moderators to execute but not modify tasks', () => {
            // Moderators can execute tasks but cannot create/edit/delete
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.AUTOMATION_EXECUTE)).toBe(true);
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.AUTOMATION_CREATE)).toBe(false);
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.AUTOMATION_EDIT)).toBe(false);
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.AUTOMATION_DELETE)).toBe(false);
        });

        it('should require admin or higher for task management', () => {
            const managementPermissions = [
                PERMISSIONS.AUTOMATION_CREATE,
                PERMISSIONS.AUTOMATION_EDIT,
                PERMISSIONS.AUTOMATION_DELETE
            ];

            const privilegedRoles = [ROLES.OWNER, ROLES.ADMIN];
            const unprivilegedRoles = [ROLES.MODERATOR, ROLES.VIEWER];

            managementPermissions.forEach(perm => {
                privilegedRoles.forEach(role => {
                    expect(hasPermission(role, perm)).toBe(true);
                });

                unprivilegedRoles.forEach(role => {
                    expect(hasPermission(role, perm)).toBe(false);
                });
            });
        });
    });
});
