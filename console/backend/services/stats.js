const dockerService = require('./docker');
const rconService = require('./rcon');
const pluginIntegration = require('./pluginIntegration');
const path = require('path');

class StatsService {
    constructor() {
        this.cache = {
            stats: null,
            players: null,
            lastUpdate: 0
        };
        this.cacheTimeout = 5000; // 5 seconds
        this.MAX_VERSION_LENGTH = 50; // Maximum length for version string
        this.DU_COMMAND_TIMEOUT = 5000; // Timeout for du command in milliseconds
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

            // Get plugin metrics (TPS, CPU, Memory)
            const pluginMetrics = await pluginIntegration.getCombinedMetrics();

            // Use plugin data when available, fall back to Docker stats
            const memory = pluginMetrics.memory || (resourceStats ? resourceStats.memory : null);
            const cpu = pluginMetrics.cpu || (resourceStats ? resourceStats.cpu : null);

            const stats = {
                status: status.running ? 'online' : 'offline',
                rconConnected: rconService.isConnected(),
                uptime: status.uptime,
                players: {
                    online: playerInfo.online,
                    max: playerInfo.max,
                    list: playerInfo.players
                },
                tps: pluginMetrics.tps,
                memory: memory,
                cpu: cpu,
                version: version,
                worldSize: worldSize,
                dataSources: pluginMetrics.dataSources
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
            
            // Normalize and resolve path to prevent traversal attacks
            const normalizedPath = path.normalize(worldPath);
            const resolvedPath = path.resolve(normalizedPath);
            
            // Validate that the path doesn't try to escape expected directories
            // Check original path for .. before normalization removes it
            // Also check for suspicious shell characters including backslash
            if (worldPath.includes('..') || /[;&|\\`$(){}]/.test(worldPath)) {
                console.error('Invalid world path format:', worldPath);
                return 'Unknown';
            }
            
            // Additional validation: ensure resolved path doesn't contain .. after normalization
            if (resolvedPath.includes('..')) {
                console.error('Path traversal detected after resolution:', resolvedPath);
                return 'Unknown';
            }
            
            // Use spawn instead of execSync for better security
            const { spawn } = require('child_process');
            
            return new Promise((resolve) => {
                const worldDir = path.join(resolvedPath, 'world');
                const du = spawn('du', ['-sh', worldDir]);
                let output = '';
                let errorOccurred = false;
                
                du.stdout.on('data', (data) => {
                    output += data.toString();
                });
                
                du.stderr.on('data', () => {
                    errorOccurred = true;
                });
                
                du.on('close', (code) => {
                    if (code !== 0 || errorOccurred || !output) {
                        resolve('Unknown');
                        return;
                    }
                    
                    // Parse output like "1.5G\t/minecraft/world" or "1.5G  /minecraft/world"
                    const size = output.split(/\s+/)[0].trim();
                    resolve(size || 'Unknown');
                });
                
                // Timeout after configured time
                setTimeout(() => {
                    du.kill();
                    resolve('Unknown');
                }, this.DU_COMMAND_TIMEOUT);
            });
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
                return response.split('\n')[0].substring(0, this.MAX_VERSION_LENGTH);
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
