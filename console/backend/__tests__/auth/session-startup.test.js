/**
 * Session Startup Order Tests
 * 
 * These tests verify that:
 * 1. Session store initializes before server starts
 * 2. Redis is required in production (no MemoryStore fallback)
 * 3. MemoryStore fallback is allowed in development only
 * 4. Session middleware is not accessible before initialization
 */

describe('Session Startup Order', () => {
    let originalNodeEnv;

    beforeEach(() => {
        // Save original environment
        originalNodeEnv = process.env.NODE_ENV;
        
        // Clear module cache to ensure fresh load
        jest.resetModules();
        
        // Mock console methods to reduce noise in tests
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'warn').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(async () => {
        // Restore original environment
        process.env.NODE_ENV = originalNodeEnv;
        
        // Clean up any Redis connections
        try {
            jest.resetModules();
            const { shutdownSessionStore } = require('../../auth/session');
            await shutdownSessionStore();
        } catch (err) {
            // Ignore errors during cleanup
        }
        
        // Restore console methods
        jest.restoreAllMocks();
    });

    describe('Production mode (NODE_ENV=production)', () => {
        it('should fail if Redis is unavailable (no MemoryStore fallback)', async () => {
            process.env.NODE_ENV = 'production';
            process.env.REDIS_HOST = 'nonexistent-redis-host';
            process.env.REDIS_PORT = '9999';
            
            const { initializeSessionStore } = require('../../auth/session');
            
            // Should throw error in production when Redis unavailable
            await expect(initializeSessionStore()).rejects.toThrow('Redis connection required in production mode');
        }, 10000); // 10 second timeout for connection failure
    });

    describe('Development mode (NODE_ENV=development)', () => {
        it('should fall back to MemoryStore if Redis unavailable', async () => {
            process.env.NODE_ENV = 'development';
            process.env.REDIS_HOST = 'nonexistent-redis-host';
            process.env.REDIS_PORT = '9999';
            
            const { initializeSessionStore, getSessionStoreStatus } = require('../../auth/session');
            
            // Should not throw - falls back to memory store
            await initializeSessionStore();
            
            const status = getSessionStoreStatus();
            expect(status.usingRedis).toBe(false);
            expect(status.storeType).toBe('memory');
            expect(status.initialized).toBe(true);
        }, 10000); // 10 second timeout for connection failure + fallback
    });

    describe('Test mode (NODE_ENV=test)', () => {
        it('should use MemoryStore without attempting Redis connection', async () => {
            process.env.NODE_ENV = 'test';
            
            const { initializeSessionStore, getSessionStoreStatus } = require('../../auth/session');
            
            await initializeSessionStore();
            
            const status = getSessionStoreStatus();
            expect(status.usingRedis).toBe(false);
            expect(status.storeType).toBe('memory');
            expect(status.initialized).toBe(true);
            
            // Verify console.log was called with test environment message
            expect(console.log).toHaveBeenCalledWith('[Session] Test environment detected - using memory store');
        });
    });

    describe('Session middleware access', () => {
        it('should throw error if getSessionMiddleware called before initialization', () => {
            process.env.NODE_ENV = 'test';
            
            const { getSessionMiddleware } = require('../../auth/session');
            
            // Should throw because initializeSessionStore() has not been called
            expect(() => getSessionMiddleware()).toThrow('Session middleware not initialized');
        });

        it('should return middleware after initialization', async () => {
            process.env.NODE_ENV = 'test';
            
            const { initializeSessionStore, getSessionMiddleware } = require('../../auth/session');
            
            await initializeSessionStore();
            
            const middleware = getSessionMiddleware();
            expect(middleware).toBeDefined();
            expect(typeof middleware).toBe('function');
        });
    });

    describe('Initialization order enforcement', () => {
        it('should initialize session store before creating middleware', async () => {
            process.env.NODE_ENV = 'test';
            
            const { initializeSessionStore, getSessionStoreStatus } = require('../../auth/session');
            
            // Before initialization
            const statusBefore = getSessionStoreStatus();
            expect(statusBefore.initialized).toBe(false);
            
            // Initialize
            await initializeSessionStore();
            
            // After initialization
            const statusAfter = getSessionStoreStatus();
            expect(statusAfter.initialized).toBe(true);
        });

        it('should set initialized flag on successful initialization', async () => {
            process.env.NODE_ENV = 'test';
            
            const { initializeSessionStore, getSessionStoreStatus } = require('../../auth/session');
            
            await initializeSessionStore();
            
            const status = getSessionStoreStatus();
            expect(status.initialized).toBe(true);
        });
    });
});
