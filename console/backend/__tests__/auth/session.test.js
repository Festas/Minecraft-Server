/**
 * Session Cookie Security Configuration Tests
 * 
 * These tests verify that the session cookie security settings
 * are correctly configured based on NODE_ENV and COOKIE_SECURE.
 * 
 * Since express-session doesn't expose internal configuration,
 * we test by verifying the console output on module load.
 */

describe('Session Cookie Configuration', () => {
    let originalNodeEnv;
    let originalCookieSecure;

    beforeEach(() => {
        // Save original environment
        originalNodeEnv = process.env.NODE_ENV;
        originalCookieSecure = process.env.COOKIE_SECURE;
        
        // Clear require cache to force re-evaluation
        jest.resetModules();
    });

    afterEach(() => {
        // Restore original environment
        process.env.NODE_ENV = originalNodeEnv;
        process.env.COOKIE_SECURE = originalCookieSecure;
        
        // Clear console mocks
        jest.restoreAllMocks();
    });

    describe('Cookie secure flag based on NODE_ENV', () => {
        it('should log secure: false in development environment', () => {
            process.env.NODE_ENV = 'development';
            delete process.env.COOKIE_SECURE;
            
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            require('../../auth/session');
            
            expect(consoleSpy).toHaveBeenCalledWith(
                '[Session] Cookie configuration:',
                expect.objectContaining({
                    secure: false,
                    nodeEnv: 'development',
                    cookieSecureOverride: 'not set',
                    warning: 'HTTP allowed - cookies work without SSL'
                })
            );
            
            consoleSpy.mockRestore();
        });

        it('should log secure: false in test environment', () => {
            process.env.NODE_ENV = 'test';
            delete process.env.COOKIE_SECURE;
            
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            require('../../auth/session');
            
            expect(consoleSpy).toHaveBeenCalledWith(
                '[Session] Cookie configuration:',
                expect.objectContaining({
                    secure: false,
                    nodeEnv: 'test',
                    cookieSecureOverride: 'not set',
                    warning: 'HTTP allowed - cookies work without SSL'
                })
            );
            
            consoleSpy.mockRestore();
        });

        it('should log secure: true in production environment', () => {
            process.env.NODE_ENV = 'production';
            delete process.env.COOKIE_SECURE;
            
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            require('../../auth/session');
            
            expect(consoleSpy).toHaveBeenCalledWith(
                '[Session] Cookie configuration:',
                expect.objectContaining({
                    secure: true,
                    nodeEnv: 'production',
                    cookieSecureOverride: 'not set',
                    warning: 'HTTPS/SSL required for cookies to work'
                })
            );
            
            consoleSpy.mockRestore();
        });
    });

    describe('Cookie secure flag with COOKIE_SECURE override', () => {
        it('should log secure: false when COOKIE_SECURE=false in production', () => {
            process.env.NODE_ENV = 'production';
            process.env.COOKIE_SECURE = 'false';
            
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            require('../../auth/session');
            
            expect(consoleSpy).toHaveBeenCalledWith(
                '[Session] Cookie configuration:',
                expect.objectContaining({
                    secure: false,
                    nodeEnv: 'production',
                    cookieSecureOverride: 'false',
                    warning: 'HTTP allowed - cookies work without SSL'
                })
            );
            
            consoleSpy.mockRestore();
        });

        it('should log secure: true when COOKIE_SECURE=true in development', () => {
            process.env.NODE_ENV = 'development';
            process.env.COOKIE_SECURE = 'true';
            
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            require('../../auth/session');
            
            expect(consoleSpy).toHaveBeenCalledWith(
                '[Session] Cookie configuration:',
                expect.objectContaining({
                    secure: true,
                    nodeEnv: 'development',
                    cookieSecureOverride: 'true',
                    warning: 'HTTPS/SSL required for cookies to work'
                })
            );
            
            consoleSpy.mockRestore();
        });
    });

    describe('Session middleware creation', () => {
        it('should successfully create session middleware', () => {
            process.env.NODE_ENV = 'test';
            delete process.env.COOKIE_SECURE;
            
            jest.spyOn(console, 'log').mockImplementation();
            
            const { sessionMiddleware, getSessionMiddleware } = require('../../auth/session');
            
            expect(sessionMiddleware).toBeDefined();
            expect(typeof sessionMiddleware).toBe('function');
            expect(getSessionMiddleware).toBeDefined();
            expect(typeof getSessionMiddleware).toBe('function');
            expect(getSessionMiddleware()).toBe(sessionMiddleware);
        });
    });
});
