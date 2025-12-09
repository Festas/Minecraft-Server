/**
 * Audit Logging Service
 * 
 * Logs security-sensitive events for audit trail and compliance.
 * Events include authentication, user management, configuration changes,
 * and critical server operations.
 */

const fs = require('fs').promises;
const path = require('path');

const AUDIT_LOG_FILE = path.join(__dirname, '../data/audit.log');
const AUDIT_LOG_DIR = path.dirname(AUDIT_LOG_FILE);

/**
 * Audit event types
 */
const AUDIT_EVENTS = {
    // Authentication events
    LOGIN_SUCCESS: 'auth.login.success',
    LOGIN_FAILURE: 'auth.login.failure',
    LOGOUT: 'auth.logout',
    SESSION_EXPIRED: 'auth.session.expired',
    
    // User management events
    USER_CREATED: 'user.created',
    USER_UPDATED: 'user.updated',
    USER_DELETED: 'user.deleted',
    USER_ROLE_CHANGED: 'user.role.changed',
    USER_PASSWORD_CHANGED: 'user.password.changed',
    USER_ENABLED: 'user.enabled',
    USER_DISABLED: 'user.disabled',
    
    // Server control events
    SERVER_START: 'server.start',
    SERVER_STOP: 'server.stop',
    SERVER_RESTART: 'server.restart',
    SERVER_KILL: 'server.kill',
    
    // Configuration events
    CONFIG_CHANGED: 'config.changed',
    SETTINGS_CHANGED: 'settings.changed',
    
    // Backup events
    BACKUP_CREATED: 'backup.created',
    BACKUP_RESTORED: 'backup.restored',
    BACKUP_DELETED: 'backup.deleted',
    
    // Plugin events
    PLUGIN_INSTALLED: 'plugin.installed',
    PLUGIN_UPDATED: 'plugin.updated',
    PLUGIN_DELETED: 'plugin.deleted',
    
    // Access control events
    ACCESS_DENIED: 'access.denied',
    PERMISSION_DENIED: 'permission.denied',
    
    // File operations
    FILE_UPLOADED: 'file.uploaded',
    FILE_DELETED: 'file.deleted',
    FILE_EDITED: 'file.edited',
    
    // Critical commands
    COMMAND_EXECUTED: 'command.executed'
};

/**
 * Initialize audit log directory
 */
async function initializeAuditLog() {
    try {
        await fs.mkdir(AUDIT_LOG_DIR, { recursive: true });
        console.log('[Audit] Audit log directory initialized');
    } catch (error) {
        console.error('[Audit] Failed to initialize audit log directory:', error);
    }
}

/**
 * Write audit log entry
 * @param {string} eventType - Type of event (from AUDIT_EVENTS)
 * @param {string} username - Username performing the action
 * @param {object} details - Additional event details
 * @param {string} ipAddress - IP address of the request
 */
async function logAuditEvent(eventType, username, details = {}, ipAddress = null) {
    const entry = {
        timestamp: new Date().toISOString(),
        eventType,
        username: username || 'system',
        ipAddress,
        details
    };
    
    const logLine = JSON.stringify(entry) + '\n';
    
    try {
        await fs.appendFile(AUDIT_LOG_FILE, logLine);
        console.log('[Audit] Event logged:', {
            eventType,
            username: entry.username,
            timestamp: entry.timestamp
        });
    } catch (error) {
        console.error('[Audit] Failed to write audit log:', error);
    }
}

/**
 * Helper function to get client IP from request
 */
function getClientIp(req) {
    return req.ip || 
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
           req.socket?.remoteAddress ||
           req.connection?.remoteAddress || 
           'unknown';
}

/**
 * Read audit logs with optional filtering
 * @param {object} options - Filter options
 * @param {number} options.limit - Maximum number of entries to return
 * @param {string} options.username - Filter by username
 * @param {string} options.eventType - Filter by event type
 * @param {Date} options.startDate - Filter by start date
 * @param {Date} options.endDate - Filter by end date
 * @returns {Array} Array of audit log entries
 */
async function getAuditLogs(options = {}) {
    try {
        const data = await fs.readFile(AUDIT_LOG_FILE, 'utf8');
        const lines = data.trim().split('\n').filter(line => line);
        
        let logs = lines.map(line => {
            try {
                return JSON.parse(line);
            } catch {
                return null;
            }
        }).filter(entry => entry !== null);
        
        // Apply filters
        if (options.username) {
            logs = logs.filter(entry => entry.username === options.username);
        }
        
        if (options.eventType) {
            logs = logs.filter(entry => entry.eventType === options.eventType);
        }
        
        if (options.startDate) {
            logs = logs.filter(entry => new Date(entry.timestamp) >= options.startDate);
        }
        
        if (options.endDate) {
            logs = logs.filter(entry => new Date(entry.timestamp) <= options.endDate);
        }
        
        // Sort by timestamp descending (newest first)
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Apply limit
        if (options.limit) {
            logs = logs.slice(0, options.limit);
        }
        
        return logs;
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File doesn't exist yet
            return [];
        }
        console.error('[Audit] Error reading audit logs:', error);
        throw error;
    }
}

/**
 * Middleware to automatically log requests
 * @param {string} eventType - Event type to log
 * @param {Function} detailsExtractor - Function to extract details from request
 */
function auditMiddleware(eventType, detailsExtractor = null) {
    return (req, res, next) => {
        // Store original end function
        const originalEnd = res.end;
        
        // Override end to log after response
        res.end = function(...args) {
            // Only log successful requests (2xx status codes)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const details = detailsExtractor ? detailsExtractor(req, res) : {};
                const username = req.session?.username || 'anonymous';
                const ipAddress = getClientIp(req);
                
                logAuditEvent(eventType, username, details, ipAddress).catch(err => {
                    console.error('[Audit] Failed to log event:', err);
                });
            }
            
            // Call original end function
            originalEnd.apply(res, args);
        };
        
        next();
    };
}

module.exports = {
    AUDIT_EVENTS,
    initializeAuditLog,
    logAuditEvent,
    getAuditLogs,
    auditMiddleware,
    getClientIp
};
