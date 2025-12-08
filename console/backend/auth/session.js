const session = require('express-session');
const { createClient } = require('redis');
const { RedisStore } = require('connect-redis');
const { shouldUseSecureCookies, logCookieConfiguration } = require('../utils/cookieSecurity');

const useSecureCookies = shouldUseSecureCookies();

// Log cookie security configuration on startup
logCookieConfiguration('Session', useSecureCookies);

// Redis configuration from environment variables
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const REDIS_URL = process.env.REDIS_URL || undefined;

// Session configuration
let redisClient = null;
let sessionStore = null;
let useRedisStore = false;
let sessionMiddleware = null;
let sessionInitialized = false;

// Validate SESSION_SECRET is set from environment (not using default)
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET || SESSION_SECRET === 'your-secure-random-session-secret') {
    console.error('');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('✗ FATAL: SESSION_SECRET environment variable must be set');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('SESSION_SECRET is required for secure session management.');
    console.error('Using the default or not setting it is a security risk.');
    console.error('');
    console.error('Solution:');
    console.error('  1. Generate a secure random secret:');
    console.error('     openssl rand -hex 32');
    console.error('  2. Add it to your .env file:');
    console.error('     SESSION_SECRET=<your-generated-secret>');
    console.error('  3. For production deployments, ensure SESSION_SECRET is set');
    console.error('     in GitHub secrets or deployment configuration');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('');
    if (process.env.NODE_ENV !== 'test') {
        process.exit(1);
    }
}

// Function to create session middleware with given store
function createSessionMiddleware(store) {
    return session({
        secret: SESSION_SECRET || 'test-session-secret', // Use validated SESSION_SECRET
        resave: false,
        saveUninitialized: false,
        store: store || undefined, // Use provided store or undefined for memory store
        proxy: true, // Trust the reverse proxy
        name: 'console.sid', // Custom session cookie name to avoid conflicts
        cookie: {
            httpOnly: true,
            secure: useSecureCookies, // HTTPS only in production, HTTP allowed in dev/test/CI
            sameSite: 'lax', // More compatible with redirects and API calls
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            path: '/', // Ensure cookie is available for all paths
            // Don't set domain - let browser default to current domain
        }
    });
}

// Initialize session middleware immediately (synchronously) for early application
// This ensures session middleware is available when routes are defined
// Session store (Redis/Memory) will be initialized asynchronously during startup
function initializeSessionMiddleware() {
    if (sessionMiddleware) {
        console.log('[Session] Session middleware already initialized');
        return sessionMiddleware;
    }
    
    // Create session middleware with MemoryStore (default) for immediate use
    // This will be updated with Redis store during async startup if available
    sessionMiddleware = createSessionMiddleware(null);
    sessionInitialized = true;
    
    console.log('[Session] Session middleware initialized (temporary memory store)');
    console.log('[Session] Redis store will be configured during async startup');
    
    return sessionMiddleware;
}

