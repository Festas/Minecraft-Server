/**
 * Role-Based Access Control (RBAC) Configuration
 * 
 * This file defines the permissions for each user role in the system.
 * Roles are hierarchical: Owner > Admin > Moderator > Viewer
 */

/**
 * Role definitions and their hierarchy
 */
const ROLES = {
    OWNER: 'owner',
    ADMIN: 'admin',
    MODERATOR: 'moderator',
    VIEWER: 'viewer'
};

/**
 * Role hierarchy (lower number = higher privilege)
 */
const ROLE_HIERARCHY = {
    [ROLES.OWNER]: 1,
    [ROLES.ADMIN]: 2,
    [ROLES.MODERATOR]: 3,
    [ROLES.VIEWER]: 4
};

/**
 * Permissions grouped by feature area
 */
const PERMISSIONS = {
    // Server Control
    SERVER_START: 'server:start',
    SERVER_STOP: 'server:stop',
    SERVER_RESTART: 'server:restart',
    SERVER_KILL: 'server:kill',
    
    // Server Management
    SERVER_SAVE: 'server:save',
    SERVER_VIEW_STATS: 'server:view:stats',
    SERVER_VIEW_LOGS: 'server:view:logs',
    
    // Console Commands
    COMMAND_EXECUTE: 'command:execute',
    COMMAND_VIEW: 'command:view',
    
    // Player Management
    PLAYER_KICK: 'player:kick',
    PLAYER_BAN: 'player:ban',
    PLAYER_PARDON: 'player:pardon',
    PLAYER_OP: 'player:op',
    PLAYER_DEOP: 'player:deop',
    PLAYER_VIEW: 'player:view',
    PLAYER_WHITELIST: 'player:whitelist',
    PLAYER_WARN: 'player:warn',
    PLAYER_MUTE: 'player:mute',
    PLAYER_UNMUTE: 'player:unmute',
    PLAYER_TELEPORT: 'player:teleport',
    PLAYER_VIEW_DETAILS: 'player:view:details',
    PLAYER_VIEW_INVENTORY: 'player:view:inventory',
    PLAYER_ACTION_HISTORY: 'player:action:history',
    
    // Backup Management
    BACKUP_CREATE: 'backup:create',
    BACKUP_RESTORE: 'backup:restore',
    BACKUP_DELETE: 'backup:delete',
    BACKUP_DOWNLOAD: 'backup:download',
    BACKUP_VIEW: 'backup:view',
    
    // Plugin Management
    PLUGIN_INSTALL: 'plugin:install',
    PLUGIN_UPDATE: 'plugin:update',
    PLUGIN_DELETE: 'plugin:delete',
    PLUGIN_ENABLE: 'plugin:enable',
    PLUGIN_DISABLE: 'plugin:disable',
    PLUGIN_VIEW: 'plugin:view',
    PLUGIN_RELOAD: 'plugin:reload',
    
    // File Management
    FILE_UPLOAD: 'file:upload',
    FILE_DELETE: 'file:delete',
    FILE_EDIT: 'file:edit',
    FILE_VIEW: 'file:view',
    FILE_DOWNLOAD: 'file:download',
    
    // Configuration
    CONFIG_EDIT: 'config:edit',
    CONFIG_VIEW: 'config:view',
    
    // User Management
    USER_CREATE: 'user:create',
    USER_EDIT: 'user:edit',
    USER_DELETE: 'user:delete',
    USER_VIEW: 'user:view',
    USER_CHANGE_ROLE: 'user:change_role',
    
    // Audit Logs
    AUDIT_VIEW: 'audit:view',
    AUDIT_EXPORT: 'audit:export',
    
    // Map & Dashboard
    MAP_VIEW: 'map:view',
    MAP_PLAYER_TELEPORT: 'map:player:teleport',
    MAP_PLAYER_INFO: 'map:player:info',
    
    // Automation & Scheduler
    AUTOMATION_CREATE: 'automation:create',
    AUTOMATION_EDIT: 'automation:edit',
    AUTOMATION_DELETE: 'automation:delete',
    AUTOMATION_EXECUTE: 'automation:execute',
    AUTOMATION_VIEW: 'automation:view',
    AUTOMATION_HISTORY: 'automation:history',
    
    // Webhooks & Integrations
    WEBHOOK_CREATE: 'webhook:create',
    WEBHOOK_EDIT: 'webhook:edit',
    WEBHOOK_DELETE: 'webhook:delete',
    WEBHOOK_VIEW: 'webhook:view',
    WEBHOOK_TRIGGER: 'webhook:trigger',
    WEBHOOK_LOGS: 'webhook:logs',
    INBOUND_WEBHOOK_CREATE: 'inbound_webhook:create',
    INBOUND_WEBHOOK_EDIT: 'inbound_webhook:edit',
    INBOUND_WEBHOOK_DELETE: 'inbound_webhook:delete',
    INBOUND_WEBHOOK_VIEW: 'inbound_webhook:view',
    
    // Event Logging & Notifications
    LOG_VIEW: 'log:view',
    LOG_EXPORT: 'log:export',
    NOTIFICATION_MANAGE: 'notification:manage',
    
    // Analytics & Insights
    ANALYTICS_VIEW: 'analytics:view',
    ANALYTICS_EXPORT: 'analytics:export',
    ANALYTICS_MANAGE: 'analytics:manage'
};

