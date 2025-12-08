// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { doubleCsrf } = require('csrf-csrf');
const path = require('path');
const morgan = require('morgan');
const crypto = require('crypto');

// Import utilities
const { shouldUseSecureCookies, logCookieConfiguration } = require('./utils/cookieSecurity');

// Import services
const rconService = require('./services/rcon');
const logsService = require('./services/logs');
const { initializeUsers } = require('./auth/auth');
const { getSessionMiddleware, getSessionStoreStatus, shutdownSessionStore } = require('./auth/session');

// Import middleware
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const { debugLogger } = require('./middleware/debugLogger');

// Import routes
const apiRoutes = require('./routes/api');
const commandRoutes = require('./routes/commands');
const playerRoutes = require('./routes/players');
const serverRoutes = require('./routes/server');
const fileRoutes = require('./routes/files');
const backupRoutes = require('./routes/backups');
const pluginRoutes = require('./routes/plugins');

// Initialize Express app
const app = express();
app.set('trust proxy', 1); // Trust first proxy (Caddy)
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:3001',
        credentials: true
    }
});

// Port configuration
const PORT = process.env.CONSOLE_PORT || 3001;

// Configure morgan logging
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat));

// Generate nonce for CSP using cryptographically secure random
app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    next();
});

// Security middleware - Configure Helmet with nonce-based CSP
app.use((req, res, next) => {
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", `'nonce-${res.locals.nonce}'`],
                styleSrc: ["'self'", `'nonce-${res.locals.nonce}'`],
                imgSrc: ["'self'", "data:", "https://crafatar.com"], // Allow Crafatar for player avatars
                connectSrc: ["'self'", "ws:", "wss:"], // Allow WebSocket connections
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: []
            }
        },
        crossOriginEmbedderPolicy: false
    })(req, res, next);
});

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// MIDDLEWARE ORDER AUDIT (for CSRF protection)
// ============================================================================
// 1. cookie-parser MUST come before CSRF middleware (below)
//    - CSRF double-submit pattern requires reading cookies
//    - Applied globally to all routes
// 2. Session middleware comes after cookie-parser
//    - Session also needs cookies
// 3. CSRF middleware applied to /api routes (search for "doubleCsrfProtection")
//    - Validates CSRF token from both cookie AND header
//    - No duplicate CSRF middleware found
//    - Cookie name: 'csrf-token' (consistent throughout)
// ============================================================================

// Cookie parser is needed for CSRF protection (csrf-csrf library)
app.use(cookieParser());

// Get session middleware (shared between Express and Socket.io)
const sessionMiddleware = getSessionMiddleware();

// Apply session middleware to Express
app.use(sessionMiddleware);

// Share session middleware with Socket.io
io.engine.use(sessionMiddleware);

// Configure CSRF protection using csrf-csrf
const csrfSecret = process.env.CSRF_SECRET;

if (!csrfSecret) {
    console.error('ERROR: CSRF_SECRET environment variable must be set!');
    console.error('Generate a secure random secret and add it to your .env file:');
    console.error('  CSRF_SECRET=$(openssl rand -base64 32)');
    process.exit(1);
}

// Use the same cookie security configuration as session cookies
const useSecureCsrfCookies = shouldUseSecureCookies();
logCookieConfiguration('CSRF', useSecureCsrfCookies);

// Shared CSRF cookie options for consistency between doubleCsrf middleware and /api/csrf-token endpoint
// NOTE: httpOnly MUST be false for double-submit CSRF pattern to work with client-side JavaScript
// The client needs to read the cookie value and send it in the CSRF-Token header
// Security tradeoff: Cookie is readable by JS, but CSRF protection still works via double-submit validation
const csrfCookieOptions = {
    sameSite: 'lax', // Must match session cookie for consistency
    path: '/', // Ensure cookie is available for all paths
    secure: useSecureCsrfCookies, // HTTPS only in production, HTTP allowed in dev/test/CI
    httpOnly: false // MUST be false - client JS needs to read cookie for double-submit pattern
};

const {
    generateToken, // Generates a CSRF token
    doubleCsrfProtection, // Full middleware
} = doubleCsrf({
    getSecret: () => csrfSecret,
    cookieName: 'csrf-token',
    cookieOptions: csrfCookieOptions,
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    // Read CSRF token from header (standard practice for APIs)
    getTokenFromRequest: (req) => {
        // Check both common CSRF header names
        return req.headers['csrf-token'] || req.headers['x-csrf-token'];
    }
});

