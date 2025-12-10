/**
 * API Key Service
 * 
 * Manages API keys for external integrations
 * Features:
 * - API key generation with secure random tokens
 * - Scope-based access control
 * - Rate limiting per key
 * - Usage tracking and analytics
 */

const crypto = require('crypto');
const database = require('./database');

/**
 * Generate a secure random API key
 * Uses crypto.randomBytes for cryptographically secure random generation
 * Format: mcs_<32 random bytes in hex> (total length: 68 characters)
 * Provides 256 bits of entropy for strong security
 * 
 * @returns {string} API key in format mcs_<64 hex characters>
 */
function generateApiKey() {
    const randomBytes = crypto.randomBytes(32);
    return `mcs_${randomBytes.toString('hex')}`;
}

/**
 * Hash an API key for secure storage
 * @param {string} apiKey - Plain API key
 * @returns {string} Hashed API key
 */
function hashApiKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Get key prefix for display (first 12 characters)
 * @param {string} apiKey - Plain API key
 * @returns {string} Key prefix
 */
function getKeyPrefix(apiKey) {
    return apiKey.substring(0, 12);
}

/**
 * Validate scopes
 * @param {Array} scopes - Array of scope strings
 * @returns {boolean} Valid
 */
function validateScopes(scopes) {
    if (!Array.isArray(scopes) || scopes.length === 0) {
        return false;
    }

    const validScopes = [
        'server:read',
        'server:control',
        'players:read',
        'players:manage',
        'plugins:read',
        'plugins:manage',
        'backups:read',
        'backups:manage',
        'analytics:read',
        'commands:execute',
        'files:read',
        'files:write',
        'webhooks:read',
        'webhooks:manage',
        'automation:read',
        'automation:manage'
    ];

    return scopes.every(scope => validScopes.includes(scope));
}

class ApiKeyService {
    /**
     * Create a new API key
     * @param {object} keyData - API key data
     * @param {string} keyData.name - Friendly name for the key
     * @param {Array<string>} keyData.scopes - Array of permission scopes
     * @param {number} keyData.rate_limit_per_hour - Rate limit (default: 1000)
     * @param {string} keyData.created_by - Username of creator
     * @param {string} keyData.expires_at - Expiration date (ISO format, optional)
     * @returns {object} Created API key with plain key (only returned once)
     */
    createApiKey(keyData) {
        // Validate input
        if (!keyData.name || typeof keyData.name !== 'string') {
            throw new Error('API key name is required');
        }

        if (!validateScopes(keyData.scopes)) {
            throw new Error('Invalid scopes provided');
        }

        if (!keyData.created_by) {
            throw new Error('Creator username is required');
        }

        // Generate API key
        const apiKey = generateApiKey();
        const keyHash = hashApiKey(apiKey);
        const keyPrefix = getKeyPrefix(apiKey);

        // Generate unique ID
        const id = crypto.randomBytes(16).toString('hex');

        // Store in database
        const storedKey = database.createApiKey({
            id,
            name: keyData.name,
            key_hash: keyHash,
            key_prefix: keyPrefix,
            scopes: keyData.scopes,
            rate_limit_per_hour: keyData.rate_limit_per_hour || 1000,
            enabled: true,
            created_by: keyData.created_by,
            expires_at: keyData.expires_at || null
        });

        // Return with plain API key (only time it's shown)
        return {
            ...storedKey,
            api_key: apiKey // Only returned on creation
        };
    }

    /**
     * Validate an API key
     * @param {string} apiKey - Plain API key to validate
     * @returns {object|null} API key data if valid, null otherwise
     */
    validateApiKey(apiKey) {
        if (!apiKey || !apiKey.startsWith('mcs_')) {
            return null;
        }

        const keyHash = hashApiKey(apiKey);
        const keyData = database.getApiKeyByHash(keyHash);

        if (!keyData) {
            return null;
        }

        // Check if key is enabled
        if (!keyData.enabled) {
            return null;
        }

        // Check if key has expired
        if (keyData.expires_at) {
            const expirationDate = new Date(keyData.expires_at);
            if (expirationDate < new Date()) {
                return null;
            }
        }

        return keyData;
    }

    /**
     * Get API key by ID (without hash)
     * @param {string} id - API key ID
     * @returns {object|null} API key data
     */
    getApiKey(id) {
        const key = database.getApiKey(id);
        if (!key) return null;

        // Remove sensitive data
        delete key.key_hash;
        return key;
    }

