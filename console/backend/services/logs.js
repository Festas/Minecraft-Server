const dockerService = require('./docker');
const EventEmitter = require('events');

class LogsService extends EventEmitter {
    constructor() {
        super();
        this.logStream = null;
        this.logBuffer = [];
        this.maxBufferSize = 1000;
    }

    /**
     * Start streaming logs
     */
    async startStreaming() {
        try {
            this.logStream = await dockerService.streamLogs((logLine) => {
                // Add to buffer
                this.logBuffer.push({
                    timestamp: new Date().toISOString(),
                    message: logLine
                });

                // Trim buffer if too large
                if (this.logBuffer.length > this.maxBufferSize) {
                    this.logBuffer.shift();
                }

                // Emit log event
                this.emit('log', {
                    timestamp: new Date().toISOString(),
                    message: logLine
                });

                // Parse and emit player join/leave events
                this.parsePlayerEvents(logLine);
            });

            console.log('Log streaming started');
        } catch (error) {
            console.error('Error starting log stream:', error);
        }
    }

    /**
     * Stop streaming logs
     */
    stopStreaming() {
        if (this.logStream) {
            this.logStream.destroy();
            this.logStream = null;
            console.log('Log streaming stopped');
        }
    }

    /**
     * Get buffered logs
     */
    getBufferedLogs() {
        return this.logBuffer;
    }

    /**
     * Parse log line to extract type (INFO, WARN, ERROR, etc.)
     */
    parseLogType(logLine) {
        if (logLine.includes('INFO')) return 'info';
        if (logLine.includes('WARN')) return 'warn';
        if (logLine.includes('ERROR')) return 'error';
        if (logLine.includes('SEVERE')) return 'error';
        if (logLine.includes('joined the game')) return 'join';
        if (logLine.includes('left the game')) return 'leave';
        if (logLine.match(/<[^>]+>/)) return 'chat';
        return 'info';
    }

    /**
     * Parse player join/leave events from log line
     * @param {string} logLine - Log line to parse
     */
    parsePlayerEvents(logLine) {
        // Strip ANSI codes first
        const cleanLine = logLine.replace(/\x1b\[[0-9;]*m/g, '');
        
        // Match player joined: Look for "Username joined the game" anywhere in the line
        // Minecraft usernames: 3-16 chars, alphanumeric and underscores only
        const joinMatch = cleanLine.match(/\]: ([a-zA-Z0-9_]{3,16}) joined the game/);
        if (joinMatch) {
            const username = joinMatch[1];
            console.log(`[Logs] Detected player join: ${username}`);
            this.emit('player-joined', { username });
            return;
        }

        // Also try without the "]: " prefix for compatibility
        // Use negative lookbehind to ensure we don't match mid-word
        const joinMatchAlt = cleanLine.match(/(?:^|\s)([a-zA-Z0-9_]{3,16}) joined the game$/);
        if (joinMatchAlt) {
            const username = joinMatchAlt[1];
            console.log(`[Logs] Detected player join (alt): ${username}`);
            this.emit('player-joined', { username });
            return;
        }

        // Match player left: "PlayerName left the game"
        const leaveMatch = cleanLine.match(/\]: ([a-zA-Z0-9_]{3,16}) left the game/);
        if (leaveMatch) {
            const username = leaveMatch[1];
            console.log(`[Logs] Detected player leave: ${username}`);
            this.emit('player-left', { username });
            return;
        }

        // Also try without the "]: " prefix for compatibility
        // Use negative lookbehind to ensure we don't match mid-word
        const leaveMatchAlt = cleanLine.match(/(?:^|\s)([a-zA-Z0-9_]{3,16}) left the game$/);
        if (leaveMatchAlt) {
            const username = leaveMatchAlt[1];
            console.log(`[Logs] Detected player leave (alt): ${username}`);
            this.emit('player-left', { username });
            return;
        }
    }

    /**
     * Clear log buffer
     */
    clearBuffer() {
        this.logBuffer = [];
    }
}

module.exports = new LogsService();
