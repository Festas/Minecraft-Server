const axios = require('axios');

/**
 * Mojang API Service
 * Fetches player UUIDs from Mojang API
 * 
 * API Documentation: https://wiki.vg/Mojang_API
 */
class MojangService {
    constructor() {
        this.cache = new Map(); // username -> { uuid, timestamp }
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Get UUID for a player username
     * @param {string} username - Player username
     * @returns {Promise<string|null>} UUID or null if not found
     */
    async getUuid(username) {
        // Check cache first
        const cached = this.cache.get(username.toLowerCase());
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.uuid;
        }

        try {
            // Query Mojang API
            const response = await axios.get(
                `https://api.mojang.com/users/profiles/minecraft/${username}`,
                { timeout: 5000 }
            );

            if (response.data && response.data.id) {
                // Format UUID with dashes
                const uuid = this.formatUuid(response.data.id);
                
                // Cache the result
                this.cache.set(username.toLowerCase(), {
                    uuid,
                    timestamp: Date.now()
                });

                return uuid;
            }

            return null;
        } catch (error) {
            if (error.response && error.response.status === 404) {
                console.warn(`Player ${username} not found in Mojang API`);
                return null;
            }
            
            console.error(`Error fetching UUID for ${username}:`, error.message);
            // On error, generate a fallback UUID based on username
            // This ensures we can still track players even if API is down
            return this.generateFallbackUuid(username);
        }
    }

    /**
     * Format UUID string with dashes
     * @param {string} uuidWithoutDashes - UUID without dashes (32 chars)
     * @returns {string} UUID with dashes
     */
    formatUuid(uuidWithoutDashes) {
        if (uuidWithoutDashes.includes('-')) {
            return uuidWithoutDashes;
        }

        return [
            uuidWithoutDashes.substring(0, 8),
            uuidWithoutDashes.substring(8, 12),
            uuidWithoutDashes.substring(12, 16),
            uuidWithoutDashes.substring(16, 20),
            uuidWithoutDashes.substring(20, 32)
        ].join('-');
    }

    /**
     * Generate a deterministic fallback UUID for a username
     * Used when Mojang API is unavailable
     * @param {string} username - Player username
     * @returns {string} Fallback UUID
     */
    generateFallbackUuid(username) {
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(username.toLowerCase()).digest('hex');
        
        // Create a valid UUID v4 format from hash
        return [
            hash.substring(0, 8),
            hash.substring(8, 12),
            '4' + hash.substring(12, 15), // Version 4 UUID (13th character must be '4')
            hash.substring(16, 20),
            hash.substring(20, 32)
        ].join('-');
    }

    /**
     * Clear the UUID cache
     */
    clearCache() {
        this.cache.clear();
    }
}

module.exports = new MojangService();
