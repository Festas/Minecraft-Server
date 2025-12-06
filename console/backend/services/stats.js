const dockerService = require('./docker');
const rconService = require('./rcon');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class StatsService {
    constructor() {
        this.cache = {
            stats: null,
            players: null,
            lastUpdate: 0
        };
        this.cacheTimeout = 5000; // 5 seconds
    }

    /**
     * Get comprehensive server stats
     */
    async getServerStats() {
        const now = Date.now();
        
        // Return cached data if fresh
        if (this.cache.stats && (now - this.cache.lastUpdate) < this.cacheTimeout) {
            return this.cache.stats;
        }

        try {
            // Get container status
            const status = await dockerService.getStatus();
            
            // Get container resource stats
            const resourceStats = await dockerService.getStats();
            
            // Get player info via RCON
            let playerInfo = { online: 0, max: 20, players: [] };
            try {
                playerInfo = await rconService.getPlayers();
            } catch (error) {
                console.error('Error getting player info:', error);
            }

            // Get world size
            const worldSize = await this.getWorldSize();

            // Get Minecraft version from server
            const version = await this.getMinecraftVersion();

            const stats = {
                status: status.running ? 'online' : 'offline',
                rconConnected: rconService.isConnected(),
                uptime: status.uptime,
                players: {
                    online: playerInfo.online,
                    max: playerInfo.max,
                    list: playerInfo.players
                },
                tps: 20.0, // Default TPS (would need plugin for real data)
                memory: resourceStats ? resourceStats.memory : null,
                cpu: resourceStats ? resourceStats.cpu : null,
                version: version,
                worldSize: worldSize
            };

            // Update cache
            this.cache.stats = stats;
            this.cache.lastUpdate = now;

            return stats;
        } catch (error) {
            console.error('Error getting server stats:', error);
            return {
                status: 'error',
                error: error.message
            };
        }
    }

    /**
     * Get world size (disk space used)
     */
    async getWorldSize() {
        try {
            const worldPath = process.env.MC_SERVER_DIR || '/minecraft';
            
            // Use du command to get actual directory size
            const result = execSync(`du -sh "${worldPath}/world" 2>/dev/null || echo "0 Unknown"`, {
                encoding: 'utf8',
                timeout: 5000
            });
            
            // Parse output like "1.5G /minecraft/world"
            const size = result.split('\t')[0].trim();
            return size || 'Unknown';
        } catch (error) {
            console.error('Error getting world size:', error.message);
            return 'Unknown';
        }
    }

    /**
     * Get Minecraft version
     */
    async getMinecraftVersion() {
        try {
            // Try to get from RCON version command
            const result = await rconService.executeCommand('version');
            if (result.success && result.response) {
                // Paper returns: "This server is running Paper version git-Paper-xxx (MC: 1.20.4)"
                // Extract the useful part
                const response = result.response.trim();
                
                // Try to extract MC version
                const mcMatch = response.match(/MC:\s*([\d.]+)/);
                if (mcMatch) {
                    return `Paper ${mcMatch[1]}`;
                }
                
                // Try to extract Paper version
                const paperMatch = response.match(/Paper version ([^\s(]+)/);
                if (paperMatch) {
                    return `Paper ${paperMatch[1]}`;
                }
                
                // Return first line if parsing fails
                return response.split('\n')[0].substring(0, 50);
            }
        } catch (error) {
            console.error('Error getting Minecraft version via RCON:', error.message);
        }
        
        // Fallback to environment variable
        return process.env.MINECRAFT_VERSION || process.env.VERSION || 'Paper';
    }

    /**
     * Get TPS (requires plugin or specific server type)
     */
    async getTPS() {
        // This would require a plugin like Spark or Paper's /tps command
        // For now, return default
        return 20.0;
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache = {
            stats: null,
            players: null,
            lastUpdate: 0
        };
    }
}

module.exports = new StatsService();
