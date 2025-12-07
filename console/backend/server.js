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

const {
    generateToken, // Generates a CSRF token
    doubleCsrfProtection, // Full middleware
} = doubleCsrf({
    getSecret: () => csrfSecret,
    cookieName: 'csrf-token',
    cookieOptions: {
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true
    },
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS']
});

// Serve static frontend files (no CSRF needed for static files)
app.use('/console', express.static(path.join(__dirname, '../frontend')));

// Apply general API rate limiting
app.use('/api', apiLimiter);

// CSRF token endpoint
app.get('/api/csrf-token', (req, res) => {
    res.json({ csrfToken: generateToken(req, res) });
});

// Apply CSRF protection to all API routes except login and session check
app.use('/api', (req, res, next) => {
    // Skip CSRF for login endpoint (it's the first request)
    if (req.path === '/login' && req.method === 'POST') {
        return next();
    }
    // Skip CSRF for session check (GET request)
    if (req.path === '/session' && req.method === 'GET') {
        return next();
    }
    // Skip CSRF for csrf-token endpoint
    if (req.path === '/csrf-token' && req.method === 'GET') {
        return next();
    }
    // Apply CSRF to all other API routes
    doubleCsrfProtection(req, res, next);
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
    console.log(`Console server running on ${HOST}:${PORT}`);
    console.log(`API endpoints available at http://${HOST}:${PORT}/api`);
    console.log(`Health check: http://${HOST}:${PORT}/health`);
    console.log(`Plugin API: http://${HOST}:${PORT}/api/plugins`);
    console.log(`Plugin Health: http://${HOST}:${PORT}/api/plugins/health`);
    initializeServices();
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
