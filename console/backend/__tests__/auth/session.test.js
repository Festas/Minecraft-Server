/**
 * Session Cookie Security Configuration Tests
 * 
 * These tests verify that the cookie security utility function
 * correctly determines secure flag based on NODE_ENV and COOKIE_SECURE.
 */

const { shouldUseSecureCookies, getCookieSecurityWarning, logCookieConfiguration } = require('../../utils/cookieSecurity');

describe('Cookie Security Configuration', () => {
    let originalNodeEnv;
    let originalCookieSecure;

    beforeEach(() => {
        // Save original environment
        originalNodeEnv = process.env.NODE_ENV;
        originalCookieSecure = process.env.COOKIE_SECURE;
    });

    afterEach(() => {
        // Restore original environment
        process.env.NODE_ENV = originalNodeEnv;
        process.env.COOKIE_SECURE = originalCookieSecure;
    });

    describe('shouldUseSecureCookies()', () => {
        it('should return false in development environment', () => {
            process.env.NODE_ENV = 'development';
            delete process.env.COOKIE_SECURE;
            
            expect(shouldUseSecureCookies()).toBe(false);
        });

        it('should return false in test environment', () => {
            process.env.NODE_ENV = 'test';
            delete process.env.COOKIE_SECURE;
            
            expect(shouldUseSecureCookies()).toBe(false);
        });

        it('should return true in production environment', () => {
            process.env.NODE_ENV = 'production';
            delete process.env.COOKIE_SECURE;
            
            expect(shouldUseSecureCookies()).toBe(true);
        });

        it('should return false when COOKIE_SECURE=false in production', () => {
            process.env.NODE_ENV = 'production';
            process.env.COOKIE_SECURE = 'false';
            
            expect(shouldUseSecureCookies()).toBe(false);
        });

        it('should return true when COOKIE_SECURE=true in development', () => {
            process.env.NODE_ENV = 'development';
            process.env.COOKIE_SECURE = 'true';
            
            expect(shouldUseSecureCookies()).toBe(true);
        });

        it('should return false when NODE_ENV is not set', () => {
            delete process.env.NODE_ENV;
            delete process.env.COOKIE_SECURE;
            
            expect(shouldUseSecureCookies()).toBe(false);
        });
    });

    describe('getCookieSecurityWarning()', () => {
        it('should return HTTPS warning for secure cookies', () => {
            expect(getCookieSecurityWarning(true)).toBe('HTTPS/SSL required for cookies to work');
        });

        it('should return HTTP allowed warning for non-secure cookies', () => {
            expect(getCookieSecurityWarning(false)).toBe('HTTP allowed - cookies work without SSL');
        });
    });

    describe('logCookieConfiguration()', () => {
        it('should log configuration with correct format', () => {
            process.env.NODE_ENV = 'test';
            delete process.env.COOKIE_SECURE;
            
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            
            logCookieConfiguration('Session', false);
            
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
    });

    describe('Session middleware creation', () => {
        it('should successfully create session middleware with utility', async () => {
            process.env.NODE_ENV = 'test';
            delete process.env.COOKIE_SECURE;
            
            jest.spyOn(console, 'log').mockImplementation();
            
            // Clear module cache to ensure fresh load
            jest.resetModules();
            const { initializeSessionStore, getSessionMiddleware } = require('../../auth/session');
            
            // Initialize session store first
            await initializeSessionStore();
            
            const middleware = getSessionMiddleware();
            expect(middleware).toBeDefined();
            expect(typeof middleware).toBe('function');
            
            jest.restoreAllMocks();
        });
        
        it('should throw error if getSessionMiddleware called before initialization', () => {
            jest.resetModules();
            const { getSessionMiddleware } = require('../../auth/session');
            
            expect(() => getSessionMiddleware()).toThrow('Session middleware not initialized');
        });
    });
});