// Serve static frontend files (no CSRF needed for static files)
app.use('/console', express.static(path.join(__dirname, '../frontend')));

// Apply general API rate limiting
app.use('/api', apiLimiter);

// Apply debug logging to all API routes (logs session, cookies, CSRF, headers)
// This helps diagnose authentication and CSRF issues
app.use('/api', debugLogger({ logBody: true, logResponse: true }));

// CSRF token endpoint
app.get('/api/csrf-token', (req, res) => {
    const logInfo = {
        sessionID: req.sessionID,
        authenticated: req.session?.authenticated || false,
        username: req.session?.username || 'NOT_SET',
        hasCookies: !!req.headers.cookie,
        timestamp: new Date().toISOString()
    };
    
    // Development-only: Log detailed session and cookie information
    // Security: NODE_ENV check ensures sensitive data (session contents, cookies, headers)
    // is never logged in production. NODE_ENV is the standard Node.js environment indicator.
    // Production deployments should ALWAYS set NODE_ENV=production.
    if (process.env.NODE_ENV === 'development') {
        logInfo.sessionData = req.session;
        logInfo.cookies = req.cookies;
        logInfo.headers = {
            cookie: req.headers.cookie,
            'user-agent': req.headers['user-agent'],
            host: req.headers.host,
            origin: req.headers.origin,
            referer: req.headers.referer
        };
    }
    
    console.log('[CSRF] Token request:', logInfo);
    
    const token = generateToken(req, res);
    
    // Explicitly set the CSRF cookie to ensure it's sent to the client
    // The csrf-csrf middleware expects both the cookie AND the header for double-submit pattern
    // Using the same cookie name and options as configured in doubleCsrf above
    res.cookie('csrf-token', token, csrfCookieOptions);
    
    const responseLog = {
        sessionID: req.sessionID,
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 8) + '...',
        cookieName: 'csrf-token',
        cookieOptions: {
            httpOnly: csrfCookieOptions.httpOnly,
            sameSite: csrfCookieOptions.sameSite,
            secure: csrfCookieOptions.secure,
            path: csrfCookieOptions.path
        },
        warning: csrfCookieOptions.httpOnly 
            ? '⚠ httpOnly=true prevents client JS from reading cookie!' 
            : '✓ httpOnly=false allows client JS to read cookie for double-submit pattern'
    };
    
    // Development-only: Log actual token value
    if (process.env.NODE_ENV === 'development') {
        responseLog.tokenValue = token;
    }
    
    console.log('[CSRF] Token generated and cookie set:', responseLog);
    
    res.json({ csrfToken: token });
});

