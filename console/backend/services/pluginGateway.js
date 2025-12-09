/**
 * Plugin Gateway Service
 * 
 * Provides a unified abstraction layer for integrating with Minecraft server plugins
 * via REST APIs and WebSockets. Manages plugin adapters, configuration, authentication,
 * and error handling.
 */

const { logAuditEvent, AUDIT_EVENTS } = require('./auditLog');

class PluginGateway {
    constructor() {
        this.adapters = new Map();
        this.config = new Map();
    }

    /**
     * Register a plugin adapter
     * @param {string} pluginName - Name of the plugin (e.g., 'dynmap', 'essentialsx')
     * @param {object} adapter - Plugin adapter instance
     */
    registerAdapter(pluginName, adapter) {
        if (!pluginName || typeof pluginName !== 'string') {
            throw new Error('Plugin name must be a non-empty string');
        }

        if (!adapter || typeof adapter.initialize !== 'function') {
            throw new Error('Adapter must have an initialize method');
        }

        this.adapters.set(pluginName.toLowerCase(), adapter);
        console.log(`[PluginGateway] Registered adapter: ${pluginName}`);
    }

    /**
     * Unregister a plugin adapter
     * @param {string} pluginName - Name of the plugin
     */
    unregisterAdapter(pluginName) {
        const adapter = this.adapters.get(pluginName.toLowerCase());
        if (adapter && typeof adapter.shutdown === 'function') {
            adapter.shutdown();
        }
        this.adapters.delete(pluginName.toLowerCase());
        console.log(`[PluginGateway] Unregistered adapter: ${pluginName}`);
    }

    /**
     * Get a registered adapter
     * @param {string} pluginName - Name of the plugin
     * @returns {object|null} The adapter instance or null if not found
     */
    getAdapter(pluginName) {
        return this.adapters.get(pluginName.toLowerCase()) || null;
    }

    /**
     * Configure a plugin with authentication and settings
     * @param {string} pluginName - Name of the plugin
     * @param {object} config - Configuration object
     */
    configure(pluginName, config) {
        if (!config || typeof config !== 'object') {
            throw new Error('Configuration must be an object');
        }

        this.config.set(pluginName.toLowerCase(), config);
        
        const adapter = this.getAdapter(pluginName);
        if (adapter && typeof adapter.configure === 'function') {
            adapter.configure(config);
        }
    }

    /**
     * Get configuration for a plugin
     * @param {string} pluginName - Name of the plugin
     * @returns {object|null} Configuration object or null
     */
    getConfig(pluginName) {
        return this.config.get(pluginName.toLowerCase()) || null;
    }

    /**
     * Initialize a plugin adapter
     * @param {string} pluginName - Name of the plugin
     * @returns {Promise<object>} Initialization result
     */
    async initialize(pluginName) {
        const adapter = this.getAdapter(pluginName);
        if (!adapter) {
            throw new Error(`Adapter not found for plugin: ${pluginName}`);
        }

        try {
            const result = await adapter.initialize();
            console.log(`[PluginGateway] Initialized ${pluginName}:`, result);
            return result;
        } catch (error) {
            console.error(`[PluginGateway] Failed to initialize ${pluginName}:`, error.message);
            
            // Log critical plugin errors
            await logAuditEvent(
                AUDIT_EVENTS.SYSTEM_ERROR,
                'system',
                { 
                    plugin: pluginName,
                    error: error.message,
                    action: 'initialize'
                }
            );
            
            throw error;
        }
    }

    /**
     * Call a method on a plugin adapter
     * @param {string} pluginName - Name of the plugin
     * @param {string} method - Method name to call
     * @param {object} params - Parameters to pass to the method
     * @returns {Promise<any>} Result from the adapter method
     */
    async call(pluginName, method, params = {}) {
        const adapter = this.getAdapter(pluginName);
        if (!adapter) {
            throw new Error(`Adapter not found for plugin: ${pluginName}`);
        }

        if (typeof adapter[method] !== 'function') {
            throw new Error(`Method '${method}' not found on ${pluginName} adapter`);
        }

        try {
            const result = await adapter[method](params);
            return result;
        } catch (error) {
            console.error(`[PluginGateway] Error calling ${pluginName}.${method}:`, error.message);
            
            // Log plugin call failures
            await logAuditEvent(
                AUDIT_EVENTS.SYSTEM_ERROR,
                'system',
                {
                    plugin: pluginName,
                    method,
                    error: error.message
                }
            );
            
            throw error;
        }
    }

    /**
     * Check health of a specific plugin adapter
     * @param {string} pluginName - Name of the plugin
     * @returns {Promise<object>} Health check result
     */
    async checkHealth(pluginName) {
        const adapter = this.getAdapter(pluginName);
        if (!adapter) {
            return {
                status: 'unknown',
                message: `Adapter not registered: ${pluginName}`
            };
        }

        if (typeof adapter.checkHealth !== 'function') {
            return {
                status: 'healthy',
                message: 'No health check implemented'
            };
        }

        try {
            const result = await adapter.checkHealth();
            return result;
        } catch (error) {
            return {
                status: 'unhealthy',
                message: error.message
            };
        }
    }

    /**
     * Check health of all registered plugin adapters
     * @returns {Promise<object>} Overall health status
     */
    async checkAllHealth() {
        const results = {};
        let overallHealthy = true;

        for (const [pluginName, adapter] of this.adapters) {
            try {
                results[pluginName] = await this.checkHealth(pluginName);
                if (results[pluginName].status !== 'healthy') {
                    overallHealthy = false;
                }
            } catch (error) {
                results[pluginName] = {
                    status: 'error',
                    message: error.message
                };
                overallHealthy = false;
            }
        }

        return {
            healthy: overallHealthy,
            adapters: results,
            count: this.adapters.size
        };
    }

    /**
     * Get list of all registered adapters
     * @returns {Array<string>} Array of plugin names
     */
    getRegisteredAdapters() {
        return Array.from(this.adapters.keys());
    }

    /**
     * Shutdown all adapters
     */
    async shutdown() {
        console.log('[PluginGateway] Shutting down all adapters...');
        
        for (const [pluginName, adapter] of this.adapters) {
            try {
                if (typeof adapter.shutdown === 'function') {
                    await adapter.shutdown();
                    console.log(`[PluginGateway] Shutdown ${pluginName}`);
                }
            } catch (error) {
                console.error(`[PluginGateway] Error shutting down ${pluginName}:`, error.message);
            }
        }
        
        this.adapters.clear();
        this.config.clear();
    }
}

// Singleton instance
const pluginGateway = new PluginGateway();

module.exports = pluginGateway;