/**
 * Role-to-Permissions mapping
 * Each role inherits permissions from roles with lower privilege
 */
const ROLE_PERMISSIONS = {
    [ROLES.OWNER]: [
        // All permissions - Owner has full access
        ...Object.values(PERMISSIONS)
    ],
    
    [ROLES.ADMIN]: [
        // Server Control (except kill)
        PERMISSIONS.SERVER_START,
        PERMISSIONS.SERVER_STOP,
        PERMISSIONS.SERVER_RESTART,
        PERMISSIONS.SERVER_SAVE,
        PERMISSIONS.SERVER_VIEW_STATS,
        PERMISSIONS.SERVER_VIEW_LOGS,
        
        // Console Commands
        PERMISSIONS.COMMAND_EXECUTE,
        PERMISSIONS.COMMAND_VIEW,
        
        // Player Management (full)
        PERMISSIONS.PLAYER_KICK,
        PERMISSIONS.PLAYER_BAN,
        PERMISSIONS.PLAYER_PARDON,
        PERMISSIONS.PLAYER_OP,
        PERMISSIONS.PLAYER_DEOP,
        PERMISSIONS.PLAYER_VIEW,
        PERMISSIONS.PLAYER_WHITELIST,
        PERMISSIONS.PLAYER_WARN,
        PERMISSIONS.PLAYER_MUTE,
        PERMISSIONS.PLAYER_UNMUTE,
        PERMISSIONS.PLAYER_TELEPORT,
        PERMISSIONS.PLAYER_VIEW_DETAILS,
        PERMISSIONS.PLAYER_VIEW_INVENTORY,
        PERMISSIONS.PLAYER_ACTION_HISTORY,
        
        // Backup Management
        PERMISSIONS.BACKUP_CREATE,
        PERMISSIONS.BACKUP_RESTORE,
        PERMISSIONS.BACKUP_DELETE,
        PERMISSIONS.BACKUP_DOWNLOAD,
        PERMISSIONS.BACKUP_VIEW,
        
        // Plugin Management (full)
        PERMISSIONS.PLUGIN_INSTALL,
        PERMISSIONS.PLUGIN_UPDATE,
        PERMISSIONS.PLUGIN_DELETE,
        PERMISSIONS.PLUGIN_ENABLE,
        PERMISSIONS.PLUGIN_DISABLE,
        PERMISSIONS.PLUGIN_VIEW,
        PERMISSIONS.PLUGIN_RELOAD,
        
        // File Management
        PERMISSIONS.FILE_UPLOAD,
        PERMISSIONS.FILE_DELETE,
        PERMISSIONS.FILE_EDIT,
        PERMISSIONS.FILE_VIEW,
        PERMISSIONS.FILE_DOWNLOAD,
        
        // Configuration
        PERMISSIONS.CONFIG_EDIT,
        PERMISSIONS.CONFIG_VIEW,
        
        // View users but cannot manage
        PERMISSIONS.USER_VIEW,
        
        // Map & Dashboard
        PERMISSIONS.MAP_VIEW,
        PERMISSIONS.MAP_PLAYER_TELEPORT,
        PERMISSIONS.MAP_PLAYER_INFO,
        
        // Automation & Scheduler
        PERMISSIONS.AUTOMATION_CREATE,
        PERMISSIONS.AUTOMATION_EDIT,
        PERMISSIONS.AUTOMATION_DELETE,
        PERMISSIONS.AUTOMATION_EXECUTE,
        PERMISSIONS.AUTOMATION_VIEW,
        PERMISSIONS.AUTOMATION_HISTORY,
        
        // Webhooks & Integrations
        PERMISSIONS.WEBHOOK_CREATE,
        PERMISSIONS.WEBHOOK_EDIT,
        PERMISSIONS.WEBHOOK_DELETE,
        PERMISSIONS.WEBHOOK_VIEW,
        PERMISSIONS.WEBHOOK_TRIGGER,
        PERMISSIONS.WEBHOOK_LOGS,
        PERMISSIONS.INBOUND_WEBHOOK_CREATE,
        PERMISSIONS.INBOUND_WEBHOOK_EDIT,
        PERMISSIONS.INBOUND_WEBHOOK_DELETE,
        PERMISSIONS.INBOUND_WEBHOOK_VIEW,
        
        // Event Logging & Notifications
        PERMISSIONS.LOG_VIEW,
        PERMISSIONS.LOG_EXPORT,
        PERMISSIONS.NOTIFICATION_MANAGE,
        
        // Analytics & Insights
        PERMISSIONS.ANALYTICS_VIEW,
        PERMISSIONS.ANALYTICS_EXPORT,
        PERMISSIONS.ANALYTICS_MANAGE,
        
        // No audit log access
    ],
    
    [ROLES.MODERATOR]: [
        // Server Control (limited)
        PERMISSIONS.SERVER_SAVE,
        PERMISSIONS.SERVER_VIEW_STATS,
        PERMISSIONS.SERVER_VIEW_LOGS,
        
        // Console Commands (limited - can view, execute basic commands)
        PERMISSIONS.COMMAND_EXECUTE,
        PERMISSIONS.COMMAND_VIEW,
        
        // Player Management (no OP/DEOP, no inventory view)
        PERMISSIONS.PLAYER_KICK,
        PERMISSIONS.PLAYER_BAN,
        PERMISSIONS.PLAYER_PARDON,
        PERMISSIONS.PLAYER_VIEW,
        PERMISSIONS.PLAYER_WHITELIST,
        PERMISSIONS.PLAYER_WARN,
        PERMISSIONS.PLAYER_MUTE,
        PERMISSIONS.PLAYER_UNMUTE,
        PERMISSIONS.PLAYER_TELEPORT,
        PERMISSIONS.PLAYER_VIEW_DETAILS,
        PERMISSIONS.PLAYER_ACTION_HISTORY,
        
        // Backup Management (read-only)
        PERMISSIONS.BACKUP_VIEW,
        PERMISSIONS.BACKUP_DOWNLOAD,
        
        // Plugin Management (read-only + enable/disable)
        PERMISSIONS.PLUGIN_VIEW,
        PERMISSIONS.PLUGIN_ENABLE,
        PERMISSIONS.PLUGIN_DISABLE,
        PERMISSIONS.PLUGIN_RELOAD,
        
        // File Management (read-only)
        PERMISSIONS.FILE_VIEW,
        PERMISSIONS.FILE_DOWNLOAD,
        
        // Configuration (read-only)
        PERMISSIONS.CONFIG_VIEW,
        
        // Map & Dashboard (limited - can view and teleport)
        PERMISSIONS.MAP_VIEW,
        PERMISSIONS.MAP_PLAYER_TELEPORT,
        PERMISSIONS.MAP_PLAYER_INFO,
        
        // Automation & Scheduler (limited - can execute and view)
        PERMISSIONS.AUTOMATION_EXECUTE,
        PERMISSIONS.AUTOMATION_VIEW,
        PERMISSIONS.AUTOMATION_HISTORY,
        
        // Webhooks & Integrations (read-only + trigger)
        PERMISSIONS.WEBHOOK_VIEW,
        PERMISSIONS.WEBHOOK_TRIGGER,
        PERMISSIONS.WEBHOOK_LOGS,
        PERMISSIONS.INBOUND_WEBHOOK_VIEW,
        
        // Event Logging & Notifications
        PERMISSIONS.LOG_VIEW,
        PERMISSIONS.NOTIFICATION_MANAGE,
        
        // Analytics & Insights (view only)
        PERMISSIONS.ANALYTICS_VIEW,
    ],
    
    [ROLES.VIEWER]: [
        // Server Stats (read-only)
        PERMISSIONS.SERVER_VIEW_STATS,
        PERMISSIONS.SERVER_VIEW_LOGS,
        
        // Console (view-only)
        PERMISSIONS.COMMAND_VIEW,
        
        // Player Management (view-only)
        PERMISSIONS.PLAYER_VIEW,
        PERMISSIONS.PLAYER_VIEW_DETAILS,
        
        // Backup Management (view-only)
        PERMISSIONS.BACKUP_VIEW,
        
        // Plugin Management (view-only)
        PERMISSIONS.PLUGIN_VIEW,
        
        // File Management (view-only)
        PERMISSIONS.FILE_VIEW,
        
        // Configuration (view-only)
        PERMISSIONS.CONFIG_VIEW,
        
        // Map & Dashboard (view-only, no teleport)
        PERMISSIONS.MAP_VIEW,
        PERMISSIONS.MAP_PLAYER_INFO,
        
        // Automation & Scheduler (view-only)
        PERMISSIONS.AUTOMATION_VIEW,
        PERMISSIONS.AUTOMATION_HISTORY,
        
        // Webhooks & Integrations (view-only)
        PERMISSIONS.WEBHOOK_VIEW,
        PERMISSIONS.WEBHOOK_LOGS,
        PERMISSIONS.INBOUND_WEBHOOK_VIEW,
        
        // Event Logging & Notifications (view-only)
        PERMISSIONS.LOG_VIEW,
        PERMISSIONS.NOTIFICATION_MANAGE,
        
        // Analytics & Insights (view only)
        PERMISSIONS.ANALYTICS_VIEW,
    ]
};

