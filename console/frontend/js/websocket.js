// WebSocket connection management
let socket = null;
let isConnected = false;

function initializeWebSocket() {
    // Update status to connecting
    if (typeof updateConsoleStatus === 'function') {
        updateConsoleStatus('connecting');
    }
    
    // Connect to Socket.io
    socket = io({
        transports: ['websocket'],
        upgrade: false,
        withCredentials: true  // Send cookies with WebSocket connection
    });

    socket.on('connect', () => {
        console.log('WebSocket connected');
        isConnected = true;
        showNotification('Connected to server', 'success');
        if (typeof updateConsoleStatus === 'function') {
            updateConsoleStatus('connected');
        }
    });

    socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        isConnected = false;
        showNotification('Disconnected from server', 'warning');
        if (typeof updateConsoleStatus === 'function') {
            updateConsoleStatus('disconnected');
        }
    });

    socket.on('error', (error) => {
        console.error('WebSocket error:', error);
        showNotification(error.message || 'Connection error', 'error');
    });

    // Listen for individual log lines
    socket.on('log', (log) => {
        appendLog(log);
    });

    // Listen for batch of logs
    socket.on('logs', (logs) => {
        logs.forEach(log => appendLog(log));
    });

    // Listen for command results
    socket.on('command-result', (result) => {
        handleCommandResult(result);
    });

    socket.on('command-error', (error) => {
        showNotification(error.error || 'Command failed', 'error');
    });

    return socket;
}

function sendCommand(command) {
    if (socket && isConnected) {
        socket.emit('execute-command', { command });
    } else {
        showNotification('Not connected to server', 'error');
    }
}

function handleCommandResult(result) {
    if (result.success) {
        showNotification('Command executed successfully', 'success');
        if (result.response) {
            appendLog({
                timestamp: new Date().toISOString(),
                message: `[RESULT] ${result.response}`
            });
        }
    } else {
        showNotification(result.error || 'Command failed', 'error');
    }
}