// Initialize Redis client and session store
async function initializeRedisClient() {
    // Skip Redis in test environment - use memory store for tests
    if (process.env.NODE_ENV === 'test') {
        console.log('[Session] Test environment detected - using memory store');
        useRedisStore = false;
        if (!sessionMiddleware) {
            sessionMiddleware = createSessionMiddleware(null);
            sessionInitialized = true;
        }
        return;
    }

    // In production, Redis is REQUIRED - no fallback to memory store
    const isProduction = process.env.NODE_ENV === 'production';
    
    try {
        console.log('[Session] Initializing Redis connection...');
        console.log('[Session] Redis configuration:', {
            host: REDIS_URL ? 'from REDIS_URL' : REDIS_HOST,
            port: REDIS_URL ? 'from REDIS_URL' : REDIS_PORT,
            hasPassword: !!REDIS_PASSWORD,
            useRedisStore: 'attempting...'
        });
        
        // Create Redis client with configuration
        const clientConfig = REDIS_URL 
            ? { url: REDIS_URL }
            : {
                socket: {
                    host: REDIS_HOST,
                    port: REDIS_PORT,
                    connectTimeout: 5000, // 5 second connection timeout
                    reconnectStrategy: (retries) => {
                        // Reconnect after 1 second, up to 10 retries
                        if (retries > 10) {
                            console.error('[Session] Redis: Max reconnection attempts reached');
                            return new Error('Max reconnection attempts reached');
                        }
                        return 1000;
                    }
                },
                password: REDIS_PASSWORD
            };

        redisClient = createClient(clientConfig);

        // Handle Redis connection errors
        redisClient.on('error', (err) => {
            console.error('[Session] Redis client error:', err.message);
        });

        redisClient.on('connect', () => {
            console.log('[Session] Redis client connected');
        });

        redisClient.on('ready', () => {
            console.log('[Session] Redis client ready');
        });

        redisClient.on('reconnecting', () => {
            console.log('[Session] Redis client reconnecting...');
        });

        // Connect to Redis with timeout
        await redisClient.connect();
        
        // Create RedisStore
        sessionStore = new RedisStore({
            client: redisClient,
            prefix: 'sess:', // Prefix for session keys in Redis
            ttl: 86400 // 24 hours in seconds (matches cookie maxAge)
        });

        useRedisStore = true;

        console.log('[Session] ✓ Redis connected and ready for session persistence');
        console.log('[Session] Redis store configuration:', {
            host: REDIS_URL ? 'from REDIS_URL' : REDIS_HOST,
            port: REDIS_URL ? 'from REDIS_URL' : REDIS_PORT,
            hasPassword: !!REDIS_PASSWORD,
            prefix: 'sess:',
            ttl: '24h',
            storeType: 'RedisStore'
        });

        // Update session middleware to use Redis store
        // Note: express-session doesn't support hot-swapping stores
        // Sessions created with MemoryStore before Redis connected will remain in memory
        // New sessions after Redis connection will use Redis
        sessionMiddleware = createSessionMiddleware(sessionStore);
        console.log('[Session] ✓ Session middleware updated with Redis store');

    } catch (err) {
        console.error('[Session] Failed to connect to Redis:', err.message);
        
        // In production, fail fast - do NOT use memory store
        if (isProduction) {
            console.error('');
            console.error('═══════════════════════════════════════════════════════════');
            console.error('✗ FATAL: Redis connection required in production');
            console.error('═══════════════════════════════════════════════════════════');
            console.error('Production mode requires persistent session storage via Redis.');
            console.error('Memory store fallback is disabled to prevent session reliability issues.');
            console.error('');
            console.error('Solutions:');
            console.error('  1. Ensure Redis service is running and accessible');
            console.error('  2. Verify REDIS_HOST and REDIS_PORT environment variables');
            console.error('  3. Check Redis container: docker ps | grep redis');
            console.error('  4. Check Redis logs: docker logs <redis-container>');
            console.error('  5. For Docker Compose, Redis is auto-injected in deployments');
            console.error('');
            console.error('Current Redis configuration:');
            console.error(`  Host: ${REDIS_URL ? 'from REDIS_URL' : REDIS_HOST}`);
            console.error(`  Port: ${REDIS_URL ? 'from REDIS_URL' : REDIS_PORT}`);
            console.error(`  Password: ${REDIS_PASSWORD ? 'configured' : 'not set'}`);
            console.error('═══════════════════════════════════════════════════════════');
            console.error('');
            throw new Error('Redis connection required in production mode');
        }
        
        // In development, allow fallback to memory store
        console.warn('');
        console.warn('[Session] ═══════════════════════════════════════════════════');
        console.warn('[Session] ⚠ WARNING: Using memory store fallback (development only)');
        console.warn('[Session] ═══════════════════════════════════════════════════');
        console.warn('[Session] Redis is not available - continuing with memory store.');
        console.warn('[Session] This is only allowed in development mode.');
        console.warn('[Session] ');
        console.warn('[Session] Impact:');
        console.warn('[Session]   - Sessions will NOT persist across server restarts');
        console.warn('[Session]   - CSRF tokens may become invalid on restart');
        console.warn('[Session]   - Not suitable for production use');
        console.warn('[Session] ');
        console.warn('[Session] To fix:');
        console.warn('[Session]   - Start Redis: docker run -d -p 6379:6379 redis:7-alpine');
        console.warn('[Session]   - Or configure REDIS_HOST/REDIS_PORT if Redis is remote');
        console.warn('[Session] ═══════════════════════════════════════════════════');
        console.warn('');
        
        useRedisStore = false;
        redisClient = null;
        sessionStore = null;
        
        // Ensure session middleware exists (create if not already created by initializeSessionMiddleware)
        if (!sessionMiddleware) {
            sessionMiddleware = createSessionMiddleware(null);
            console.log('[Session] ✓ Session middleware created with memory store');
        } else {
            console.log('[Session] ✓ Continuing with memory store for sessions');
        }
        sessionInitialized = true;
    }
}

