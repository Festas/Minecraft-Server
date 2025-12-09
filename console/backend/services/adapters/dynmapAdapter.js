/**
 * Dynmap Plugin Adapter
 * 
 * Integration adapter for Dynmap - a dynamic web-based map for Minecraft servers.
 * Provides access to player locations, world data, and map information.
 * 
 * Dynmap API Documentation: https://github.com/webbukkit/dynmap/wiki/Web-API-Reference
 */

const BasePluginAdapter = require('./baseAdapter');

class DynmapAdapter extends BasePluginAdapter {
    constructor() {
        super('Dynmap');
        this.worldsCache = null;
        this.cacheExpiry = null;
        this.CACHE_TTL = 60000; // 1 minute cache
    }

    /**
     * Initialize the Dynmap adapter
     * @returns {Promise<object>} Initialization result
     */
    async initialize() {
        const baseResult = await super.initialize();
        if (!baseResult.enabled) {
            return baseResult;
        }

        try {
            // Test connection and cache initial world data
            const configuration = await this.getConfiguration();
            console.log(`[Dynmap] Connected to Dynmap server. Title: ${configuration.title || 'N/A'}`);
            
            return {
                enabled: true,
                message: 'Dynmap adapter initialized successfully',
                serverTitle: configuration.title
            };
        } catch (error) {
            console.error(`[Dynmap] Initialization failed:`, error.message);
            throw new Error(`Failed to connect to Dynmap: ${error.message}`);
        }
    }

    /**
     * Check health of Dynmap integration
     * @returns {Promise<object>} Health status
     */
    async checkHealth() {
        if (!this.isReady()) {
            return {
                status: 'disabled',
                message: 'Dynmap adapter is not enabled or initialized'
            };
        }

        try {
            const startTime = Date.now();
            await this.getConfiguration();
            const responseTime = Date.now() - startTime;

            return {
                status: 'healthy',
                message: 'Dynmap is reachable',
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
     * Get Dynmap configuration
     * @returns {Promise<object>} Dynmap configuration
     */
    async getConfiguration() {
        const response = await this.makeRequest('GET', '/up/configuration', {}, { retries: 1 });
        return response.data;
    }

    /**
     * Get current world data and player positions
     * @param {string} worldName - Optional world name to filter
     * @returns {Promise<object>} World and player data
     */
    async getWorldData(worldName = null) {
        const endpoint = worldName 
            ? `/up/world/${worldName}`
            : '/up/world/world'; // Default world

        const response = await this.makeRequest('GET', endpoint, {}, { retries: 1 });
        return response.data;
    }

    /**
     * Get list of all players currently online
     * @returns {Promise<Array>} Array of player objects
     */
    async getPlayers() {
        try {
            const worldData = await this.getWorldData();
            
            if (!worldData || !worldData.players) {
                return [];
            }

            // Extract player information
            const players = worldData.players.map(player => ({
                name: player.name || player.account,
                displayName: player.name,
                world: player.world,
                x: player.x,
                y: player.y,
                z: player.z,
                health: player.health,
                armor: player.armor,
                sort: player.sort
            }));

            return players;
        } catch (error) {
            console.error('[Dynmap] Error fetching players:', error.message);
            throw error;
        }
    }

    /**
     * Get information about all available worlds
     * Uses caching to reduce API calls
     * @returns {Promise<Array>} Array of world objects
     */
    async getWorlds() {
        // Return cached data if still valid
        if (this.worldsCache && this.cacheExpiry && Date.now() < this.cacheExpiry) {
            return this.worldsCache;
        }

        try {
            const config = await this.getConfiguration();
            
            if (!config || !config.worlds) {
                return [];
            }

            const worlds = config.worlds.map(world => ({
                name: world.name,
                title: world.title,
                center: world.center,
                maps: world.maps ? world.maps.map(map => ({
                    name: map.name,
                    title: map.title,
                    prefix: map.prefix,
                    type: map.type,
                    icon: map.icon
                })) : []
            }));

            // Cache the result
            this.worldsCache = worlds;
            this.cacheExpiry = Date.now() + this.CACHE_TTL;

            return worlds;
        } catch (error) {
            console.error('[Dynmap] Error fetching worlds:', error.message);
            throw error;
        }
    }

    /**
     * Get map tiles for a specific world and map
     * @param {string} worldName - World name
     * @param {string} mapName - Map name
     * @param {object} params - Tile parameters (zoom, x, y, etc.)
     * @returns {Promise<object>} Tile data
     */
    async getMapTile(worldName, mapName, params = {}) {
        const endpoint = `/tiles/${worldName}/${mapName}/${params.zoom || 0}/${params.x || 0}_${params.y || 0}.png`;
        
        try {
            const response = await this.makeRequest('GET', endpoint, params, { 
                retries: 0,
                responseType: 'arraybuffer'
            });
            return response;
        } catch (error) {
            console.error('[Dynmap] Error fetching map tile:', error.message);
            throw error;
        }
    }

    /**
     * Get markers for a specific world
     * @param {string} worldName - World name
     * @returns {Promise<object>} Marker data
     */
    async getMarkers(worldName = 'world') {
        const endpoint = `/tiles/_markers_/marker_${worldName}.json`;
        
        try {
            const response = await this.makeRequest('GET', endpoint, {}, { retries: 1 });
            return response.data;
        } catch (error) {
            console.error('[Dynmap] Error fetching markers:', error.message);
            throw error;
        }
    }

    /**
     * Clear the worlds cache
     */
    clearCache() {
        this.worldsCache = null;
        this.cacheExpiry = null;
        console.log('[Dynmap] Cache cleared');
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
module.exports = new DynmapAdapter();
