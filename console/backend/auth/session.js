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

// Function to create session middleware with given store
function createSessionMiddleware(store) {
    return session({
        secret: process.env.SESSION_SECRET || 'your-secure-random-session-secret',
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

// Initialize Redis client and session store
async function initializeRedisClient() {
    // Skip Redis in test environment - use memory store for tests
    if (process.env.NODE_ENV === 'test') {
        console.log('[Session] Test environment detected - using memory store');
        useRedisStore = false;
        sessionInitialized = true;
        sessionMiddleware = createSessionMiddleware(null);
        return;
    }

    // In production, Redis is REQUIRED - no fallback to memory store
    const isProduction = process.env.NODE_ENV === 'production';
    
    try {
        console.log('[Session] Initializing Redis connection...');
        
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
        sessionInitialized = true;

        console.log('[Session] ✓ Redis connected and ready for session persistence');
        console.log('[Session] Redis configuration:', {
            host: REDIS_URL ? 'from REDIS_URL' : REDIS_HOST,
            port: REDIS_URL ? 'from REDIS_URL' : REDIS_PORT,
            hasPassword: !!REDIS_PASSWORD,
            prefix: 'sess:',
            ttl: '24h'
        });

        // Create session middleware with Redis store
        sessionMiddleware = createSessionMiddleware(sessionStore);

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
        console.warn('[Session] Redis is not available - falling back to memory store.');
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
        sessionInitialized = true;
        
        // Create session middleware with memory store
        sessionMiddleware = createSessionMiddleware(null);
    }
}

/**
 * Initialize session system and wait for it to be ready
 * MUST be called before starting the server to ensure session store is available
 * 
 * In production: Requires Redis connection (fails if Redis unavailable)
 * In development: Falls back to memory store if Redis unavailable
 * In test: Uses memory store (skips Redis)
 */
async function initializeSessionStore() {
    await initializeRedisClient();
    
    if (!sessionMiddleware) {
        throw new Error('Session middleware failed to initialize');
    }
    
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
    initializeSessionStore,
    getSessionMiddleware,
    getSessionStoreStatus,
    shutdownSessionStore
};
