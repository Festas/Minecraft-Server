const session = require('express-session');
const { createClient } = require('redis');
const RedisStore = require('connect-redis').default;
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
(async function initializeRedisClient() {
    // Skip Redis in test environment - use memory store for tests
    if (process.env.NODE_ENV === 'test') {
        console.log('[Session] Test environment detected - using memory store');
        useRedisStore = false;
        sessionMiddleware = createSessionMiddleware(null);
        return;
    }

    try {
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

        console.log('[Session] ✓ Using Redis store for session persistence');
        console.log('[Session] Redis configuration:', {
            host: REDIS_URL ? 'from REDIS_URL' : REDIS_HOST,
            port: REDIS_URL ? 'from REDIS_URL' : REDIS_PORT,
            hasPassword: !!REDIS_PASSWORD,
            prefix: 'sess:',
            ttl: '24h'
        });

        // Recreate session middleware with Redis store
        sessionMiddleware = createSessionMiddleware(sessionStore);

    } catch (err) {
        console.error('[Session] Failed to connect to Redis:', err.message);
        console.warn('[Session] ⚠ WARNING: Falling back to memory store');
        console.warn('[Session] ⚠ WARNING: Sessions will NOT persist across process restarts');
        console.warn('[Session] ⚠ WARNING: CSRF tokens may fail in CI/Docker environments');
        console.warn('[Session] To fix: Ensure Redis is running and configure REDIS_HOST/REDIS_PORT or REDIS_URL');
        
        useRedisStore = false;
        redisClient = null;
        sessionStore = null;
        
        // Create session middleware with memory store
        sessionMiddleware = createSessionMiddleware(null);
    }
})();

// Create initial session middleware with memory store (will be replaced by Redis if available)
sessionMiddleware = createSessionMiddleware(null);

/**
 * Get the session middleware instance
 * This is a singleton so it can be shared between Express and Socket.io
 */
function getSessionMiddleware() {
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
    getSessionMiddleware,
    sessionMiddleware,
    getSessionStoreStatus,
    shutdownSessionStore
};
