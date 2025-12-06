const { Rcon } = require('rcon-client');

class RconService {
    constructor() {
        this.rcon = null;
        this.config = {
            host: process.env.RCON_HOST || 'minecraft-server',
            port: parseInt(process.env.RCON_PORT || '25575'),
            password: process.env.RCON_PASSWORD || ''
        };
        this.reconnectInterval = null;
    }

    /**
     * Connect to RCON
     */
    async connect() {
        try {
            this.rcon = await Rcon.connect(this.config);
            console.log('RCON connected successfully');
            
            // Handle disconnect
            this.rcon.on('end', () => {
                console.log('RCON connection ended');
                this.scheduleReconnect();
            });

            this.rcon.on('error', (err) => {
                console.error('RCON error:', err);
            });

            return true;
        } catch (error) {
            console.error('Failed to connect to RCON:', error.message);
            this.scheduleReconnect();
            return false;
        }
    }

    /**
     * Schedule reconnection attempt
     */
    scheduleReconnect() {
        if (this.reconnectInterval) return;
        
        this.reconnectInterval = setInterval(async () => {
            console.log('Attempting to reconnect to RCON...');
            const connected = await this.connect();
            if (connected) {
                clearInterval(this.reconnectInterval);
                this.reconnectInterval = null;
            }
        }, 10000); // Try every 10 seconds
    }

    /**
     * Execute a command via RCON
     */
    async executeCommand(command) {
        if (!this.rcon) {
            throw new Error('RCON not connected');
        }

        try {
            const response = await this.rcon.send(command);
            return {
                success: true,
                response: response
            };
        } catch (error) {
            console.error('Error executing RCON command:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get list of online players
     */
    async getPlayers() {
        const result = await this.executeCommand('list');
        if (result.success) {
            // Parse player list from response
            // Format: "There are X of Y players online: player1, player2, ..."
            const match = result.response.match(/There are (\d+) of a max of (\d+) players online:(.*)$/);
            if (match) {
                const playerNames = match[3].trim();
                return {
                    online: parseInt(match[1]),
                    max: parseInt(match[2]),
                    players: playerNames ? playerNames.split(', ').map(p => p.trim()) : []
                };
            }
        }
        return { online: 0, max: 0, players: [] };
    }

    /**
     * Stop the server gracefully
     */
    async stopServer() {
        return await this.executeCommand('stop');
    }

    /**
     * Save all worlds
     */
    async saveAll() {
        return await this.executeCommand('save-all');
    }

    /**
     * Disable auto-save
     */
    async saveOff() {
        return await this.executeCommand('save-off');
    }

    /**
     * Enable auto-save
     */
    async saveOn() {
        return await this.executeCommand('save-on');
    }

    /**
     * Check if RCON is connected
     */
    isConnected() {
        return this.rcon !== null && this.rcon.authenticated;
    }

    /**
     * Get connection status details
     */
    getConnectionStatus() {
        return {
            connected: this.isConnected(),
            host: this.config.host,
            port: this.config.port,
            reconnecting: this.reconnectInterval !== null
        };
    }

    /**
     * Disconnect from RCON
     */
    async disconnect() {
        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
        }
        
        if (this.rcon) {
            await this.rcon.end();
            this.rcon = null;
        }
    }
}

module.exports = new RconService();
