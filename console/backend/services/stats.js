const dockerService = require('./docker');
const rconService = require('./rcon');
const fs = require('fs').promises;
const path = require('path');

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
            const worldPath = process.env.MC_SERVER_DIR || '/data';
            const stats = await fs.stat(path.join(worldPath, 'world'));
            
            // This is approximate - for accurate size, would need recursive du
            return '0 MB'; // Placeholder
        } catch (error) {
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
                return result.response.trim();
            }
            
            return process.env.VERSION || 'Paper 1.20.4';
        } catch (error) {
            return 'Unknown';
        }
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