/**
 * Initialize session system and wait for it to be ready.
 * MUST be called before starting the HTTP server to ensure session store is available.
 * 
 * This function ensures proper initialization order:
 * 1. Attempts to connect to Redis (with timeout and retry logic)
 * 2. Creates session middleware with appropriate store (Redis or Memory)
 * 3. Sets up all necessary session configuration
 * 
 * Environment-specific behavior:
 * - Production (NODE_ENV=production): 
 *   * Requires Redis connection
 *   * Throws error if Redis unavailable (server will not start)
 *   * Prevents session reliability issues in production
 * 
 * - Development (NODE_ENV=development):
 *   * Attempts Redis connection
 *   * Falls back to memory store if Redis unavailable
 *   * Logs clear warnings about fallback implications
 * 
 * - Test (NODE_ENV=test):
 *   * Uses memory store without attempting Redis connection
 *   * Fast startup for test execution
 * 
 * @async
 * @throws {Error} In production mode if Redis connection fails
 * @returns {Promise<void>}
 * 
 * @example
 * // In server.js startup sequence:
 * await initializeSessionStore();  // Step 1: Initialize session store
 * app.use(getSessionMiddleware());  // Step 2: Apply middleware
 * server.listen(PORT);              // Step 3: Start accepting requests
 */
async function initializeSessionStore() {
    await initializeRedisClient();
    console.log('[Session] ✓ Session store initialized and ready');
}

/**
 * Get the session middleware instance
 * This is a singleton so it can be shared between Express and Socket.io
 * NOTE: Call initializeSessionStore() before using this in production
 */
function getSessionMiddleware() {
    if (!sessionMiddleware) {
        throw new Error('Session middleware not initialized. Call initializeSessionStore() first.');
    }
    return sessionMiddleware;
}

/**
 * Get session store status and health information
 * Useful for diagnostics and health checks
 */
function getSessionStoreStatus() {
    return {
        usingRedis: useRedisStore,
        redisConnected: redisClient?.isReady || false,
        storeType: useRedisStore ? 'redis' : 'memory',
        initialized: sessionInitialized,
        warning: !useRedisStore ? 'Sessions will not persist across restarts' : null
    };
}

/**
 * Gracefully shutdown Redis connection
 * Should be called when server is shutting down
 */
async function shutdownSessionStore() {
    if (redisClient && redisClient.isOpen) {
        try {
            await redisClient.quit();
            console.log('[Session] Redis client disconnected gracefully');
        } catch (err) {
            console.error('[Session] Error disconnecting Redis:', err.message);
        }
    }
}

module.exports = {
    initializeSessionMiddleware,
    initializeSessionStore,
    getSessionMiddleware,
    getSessionStoreStatus,
    shutdownSessionStore
};