/**
 * Check if a role has a specific permission
 * @param {string} role - User role
 * @param {string} permission - Permission to check
 * @returns {boolean} True if role has permission
 */
function hasPermission(role, permission) {
    if (!role || !permission) {
        return false;
    }
    
    const normalizedRole = role.toLowerCase();
    const rolePerms = ROLE_PERMISSIONS[normalizedRole];
    
    if (!rolePerms) {
        return false;
    }
    
    return rolePerms.includes(permission);
}

/**
 * Check if role1 has higher or equal privilege than role2
 * @param {string} role1 - First role
 * @param {string} role2 - Second role
 * @returns {boolean} True if role1 >= role2 in hierarchy
 */
function hasHigherOrEqualRole(role1, role2) {
    const level1 = ROLE_HIERARCHY[role1?.toLowerCase()];
    const level2 = ROLE_HIERARCHY[role2?.toLowerCase()];
    
    if (level1 === undefined || level2 === undefined) {
        return false;
    }
    
    return level1 <= level2;
}

/**
 * Get all permissions for a role
 * @param {string} role - User role
 * @returns {string[]} Array of permissions
 */
function getRolePermissions(role) {
    if (!role) {
        return [];
    }
    
    const normalizedRole = role.toLowerCase();
    return ROLE_PERMISSIONS[normalizedRole] || [];
}

/**
 * Check if a role is valid
 * @param {string} role - Role to validate
 * @returns {boolean} True if role is valid
 */
function isValidRole(role) {
    return Object.values(ROLES).includes(role?.toLowerCase());
}

module.exports = {
    ROLES,
    ROLE_HIERARCHY,
    PERMISSIONS,
    ROLE_PERMISSIONS,
    hasPermission,
    hasHigherOrEqualRole,
    getRolePermissions,
    isValidRole
};
