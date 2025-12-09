/**
 * Base Plugin Adapter
 * 
 * Abstract base class for all plugin integrations.
 * Provides common functionality and defines the interface that all adapters must implement.
 */

const axios = require('axios');

class BasePluginAdapter {
    constructor(pluginName) {
        if (!pluginName) {
            throw new Error('Plugin name is required');
        }
        
        this.pluginName = pluginName;
        this.config = {
            enabled: false,
            baseUrl: null,
            apiToken: null,
            timeout: 10000,
            retries: 3,
            retryDelay: 1000
        };
        this.initialized = false;
    }

    /**
     * Configure the adapter
     * @param {object} config - Configuration object
     */
    configure(config) {
        if (!config || typeof config !== 'object') {
            throw new Error('Configuration must be an object');
        }

        this.config = {
            ...this.config,
            ...config
        };

        // Validate required configuration
        if (this.config.enabled && !this.config.baseUrl) {
            throw new Error(`${this.pluginName}: baseUrl is required when enabled`);
        }

        console.log(`[${this.pluginName}] Configured:`, {
            enabled: this.config.enabled,
            baseUrl: this.config.baseUrl,
            hasToken: !!this.config.apiToken
        });
    }

    /**
     * Initialize the adapter
     * Must be implemented by subclasses
     * @returns {Promise<object>} Initialization result
     */
    async initialize() {
        if (!this.config.enabled) {
            console.log(`[${this.pluginName}] Adapter is disabled`);
            return { enabled: false, message: 'Adapter is disabled' };
        }

        this.initialized = true;
        return { enabled: true, message: 'Adapter initialized successfully' };
    }

    /**
     * Check if adapter is enabled and initialized
     * @returns {boolean}
     */
    isReady() {
        return this.config.enabled && this.initialized;
    }

    /**
     * Check health of the plugin integration
     * @returns {Promise<object>} Health status
     */
    async checkHealth() {
        if (!this.isReady()) {
            return {
                status: 'disabled',
                message: 'Adapter is not enabled or initialized'
            };
        }

        try {
            // Ping the base URL to check connectivity
            const response = await this.makeRequest('GET', '/', {}, { timeout: 5000 });
            return {
                status: 'healthy',
                message: 'Plugin is reachable',
                responseTime: response.responseTime
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                message: error.message
            };
        }
    }

    /**
     * Make an HTTP request to the plugin API
     * @param {string} method - HTTP method (GET, POST, etc.)
     * @param {string} endpoint - API endpoint path
     * @param {object} data - Request data (for POST/PUT)
     * @param {object} options - Additional axios options
     * @returns {Promise<object>} Response data
     */
    async makeRequest(method, endpoint, data = {}, options = {}) {
        if (!this.isReady()) {
            throw new Error(`${this.pluginName} adapter is not ready`);
        }

        const url = `${this.config.baseUrl}${endpoint}`;
        const startTime = Date.now();

        const requestConfig = {
            method,
            url,
            timeout: options.timeout || this.config.timeout,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add authentication if configured
        if (this.config.apiToken) {
            requestConfig.headers['Authorization'] = `Bearer ${this.config.apiToken}`;
        }

        // Add data for POST/PUT/PATCH requests
        if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
            requestConfig.data = data;
        } else if (Object.keys(data).length > 0) {
            requestConfig.params = data;
        }

        let lastError = null;
        const maxRetries = options.retries !== undefined ? options.retries : this.config.retries;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const response = await axios(requestConfig);
                const responseTime = Date.now() - startTime;

                return {
                    data: response.data,
                    status: response.status,
                    headers: response.headers,
                    responseTime
                };
            } catch (error) {
                lastError = error;

                // Don't retry on client errors (4xx)
                if (error.response && error.response.status >= 400 && error.response.status < 500) {
                    break;
                }

                // Wait before retrying
                if (attempt < maxRetries) {
                    const delay = options.retryDelay || this.config.retryDelay;
                    await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
                }
            }
        }

        // All retries failed
        const errorMessage = lastError.response 
            ? `HTTP ${lastError.response.status}: ${lastError.response.statusText}`
            : lastError.message;
        
        throw new Error(`${this.pluginName} API request failed: ${errorMessage}`);
    }

    /**
     * Validate API token for requests
     * @param {string} token - Token to validate
     * @returns {boolean}
     */
    validateToken(token) {
        if (!this.config.apiToken) {
            return true; // No token configured, allow all
        }

        return token === this.config.apiToken;
    }

    /**
     * Shutdown the adapter
     * Can be overridden by subclasses for cleanup
     */
    async shutdown() {
        console.log(`[${this.pluginName}] Shutting down adapter`);
        this.initialized = false;
    }

    /**
     * Format error for API responses
     * @param {Error} error - Error object
     * @returns {object} Formatted error
     */
    formatError(error) {
        return {
            error: true,
            plugin: this.pluginName,
            message: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = BasePluginAdapter;