    /**
     * List all API keys (without hashes)
     * @returns {Array} List of API keys
     */
    listApiKeys() {
        const keys = database.getAllApiKeys();
        
        // Remove sensitive data
        return keys.map(key => {
            delete key.key_hash;
            return key;
        });
    }

    /**
     * Update API key
     * @param {string} id - API key ID
     * @param {object} updates - Fields to update
     * @returns {object|null} Updated API key
     */
    updateApiKey(id, updates) {
        // Validate scopes if provided
        if (updates.scopes && !validateScopes(updates.scopes)) {
            throw new Error('Invalid scopes provided');
        }

        const updated = database.updateApiKey(id, updates);
        if (!updated) return null;

        // Remove sensitive data
        delete updated.key_hash;
        return updated;
    }

    /**
     * Revoke (delete) an API key
     * @param {string} id - API key ID
     * @returns {boolean} Success
     */
    revokeApiKey(id) {
        return database.deleteApiKey(id);
    }

    /**
     * Update API key usage statistics
     * @param {string} id - API key ID
     */
    updateUsageStats(id) {
        database.updateApiKeyStats(id);
    }

    /**
     * Log API key usage
     * @param {object} logData - Usage log data
     */
    logUsage(logData) {
        database.logApiKeyUsage(logData);
    }

    /**
     * Get API key usage logs
     * @param {string} id - API key ID
     * @param {number} limit - Max number of logs
     * @returns {Array} Usage logs
     */
    getUsageLogs(id, limit = 100) {
        return database.getApiKeyLogs(id, limit);
    }

    /**
     * Get API key usage statistics
     * @param {string} id - API key ID
     * @param {string} startDate - Start date (ISO format)
     * @param {string} endDate - End date (ISO format)
     * @returns {object} Usage statistics
     */
    getUsageStats(id, startDate, endDate) {
        const stats = database.getApiKeyUsageStats(id, startDate, endDate);
        
        return {
            total_requests: stats.total_requests || 0,
            successful_requests: stats.successful_requests || 0,
            failed_requests: stats.failed_requests || 0,
            avg_response_time: Math.round(stats.avg_response_time || 0),
            max_response_time: stats.max_response_time || 0,
            success_rate: stats.total_requests > 0 
                ? Math.round((stats.successful_requests / stats.total_requests) * 100) 
                : 0
        };
    }

    /**
     * Check if an API key has a specific scope
     * @param {object} keyData - API key data
     * @param {string} scope - Scope to check
     * @returns {boolean} Has scope
     */
    hasScope(keyData, scope) {
        if (!keyData || !keyData.scopes) {
            return false;
        }

        // Check exact match
        if (keyData.scopes.includes(scope)) {
            return true;
        }

        // Check wildcard scopes (e.g., 'server:*' includes 'server:read')
        const scopeParts = scope.split(':');
        if (scopeParts.length === 2) {
            const wildcardScope = `${scopeParts[0]}:*`;
            return keyData.scopes.includes(wildcardScope);
        }

        return false;
    }

    /**
     * Get available scopes
     * @returns {Array} List of available scopes with descriptions
     */
    getAvailableScopes() {
        return [
            { scope: 'server:read', description: 'Read server status and information' },
            { scope: 'server:control', description: 'Start, stop, restart server' },
            { scope: 'players:read', description: 'View player information' },
            { scope: 'players:manage', description: 'Kick, ban, manage players' },
            { scope: 'plugins:read', description: 'View installed plugins' },
            { scope: 'plugins:manage', description: 'Install, update, remove plugins' },
            { scope: 'backups:read', description: 'View backup information' },
            { scope: 'backups:manage', description: 'Create, restore, delete backups' },
            { scope: 'analytics:read', description: 'View analytics and statistics' },
            { scope: 'commands:execute', description: 'Execute server commands' },
            { scope: 'files:read', description: 'Read server files' },
            { scope: 'files:write', description: 'Modify server files' },
            { scope: 'webhooks:read', description: 'View webhook configurations' },
            { scope: 'webhooks:manage', description: 'Create, update, delete webhooks' },
            { scope: 'automation:read', description: 'View automation tasks' },
            { scope: 'automation:manage', description: 'Create, update, delete automation tasks' }
        ];
    }
}

module.exports = new ApiKeyService();