// Apply CSRF protection to all API routes except login and session check
app.use('/api', (req, res, next) => {
    // Skip CSRF for login endpoint (it's the first request)
    if (req.path === '/login' && req.method === 'POST') {
        console.log('[CSRF] Skipping CSRF check for login');
        return next();
    }
    // Skip CSRF for session check (GET request)
    if (req.path === '/session' && req.method === 'GET') {
        console.log('[CSRF] Skipping CSRF check for session');
        return next();
    }
    // Skip CSRF for csrf-token endpoint
    if (req.path === '/csrf-token' && req.method === 'GET') {
        console.log('[CSRF] Skipping CSRF check for csrf-token endpoint');
        return next();
    }
    // Skip CSRF for debug logs endpoint
    if (req.path === '/debug/logs' && req.method === 'GET') {
        console.log('[CSRF] Skipping CSRF check for debug logs');
        return next();
    }
    
    // Extract CSRF token from headers (supporting both 'CSRF-Token' and 'X-CSRF-Token')
    const csrfHeaderValue = req.headers['csrf-token'] || req.headers['x-csrf-token'];
    const csrfCookieValue = req.cookies['csrf-token'];
    
    // Extract session details for logging
    const sessionInfo = {
        sessionID: req.sessionID,
        authenticated: req.session?.authenticated || false,
        username: req.session?.username || 'NOT_SET'
    };
    
    // Explicitly decode token values and extract first segment if pipe separator exists
    const headerToken = csrfHeaderValue ? String(csrfHeaderValue).trim() : null;
    
    // Split cookie value once and reuse
    let cookieToken = null;
    let cookieHash = null;
    if (csrfCookieValue) {
        const cookieParts = String(csrfCookieValue).split('|');
        cookieToken = cookieParts[0] ? cookieParts[0].trim() : null;
        cookieHash = cookieParts[1] ? cookieParts[1].trim() : null;
    }
    
    // Determine header source for logging
    let headerSource = 'NONE';
    if (req.headers['csrf-token']) {
        headerSource = 'CSRF-Token';
    } else if (req.headers['x-csrf-token']) {
        headerSource = 'X-CSRF-Token';
    }
    
    // Log all token values and session details for every authenticated API call
    const logInfo = {
        path: req.path,
        method: req.method,
        session: sessionInfo,
        tokens: {
            headerPresent: !!headerToken,
            cookiePresent: !!csrfCookieValue,
            headerSource: headerSource,
            cookieHasPipeSeparator: csrfCookieValue ? csrfCookieValue.includes('|') : false
        }
    };
    
    // In development mode, log exact token values for debugging
    if (process.env.NODE_ENV === 'development') {
        logInfo.tokens.headerValue = headerToken || 'NONE';
        logInfo.tokens.cookieValue = csrfCookieValue || 'NONE';
        logInfo.tokens.cookieTokenSegment = cookieToken || 'NONE';
        logInfo.tokens.cookieHashSegment = cookieHash || 'NONE';
        logInfo.tokens.firstSegmentMatch = headerToken === cookieToken;
        logInfo.session.fullData = req.session;
        logInfo.allCookies = req.cookies;
        logInfo.allHeaders = {
            'csrf-token': req.headers['csrf-token'],
            'x-csrf-token': req.headers['x-csrf-token'],
            'cookie': req.headers.cookie,
            'user-agent': req.headers['user-agent'],
            'origin': req.headers.origin,
            'referer': req.headers.referer
        };
    }
    
    console.log('[CSRF] Applying CSRF protection:', logInfo);
    
    // Apply CSRF to all other API routes
    doubleCsrfProtection(req, res, (err) => {
        if (err) {
            // Enhanced diagnostic logging for CSRF validation failures
            // Log ALL received values and the reason for failure
            const failureInfo = {
                path: req.path,
                method: req.method,
                error: err.message,
                errorCode: err.code || 'UNKNOWN',
                session: sessionInfo,
                validation: {
                    headerTokenPresent: !!headerToken,
                    cookieTokenPresent: !!cookieToken,
                    cookieHashPresent: !!cookieHash,
                    sessionAuthenticated: sessionInfo.authenticated,
                    allCookiesPresent: Object.keys(req.cookies || {})
                }
            };
            
            // Determine specific failure reason
            if (!headerToken) {
                failureInfo.failureReason = 'CSRF token missing from request header (neither CSRF-Token nor X-CSRF-Token present)';
            } else if (!csrfCookieValue) {
                failureInfo.failureReason = 'CSRF cookie missing from request';
            } else if (!cookieToken) {
                failureInfo.failureReason = 'CSRF cookie does not contain token segment (no pipe separator or empty token)';
            } else if (headerToken && cookieToken && headerToken !== cookieToken) {
                failureInfo.failureReason = 'CSRF token mismatch: header token does not match cookie token (first segment comparison)';
            } else {
                failureInfo.failureReason = 'CSRF hash validation failed (token matches but hash is invalid - possible secret mismatch or tampering)';
            }
            
            // Development-only: Log actual token values for diagnostics
            if (process.env.NODE_ENV === 'development') {
                failureInfo.validation.headerTokenValue = headerToken || 'NONE';
                failureInfo.validation.cookieFullValue = csrfCookieValue || 'NONE';
                failureInfo.validation.cookieTokenSegment = cookieToken || 'NONE';
                failureInfo.validation.cookieHashSegment = cookieHash || 'NONE';
                failureInfo.validation.firstSegmentMatch = headerToken === cookieToken;
                failureInfo.validation.allCookieValues = req.cookies;
                failureInfo.validation.sessionData = req.session;
                failureInfo.validation.allHeaders = req.headers;
            }
            
            console.error('[CSRF] CSRF validation failed:', failureInfo);
            
            // Return 403 Forbidden for CSRF validation failures
            return res.status(403).json({ 
                error: 'invalid csrf token',
                message: 'CSRF token validation failed. Please refresh and try again.'
            });
        }
        
        // Log successful validation with token comparison details
        const successInfo = {
            path: req.path,
            method: req.method,
            session: sessionInfo,
            validation: {
                passed: true,
                headerTokenMatched: true,
                hashValidated: true
            }
        };
        
        // Development-only: Log token values on success
        if (process.env.NODE_ENV === 'development') {
            successInfo.validation.headerTokenValue = headerToken || 'NONE';
            successInfo.validation.cookieTokenSegment = cookieToken || 'NONE';
            successInfo.validation.firstSegmentMatch = headerToken === cookieToken;
        }
        
        console.log('[CSRF] CSRF validation passed:', successInfo);
        next();
    });
});

