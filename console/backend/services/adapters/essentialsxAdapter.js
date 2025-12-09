/**
 * EssentialsX Plugin Adapter
 * 
 * Integration adapter for EssentialsX WebAPI - a comprehensive essentials plugin for Minecraft.
 * Provides access to player information, server status, and various utilities.
 * 
 * EssentialsX WebAPI: https://github.com/EssentialsX/Essentials
 * Note: Requires EssentialsX with WebAPI module installed and configured
 */

const BasePluginAdapter = require('./baseAdapter');

class EssentialsXAdapter extends BasePluginAdapter {
    constructor() {
        super('EssentialsX');
        this.serverInfoCache = null;
        this.cacheExpiry = null;
        this.CACHE_TTL = 30000; // 30 seconds cache
    }

    /**
     * Initialize the EssentialsX adapter
     * @returns {Promise<object>} Initialization result
     */
    async initialize() {
        const baseResult = await super.initialize();
        if (!baseResult.enabled) {
            return baseResult;
        }

        try {
            // Test connection by fetching server status
            const status = await this.getServerStatus();
            console.log(`[EssentialsX] Connected to server. Version: ${status.version || 'N/A'}`);
            
            return {
                enabled: true,
                message: 'EssentialsX adapter initialized successfully',
                serverVersion: status.version
            };
        } catch (error) {
            console.error(`[EssentialsX] Initialization failed:`, error.message);
            throw new Error(`Failed to connect to EssentialsX: ${error.message}`);
        }
    }

    /**
     * Check health of EssentialsX integration
     * @returns {Promise<object>} Health status
     */
    async checkHealth() {
        if (!this.isReady()) {
            return {
                status: 'disabled',
                message: 'EssentialsX adapter is not enabled or initialized'
            };
        }

        try {
            const startTime = Date.now();
            await this.getServerStatus();
            const responseTime = Date.now() - startTime;

            return {
                status: 'healthy',
                message: 'EssentialsX is reachable',
                responseTime
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                message: error.message
            };
        }
    }

    /**
     * Get server status and basic information
     * @returns {Promise<object>} Server status
     */
    async getServerStatus() {
        // Check cache first
        if (this.serverInfoCache && this.cacheExpiry && Date.now() < this.cacheExpiry) {
            return this.serverInfoCache;
        }

        try {
            const response = await this.makeRequest('GET', '/v1/server', {}, { retries: 1 });
            const serverInfo = response.data;

            // Cache the result
            this.serverInfoCache = serverInfo;
            this.cacheExpiry = Date.now() + this.CACHE_TTL;

            return serverInfo;
        } catch (error) {
            console.error('[EssentialsX] Error fetching server status:', error.message);
            throw error;
        }
    }

    /**
     * Get list of all players with their information
     * @returns {Promise<Array>} Array of player objects
     */
    async getPlayers() {
        try {
            const response = await this.makeRequest('GET', '/v1/players', {}, { retries: 1 });
            
            if (!response.data || !Array.isArray(response.data)) {
                return [];
            }

            // Format player data
            const players = response.data.map(player => ({
                uuid: player.uuid,
                name: player.name,
                displayName: player.displayname || player.name,
                online: player.online || false,
                afk: player.afk || false,
                godMode: player.godmode || false,
                vanished: player.vanished || false,
                muted: player.muted || false,
                jailed: player.jailed || false,
                ipAddress: player.ipAddress,
                location: player.location ? {
                    world: player.location.world,
                    x: player.location.x,
                    y: player.location.y,
                    z: player.location.z,
                    yaw: player.location.yaw,
                    pitch: player.location.pitch
                } : null,
                balance: player.balance,
                lastSeen: player.lastseen
            }));

            return players;
        } catch (error) {
            console.error('[EssentialsX] Error fetching players:', error.message);
            throw error;
        }
    }

    /**
     * Get information about a specific player
     * @param {string} playerIdentifier - Player name or UUID
     * @returns {Promise<object>} Player information
     */
    async getPlayer(playerIdentifier) {
        try {
            const response = await this.makeRequest('GET', `/v1/players/${playerIdentifier}`, {}, { retries: 1 });
            
            const player = response.data;
            
            return {
                uuid: player.uuid,
                name: player.name,
                displayName: player.displayname || player.name,
                online: player.online || false,
                afk: player.afk || false,
                godMode: player.godmode || false,
                vanished: player.vanished || false,
                muted: player.muted || false,
                jailed: player.jailed || false,
                ipAddress: player.ipAddress,
                location: player.location ? {
                    world: player.location.world,
                    x: player.location.x,
                    y: player.location.y,
                    z: player.location.z,
                    yaw: player.location.yaw,
                    pitch: player.location.pitch
                } : null,
                balance: player.balance,
                lastSeen: player.lastseen,
                firstJoin: player.firstjoin
            };
        } catch (error) {
            if (error.message.includes('404')) {
                throw new Error(`Player not found: ${playerIdentifier}`);
            }
            console.error('[EssentialsX] Error fetching player:', error.message);
            throw error;
        }
    }

    /**
     * Get list of online players
     * @returns {Promise<Array>} Array of online player names
     */
    async getOnlinePlayers() {
        try {
            const players = await this.getPlayers();
            return players.filter(player => player.online);
        } catch (error) {
            console.error('[EssentialsX] Error fetching online players:', error.message);
            throw error;
        }
    }

    /**
     * Get player balance
     * @param {string} playerIdentifier - Player name or UUID
     * @returns {Promise<number>} Player balance
     */
    async getPlayerBalance(playerIdentifier) {
        try {
            const player = await this.getPlayer(playerIdentifier);
            return player.balance || 0;
        } catch (error) {
            console.error('[EssentialsX] Error fetching player balance:', error.message);
            throw error;
        }
    }

    /**
     * Get list of warps
     * @returns {Promise<Array>} Array of warp objects
     */
    async getWarps() {
        try {
            const response = await this.makeRequest('GET', '/v1/warps', {}, { retries: 1 });
            
            if (!response.data || !Array.isArray(response.data)) {
                return [];
            }

            return response.data;
        } catch (error) {
            console.error('[EssentialsX] Error fetching warps:', error.message);
            throw error;
        }
    }

    /**
     * Get list of kits
     * @returns {Promise<Array>} Array of kit names
     */
    async getKits() {
        try {
            const response = await this.makeRequest('GET', '/v1/kits', {}, { retries: 1 });
            
            if (!response.data || !Array.isArray(response.data)) {
                return [];
            }

            return response.data;
        } catch (error) {
            console.error('[EssentialsX] Error fetching kits:', error.message);
            throw error;
        }
    }

    /**
     * Clear the server info cache
     */
    clearCache() {
        this.serverInfoCache = null;
        this.cacheExpiry = null;
        console.log('[EssentialsX] Cache cleared');
    }

    /**
     * Shutdown the adapter
     */
    async shutdown() {
        this.clearCache();
        await super.shutdown();
    }
}

// Export singleton instance
module.exports = new EssentialsXAdapter();
