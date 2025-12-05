// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const path = require('path');

// Import services
const rconService = require('./services/rcon');
const logsService = require('./services/logs');
const { initializeUsers } = require('./auth/auth');
const { getSessionMiddleware } = require('./auth/session');

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

// Security middleware - Configure Helmet with proper CSP
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts (needed for our frontend)
            styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
            imgSrc: ["'self'", "data:", "https://crafatar.com"], // Allow Crafatar for player avatars
            connectSrc: ["'self'", "ws:", "wss:"], // Allow WebSocket connections
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    },
    crossOriginEmbedderPolicy: false
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Get session middleware (shared between Express and Socket.io)
const sessionMiddleware = getSessionMiddleware();

// Apply session middleware to Express
app.use(sessionMiddleware);

// Share session middleware with Socket.io
io.engine.use(sessionMiddleware);

// CSRF protection middleware (exclude WebSocket and static files)
const csrfProtection = csrf({ cookie: false }); // Use session-based CSRF

// Serve static frontend files (no CSRF needed for static files)
app.use('/console', express.static(path.join(__dirname, '../frontend')));

// Apply CSRF protection to all API routes except login
app.use('/api', (req, res, next) => {
    // Skip CSRF for login endpoint (it's the first request)
    if (req.path === '/login' && req.method === 'POST') {
        return next();
    }
    // Skip CSRF for session check (GET request)
    if (req.path === '/session' && req.method === 'GET') {
        return next();
    }
    // Apply CSRF to all other API routes
    csrfProtection(req, res, next);
});

// CSRF token endpoint
app.get('/api/csrf-token', csrfProtection, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
});

// API routes
app.use('/api', apiRoutes);
app.use('/api/commands', csrfProtection, commandRoutes);
app.use('/api/players', csrfProtection, playerRoutes);
app.use('/api/server', csrfProtection, serverRoutes);
app.use('/api/files', csrfProtection, fileRoutes);
app.use('/api/backups', csrfProtection, backupRoutes);
app.use('/api/plugins', csrfProtection, pluginRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

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

// Start server
server.listen(PORT, () => {
    console.log(`Console server running on port ${PORT}`);
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
