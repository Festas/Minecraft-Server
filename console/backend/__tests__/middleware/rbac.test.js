/**
 * RBAC Middleware Tests
 */

const { requirePermission, requireRole, requireOwner } = require('../../middleware/rbac');
const { PERMISSIONS, ROLES } = require('../../config/rbac');

describe('RBAC Middleware', () => {
    let req, res, next;
    
    beforeEach(() => {
        req = {
            session: {},
            path: '/test',
            method: 'GET'
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });
    
    describe('requirePermission', () => {
        it('should allow access when user has required permission', () => {
            req.session.authenticated = true;
            req.session.role = 'owner';
            
            const middleware = requirePermission(PERMISSIONS.SERVER_START);
            middleware(req, res, next);
            
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });
        
        it('should deny access when user lacks permission', () => {
            req.session.authenticated = true;
            req.session.role = 'viewer';
            
            const middleware = requirePermission(PERMISSIONS.SERVER_START);
            middleware(req, res, next);
            
            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Access denied'
            }));
        });
        
        it('should deny access when user is not authenticated', () => {
            req.session.authenticated = false;
            
            const middleware = requirePermission(PERMISSIONS.SERVER_START);
            middleware(req, res, next);
            
            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(401);
        });
        
        it('should deny access when session has no role', () => {
            req.session.authenticated = true;
            req.session.role = undefined;
            
            const middleware = requirePermission(PERMISSIONS.SERVER_START);
            middleware(req, res, next);
            
            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(403);
        });
    });
    
    describe('requireRole', () => {
        it('should allow access when user has exact role', () => {
            req.session.authenticated = true;
            req.session.role = 'admin';
            
            const middleware = requireRole(ROLES.ADMIN);
            middleware(req, res, next);
            
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });
        
        it('should allow access when user has higher role', () => {
            req.session.authenticated = true;
            req.session.role = 'owner';
            
            const middleware = requireRole(ROLES.ADMIN);
            middleware(req, res, next);
            
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });
        
        it('should deny access when user has lower role', () => {
            req.session.authenticated = true;
            req.session.role = 'moderator';
            
            const middleware = requireRole(ROLES.ADMIN);
            middleware(req, res, next);
            
            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(403);
        });
    });
    
    describe('requireOwner', () => {
        it('should allow access for owner role', () => {
            req.session.authenticated = true;
            req.session.role = 'owner';
            
            requireOwner(req, res, next);
            
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });
        
        it('should deny access for non-owner roles', () => {
            req.session.authenticated = true;
            req.session.role = 'admin';
            
            requireOwner(req, res, next);
            
            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(403);
        });
    });
});
