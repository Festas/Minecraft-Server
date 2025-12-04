const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');

// Import services
const rconService = require('./services/rcon');
const logsService = require('./services/logs');
const { initializeUsers } = require('./auth/auth');
const { configureSession } = require('./auth/session');

// Import routes
const apiRoutes = require('./routes/api');
const commandRoutes = require('./routes/commands');
const playerRoutes = require('./routes/players');
const serverRoutes = require('./routes/server');
const fileRoutes = require('./routes/files');
const backupRoutes = require('./routes/backups');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:3001',
        credentials: true
    }
});

// Port configuration
const PORT = process.env.CONSOLE_PORT || 3001;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Allow inline scripts for now
    crossOriginEmbedderPolicy: false
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session middleware
app.use(configureSession());

// Serve static frontend files
app.use('/console', express.static(path.join(__dirname, '../frontend')));

// API routes
app.use('/api', apiRoutes);
app.use('/api/commands', commandRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/server', serverRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/backups', backupRoutes);

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
