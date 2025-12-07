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

// Import services
const rconService = require('./services/rcon');
const logsService = require('./services/logs');
const { initializeUsers } = require('./auth/auth');
const { getSessionMiddleware } = require('./auth/session');

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
// Cookie parser is needed for CSRF protection (csrf-csrf library)
// CSRF protection is applied below at line 128
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

/**
 * Determine if secure cookies should be used for CSRF tokens.
 * MUST match session cookie configuration to avoid mismatched cookie behavior.
 * See auth/session.js for detailed explanation of why secure: false is required for HTTP.
 */
function shouldUseSecureCsrfCookies() {
    // Allow explicit override for testing/diagnostics
    if (process.env.COOKIE_SECURE !== undefined) {
        return process.env.COOKIE_SECURE === 'true';
    }
    
    // Only use secure cookies in production (assumes HTTPS/SSL is configured)
    return process.env.NODE_ENV === 'production';
}

const useSecureCsrfCookies = shouldUseSecureCsrfCookies();

console.log('[CSRF] Cookie configuration:', {
    secure: useSecureCsrfCookies,
    nodeEnv: process.env.NODE_ENV || 'development',
    cookieSecureOverride: process.env.COOKIE_SECURE || 'not set',
    warning: useSecureCsrfCookies ? 'HTTPS/SSL required for CSRF cookies' : 'HTTP allowed - CSRF cookies work without SSL'
});

const {
    generateToken, // Generates a CSRF token
    doubleCsrfProtection, // Full middleware
} = doubleCsrf({
    getSecret: () => csrfSecret,
    cookieName: 'csrf-token',
    cookieOptions: {
        sameSite: 'lax', // Must match session cookie for consistency
        path: '/', // Ensure cookie is available for all paths
        secure: useSecureCsrfCookies, // HTTPS only in production, HTTP allowed in dev/test/CI
        httpOnly: true // Prevent XSS attacks
    },
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
    console.log('[CSRF] Token request:', {
        sessionID: req.sessionID,
        authenticated: req.session?.authenticated || false,
        username: req.session?.username || 'NOT_SET',
        hasCookies: !!req.headers.cookie,
        timestamp: new Date().toISOString()
    });
    
    const token = generateToken(req, res);
    
    console.log('[CSRF] Token generated:', {
        sessionID: req.sessionID,
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 8) + '...'
    });
    
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
    
    console.log('[CSRF] Applying CSRF protection:', {
        path: req.path,
        method: req.method,
        csrfHeader: req.headers['csrf-token'] || req.headers['x-csrf-token'] || 'MISSING',
        csrfCookie: req.cookies['csrf-token'] ? 'PRESENT' : 'MISSING',
        sessionID: req.sessionID
    });
    
    // Apply CSRF to all other API routes
    doubleCsrfProtection(req, res, (err) => {
        if (err) {
            console.error('[CSRF] CSRF validation failed:', {
                path: req.path,
                method: req.method,
                error: err.message,
                csrfHeader: req.headers['csrf-token'] || req.headers['x-csrf-token'] || 'MISSING',
                csrfCookie: req.cookies['csrf-token'] ? 'PRESENT' : 'MISSING',
                sessionID: req.sessionID
            });
        }
        next(err);
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
    res.json({ status: 'ok' });
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
    
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    
    logsService.stopStreaming();
    await rconService.disconnect();
    
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = { app, server, io };
