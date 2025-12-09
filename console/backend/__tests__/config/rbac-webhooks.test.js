/**
 * RBAC Webhook Permissions Tests
 * 
 * Tests for webhook and inbound webhook permissions across different roles
 */

const { ROLES, PERMISSIONS, hasPermission } = require('../../config/rbac');

describe('Webhook RBAC Permissions', () => {
    describe('Owner Role', () => {
        const role = ROLES.OWNER;

        it('should have all webhook permissions', () => {
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_CREATE)).toBe(true);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_EDIT)).toBe(true);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_DELETE)).toBe(true);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_VIEW)).toBe(true);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_TRIGGER)).toBe(true);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_LOGS)).toBe(true);
        });

        it('should have all inbound webhook permissions', () => {
            expect(hasPermission(role, PERMISSIONS.INBOUND_WEBHOOK_CREATE)).toBe(true);
            expect(hasPermission(role, PERMISSIONS.INBOUND_WEBHOOK_EDIT)).toBe(true);
            expect(hasPermission(role, PERMISSIONS.INBOUND_WEBHOOK_DELETE)).toBe(true);
            expect(hasPermission(role, PERMISSIONS.INBOUND_WEBHOOK_VIEW)).toBe(true);
        });
    });

    describe('Admin Role', () => {
        const role = ROLES.ADMIN;

        it('should have all webhook permissions', () => {
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_CREATE)).toBe(true);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_EDIT)).toBe(true);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_DELETE)).toBe(true);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_VIEW)).toBe(true);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_TRIGGER)).toBe(true);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_LOGS)).toBe(true);
        });

        it('should have all inbound webhook permissions', () => {
            expect(hasPermission(role, PERMISSIONS.INBOUND_WEBHOOK_CREATE)).toBe(true);
            expect(hasPermission(role, PERMISSIONS.INBOUND_WEBHOOK_EDIT)).toBe(true);
            expect(hasPermission(role, PERMISSIONS.INBOUND_WEBHOOK_DELETE)).toBe(true);
            expect(hasPermission(role, PERMISSIONS.INBOUND_WEBHOOK_VIEW)).toBe(true);
        });
    });

    describe('Moderator Role', () => {
        const role = ROLES.MODERATOR;

        it('should have limited webhook permissions', () => {
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_CREATE)).toBe(false);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_EDIT)).toBe(false);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_DELETE)).toBe(false);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_VIEW)).toBe(true);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_TRIGGER)).toBe(true);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_LOGS)).toBe(true);
        });

        it('should have view-only inbound webhook permissions', () => {
            expect(hasPermission(role, PERMISSIONS.INBOUND_WEBHOOK_CREATE)).toBe(false);
            expect(hasPermission(role, PERMISSIONS.INBOUND_WEBHOOK_EDIT)).toBe(false);
            expect(hasPermission(role, PERMISSIONS.INBOUND_WEBHOOK_DELETE)).toBe(false);
            expect(hasPermission(role, PERMISSIONS.INBOUND_WEBHOOK_VIEW)).toBe(true);
        });
    });

    describe('Viewer Role', () => {
        const role = ROLES.VIEWER;

        it('should have view-only webhook permissions', () => {
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_CREATE)).toBe(false);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_EDIT)).toBe(false);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_DELETE)).toBe(false);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_VIEW)).toBe(true);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_TRIGGER)).toBe(false);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_LOGS)).toBe(true);
        });

        it('should have view-only inbound webhook permissions', () => {
            expect(hasPermission(role, PERMISSIONS.INBOUND_WEBHOOK_CREATE)).toBe(false);
            expect(hasPermission(role, PERMISSIONS.INBOUND_WEBHOOK_EDIT)).toBe(false);
            expect(hasPermission(role, PERMISSIONS.INBOUND_WEBHOOK_DELETE)).toBe(false);
            expect(hasPermission(role, PERMISSIONS.INBOUND_WEBHOOK_VIEW)).toBe(true);
        });
    });

    describe('Permission Hierarchy', () => {
        it('Owner should have more permissions than Admin', () => {
            // Both have same webhook permissions, but owner has additional system permissions
            expect(hasPermission(ROLES.OWNER, PERMISSIONS.SERVER_KILL)).toBe(true);
            expect(hasPermission(ROLES.ADMIN, PERMISSIONS.SERVER_KILL)).toBe(false);
        });

        it('Admin should have more permissions than Moderator', () => {
            expect(hasPermission(ROLES.ADMIN, PERMISSIONS.WEBHOOK_CREATE)).toBe(true);
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.WEBHOOK_CREATE)).toBe(false);
        });

        it('Moderator should have more permissions than Viewer', () => {
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.WEBHOOK_TRIGGER)).toBe(true);
            expect(hasPermission(ROLES.VIEWER, PERMISSIONS.WEBHOOK_TRIGGER)).toBe(false);
        });
    });

    describe('Webhook Creation Workflow', () => {
        it('Admin can create and manage webhooks', () => {
            const role = ROLES.ADMIN;
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_CREATE)).toBe(true);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_EDIT)).toBe(true);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_DELETE)).toBe(true);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_TRIGGER)).toBe(true);
        });

        it('Moderator can only view and trigger existing webhooks', () => {
            const role = ROLES.MODERATOR;
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_CREATE)).toBe(false);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_EDIT)).toBe(false);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_DELETE)).toBe(false);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_VIEW)).toBe(true);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_TRIGGER)).toBe(true);
        });

        it('Viewer cannot modify or trigger webhooks', () => {
            const role = ROLES.VIEWER;
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_CREATE)).toBe(false);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_EDIT)).toBe(false);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_DELETE)).toBe(false);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_TRIGGER)).toBe(false);
            expect(hasPermission(role, PERMISSIONS.WEBHOOK_VIEW)).toBe(true);
        });
    });

    describe('Inbound Webhook Workflow', () => {
        it('Admin can create and manage inbound webhooks', () => {
            const role = ROLES.ADMIN;
            expect(hasPermission(role, PERMISSIONS.INBOUND_WEBHOOK_CREATE)).toBe(true);
            expect(hasPermission(role, PERMISSIONS.INBOUND_WEBHOOK_EDIT)).toBe(true);
            expect(hasPermission(role, PERMISSIONS.INBOUND_WEBHOOK_DELETE)).toBe(true);
            expect(hasPermission(role, PERMISSIONS.INBOUND_WEBHOOK_VIEW)).toBe(true);
        });

        it('Moderator can only view inbound webhooks', () => {
            const role = ROLES.MODERATOR;
            expect(hasPermission(role, PERMISSIONS.INBOUND_WEBHOOK_CREATE)).toBe(false);
            expect(hasPermission(role, PERMISSIONS.INBOUND_WEBHOOK_EDIT)).toBe(false);
            expect(hasPermission(role, PERMISSIONS.INBOUND_WEBHOOK_DELETE)).toBe(false);
            expect(hasPermission(role, PERMISSIONS.INBOUND_WEBHOOK_VIEW)).toBe(true);
        });

        it('Viewer has minimal inbound webhook access', () => {
            const role = ROLES.VIEWER;
            expect(hasPermission(role, PERMISSIONS.INBOUND_WEBHOOK_CREATE)).toBe(false);
            expect(hasPermission(role, PERMISSIONS.INBOUND_WEBHOOK_EDIT)).toBe(false);
            expect(hasPermission(role, PERMISSIONS.INBOUND_WEBHOOK_DELETE)).toBe(false);
            expect(hasPermission(role, PERMISSIONS.INBOUND_WEBHOOK_VIEW)).toBe(true);
        });
    });

    describe('Webhook Logs Access', () => {
        it('All roles can view webhook logs', () => {
            expect(hasPermission(ROLES.OWNER, PERMISSIONS.WEBHOOK_LOGS)).toBe(true);
            expect(hasPermission(ROLES.ADMIN, PERMISSIONS.WEBHOOK_LOGS)).toBe(true);
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.WEBHOOK_LOGS)).toBe(true);
            expect(hasPermission(ROLES.VIEWER, PERMISSIONS.WEBHOOK_LOGS)).toBe(true);
        });
    });

    describe('Integration with Other Features', () => {
        it('Webhook permissions are separate from automation permissions', () => {
            // Viewer has automation view permission
            expect(hasPermission(ROLES.VIEWER, PERMISSIONS.AUTOMATION_VIEW)).toBe(true);
            
            // But cannot create automations or webhooks
            expect(hasPermission(ROLES.VIEWER, PERMISSIONS.AUTOMATION_CREATE)).toBe(false);
            expect(hasPermission(ROLES.VIEWER, PERMISSIONS.WEBHOOK_CREATE)).toBe(false);
        });

        it('Moderator can execute automations and trigger webhooks', () => {
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.AUTOMATION_EXECUTE)).toBe(true);
            expect(hasPermission(ROLES.MODERATOR, PERMISSIONS.WEBHOOK_TRIGGER)).toBe(true);
        });
    });
});