// API routes
app.use('/api', apiRoutes);
app.use('/api/commands', commandRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/server', serverRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/plugins', pluginRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    const sessionStatus = getSessionStoreStatus();
    res.json({ 
        status: 'ok',
        session: sessionStatus
    });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Check if authenticated
    const session = socket.request.session;
    if (!session || !session.authenticated) {
        socket.emit('error', { message: 'Not authenticated' });
        socket.disconnect();
        return;
    }

    // Send buffered logs
    const bufferedLogs = logsService.getBufferedLogs();
    socket.emit('logs', bufferedLogs);

    // Listen for new logs
    const logHandler = (log) => {
        socket.emit('log', log);
    };

    logsService.on('log', logHandler);

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        logsService.removeListener('log', logHandler);
    });

    // Handle command execution via WebSocket
    socket.on('execute-command', async (data) => {
        try {
            const result = await rconService.executeCommand(data.command);
            socket.emit('command-result', result);
        } catch (error) {
            socket.emit('command-error', { error: error.message });
        }
    });
});

// Initialize services
async function initializeServices() {
    try {
        // Initialize admin users
        await initializeUsers();

        // Connect to RCON
        await rconService.connect();

        // Start log streaming
        await logsService.startStreaming();

        console.log('All services initialized successfully');
    } catch (error) {
        console.error('Error initializing services:', error);
    }
}

// Start server - explicitly bind to 0.0.0.0 to accept connections from all interfaces
// This is required for Docker containers to be accessible from outside the container
const HOST = '0.0.0.0';
server.listen(PORT, HOST, () => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✓ Console Server Started Successfully');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Server binding:     ${HOST}:${PORT}`);
    console.log(`Node environment:   ${process.env.NODE_ENV || 'development'}`);
    console.log(`API base URL:       http://${HOST}:${PORT}/api`);
    console.log(`Health endpoint:    http://${HOST}:${PORT}/health`);
    console.log(`Plugin API:         http://${HOST}:${PORT}/api/plugins`);
    console.log(`Plugin Health:      http://${HOST}:${PORT}/api/plugins/health`);
    console.log('═══════════════════════════════════════════════════════════');
    
    // Validate Redis connection for session persistence
    const sessionStatus = getSessionStoreStatus();
    if (!sessionStatus.usingRedis || !sessionStatus.redisConnected) {
        console.log('');
        console.log('⚠ WARNING: Redis Session Store Not Available');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('Redis service is not connected. Using memory store fallback.');
        console.log('');
        console.log('Impact:');
        console.log('  - Sessions will not persist across server restarts');
        console.log('  - CSRF tokens may become invalid on restart');
        console.log('  - Plugin installations may fail in some scenarios');
        console.log('');
        console.log('Solution:');
        console.log('  - Ensure Redis service is running and accessible');
        console.log('  - Check REDIS_HOST and REDIS_PORT environment variables');
        console.log('  - For Docker deployments, Redis is auto-injected');
        console.log('  - Verify with: docker ps | grep redis');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');
    }
    
    initializeServices();
});

// Handle server startup errors
server.on('error', (error) => {
    console.error('═══════════════════════════════════════════════════════════');
    console.error('✗ Server Failed to Start');
    console.error('═══════════════════════════════════════════════════════════');
    
    if (error.code === 'EADDRINUSE') {
        console.error(`ERROR: Port ${PORT} is already in use`);
        console.error(`Solution: Stop the process using port ${PORT} or use a different port`);
        console.error(`Check with: lsof -i :${PORT} or netstat -tuln | grep ${PORT}`);
    } else if (error.code === 'EACCES') {
        console.error(`ERROR: Permission denied to bind to port ${PORT}`);
        console.error(`Solution: Use a port >= 1024 or run with elevated permissions`);
    } else if (error.code === 'EADDRNOTAVAIL') {
        console.error(`ERROR: Cannot bind to address ${HOST}`);
        console.error(`Solution: Verify network interface configuration`);
    } else {
        console.error(`ERROR: ${error.code || 'Unknown error'}`);
        console.error(`Message: ${error.message}`);
    }
    
    console.error('═══════════════════════════════════════════════════════════');
    console.error('Stack trace:', error.stack);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    
    logsService.stopStreaming();
    await rconService.disconnect();
    await shutdownSessionStore();
    
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    
    logsService.stopStreaming();
    await rconService.disconnect();
    await shutdownSessionStore();
    
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = { app, server, io };
