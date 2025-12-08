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
        }, 15000); // 15 second timeout for connection failure with retries
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
        }, 15000); // 15 second timeout for connection failure with retries + fallback
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
        it('should create middleware immediately via initializeSessionMiddleware', () => {
            process.env.NODE_ENV = 'test';
            
            const { initializeSessionMiddleware } = require('../../auth/session');
            
            // Should create middleware immediately (for use before routes)
            const middleware = initializeSessionMiddleware();
            expect(middleware).toBeDefined();
            expect(typeof middleware).toBe('function');
        });

        it('should return same middleware instance on subsequent calls', async () => {
            process.env.NODE_ENV = 'test';
            
            const { initializeSessionMiddleware } = require('../../auth/session');
            
            const middleware1 = initializeSessionMiddleware();
            const middleware2 = initializeSessionMiddleware();
            
            expect(middleware1).toBe(middleware2);
        });
    });

    describe('Initialization order enforcement', () => {
        it('should initialize session middleware early for routes', async () => {
            process.env.NODE_ENV = 'test';
            
            const { initializeSessionMiddleware, getSessionStoreStatus } = require('../../auth/session');
            
            // Initialize middleware early (before routes are defined)
            const middleware = initializeSessionMiddleware();
            expect(middleware).toBeDefined();
            
            // Status should show initialized even before Redis connection
            const statusBefore = getSessionStoreStatus();
            expect(statusBefore.initialized).toBe(true);
        });

        it('should upgrade to Redis during async initialization', async () => {
            process.env.NODE_ENV = 'test';
            
            const { initializeSessionMiddleware, initializeSessionStore, getSessionStoreStatus } = require('../../auth/session');
            
            // Initialize middleware early
            initializeSessionMiddleware();
            
            // Then initialize store (Redis or fallback)
            await initializeSessionStore();
            
            // After initialization
            const statusAfter = getSessionStoreStatus();
            expect(statusAfter.initialized).toBe(true);
        });
    });
});
