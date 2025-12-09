/**
 * RBAC (Role-Based Access Control) Middleware
 * 
 * This middleware enforces role-based permissions on API routes.
 * It should be applied AFTER authentication middleware (requireAuth).
 */

const { hasPermission, hasHigherOrEqualRole, ROLES } = require('../config/rbac');

/**
 * Middleware to require a specific permission
 * @param {string} permission - Required permission
 * @returns {Function} Express middleware
 */
function requirePermission(permission) {
    return (req, res, next) => {
        // Ensure user is authenticated
        if (!req.session || !req.session.authenticated) {
            console.log('[RBAC] Permission check failed: Not authenticated');
            return res.status(401).json({ 
                error: 'Authentication required' 
            });
        }
        
        const userRole = req.session.role;
        
        if (!userRole) {
            console.log('[RBAC] Permission check failed: No role in session');
            return res.status(403).json({ 
                error: 'Access denied',
                message: 'User role not set'
            });
        }
        
        // Check if user has required permission
        if (!hasPermission(userRole, permission)) {
            console.log('[RBAC] Permission denied:', {
                username: req.session.username,
                role: userRole,
                permission,
                path: req.path,
                method: req.method
            });
            
            return res.status(403).json({ 
                error: 'Access denied',
                message: 'You do not have permission to perform this action'
            });
        }
        
        console.log('[RBAC] Permission granted:', {
            username: req.session.username,
            role: userRole,
            permission,
            path: req.path
        });
        
        next();
    };
}

/**
 * Middleware to require a minimum role level
 * @param {string} minimumRole - Minimum required role
 * @returns {Function} Express middleware
 */
function requireRole(minimumRole) {
    return (req, res, next) => {
        // Ensure user is authenticated
        if (!req.session || !req.session.authenticated) {
            console.log('[RBAC] Role check failed: Not authenticated');
            return res.status(401).json({ 
                error: 'Authentication required' 
            });
        }
        
        const userRole = req.session.role;
        
        if (!userRole) {
            console.log('[RBAC] Role check failed: No role in session');
            return res.status(403).json({ 
                error: 'Access denied',
                message: 'User role not set'
            });
        }
        
        // Check if user has sufficient role level
        if (!hasHigherOrEqualRole(userRole, minimumRole)) {
            console.log('[RBAC] Role check failed:', {
                username: req.session.username,
                userRole,
                requiredRole: minimumRole,
                path: req.path,
                method: req.method
            });
            
            return res.status(403).json({ 
                error: 'Access denied',
                message: 'Insufficient privileges'
            });
        }
        
        console.log('[RBAC] Role check passed:', {
            username: req.session.username,
            role: userRole,
            requiredRole: minimumRole,
            path: req.path
        });
        
        next();
    };
}

/**
 * Middleware to require owner role
 * Convenience wrapper for requireRole(ROLES.OWNER)
 */
function requireOwner(req, res, next) {
    return requireRole(ROLES.OWNER)(req, res, next);
}

/**
 * Middleware to require admin role or higher
 * Convenience wrapper for requireRole(ROLES.ADMIN)
 */
function requireAdmin(req, res, next) {
    return requireRole(ROLES.ADMIN)(req, res, next);
}

/**
 * Middleware to require moderator role or higher
 * Convenience wrapper for requireRole(ROLES.MODERATOR)
 */
function requireModerator(req, res, next) {
    return requireRole(ROLES.MODERATOR)(req, res, next);
}

module.exports = {
    requirePermission,
    requireRole,
    requireOwner,
    requireAdmin,
    requireModerator
};
