const pluginGateway = require('../../services/pluginGateway');
const { logAuditEvent } = require('../../services/auditLog');

// Mock audit logging
jest.mock('../../services/auditLog', () => ({
    logAuditEvent: jest.fn(),
    AUDIT_EVENTS: {
        SYSTEM_ERROR: 'system_error',
        API_ACCESS: 'api_access'
    }
}));

describe('PluginGateway', () => {
    let mockAdapter;

    beforeEach(() => {
        // Create a fresh mock adapter for each test
        mockAdapter = {
            initialize: jest.fn().mockResolvedValue({ success: true }),
            configure: jest.fn(),
            shutdown: jest.fn(),
            checkHealth: jest.fn().mockResolvedValue({ status: 'healthy', message: 'OK' }),
            testMethod: jest.fn().mockResolvedValue({ data: 'test result' })
        };

        // Clear all adapters before each test
        const adapters = pluginGateway.getRegisteredAdapters();
        adapters.forEach(name => pluginGateway.unregisterAdapter(name));

        jest.clearAllMocks();
    });

    describe('registerAdapter', () => {
        it('should register an adapter successfully', () => {
            pluginGateway.registerAdapter('testplugin', mockAdapter);
            
            const adapter = pluginGateway.getAdapter('testplugin');
            expect(adapter).toBe(mockAdapter);
        });

        it('should normalize adapter names to lowercase', () => {
            pluginGateway.registerAdapter('TestPlugin', mockAdapter);
            
            const adapter = pluginGateway.getAdapter('testplugin');
            expect(adapter).toBe(mockAdapter);
        });

        it('should throw error if plugin name is invalid', () => {
            expect(() => {
                pluginGateway.registerAdapter('', mockAdapter);
            }).toThrow('Plugin name must be a non-empty string');

            expect(() => {
                pluginGateway.registerAdapter(null, mockAdapter);
            }).toThrow('Plugin name must be a non-empty string');
        });

        it('should throw error if adapter is invalid', () => {
            expect(() => {
                pluginGateway.registerAdapter('testplugin', {});
            }).toThrow('Adapter must have an initialize method');

            expect(() => {
                pluginGateway.registerAdapter('testplugin', null);
            }).toThrow('Adapter must have an initialize method');
        });

        it('should allow overwriting existing adapter', () => {
            const adapter1 = { ...mockAdapter };
            const adapter2 = { ...mockAdapter, initialize: jest.fn() };

            pluginGateway.registerAdapter('testplugin', adapter1);
            pluginGateway.registerAdapter('testplugin', adapter2);

            const result = pluginGateway.getAdapter('testplugin');
            expect(result).toBe(adapter2);
        });
    });

    describe('unregisterAdapter', () => {
        it('should unregister an adapter', () => {
            pluginGateway.registerAdapter('testplugin', mockAdapter);
            pluginGateway.unregisterAdapter('testplugin');
            
            const adapter = pluginGateway.getAdapter('testplugin');
            expect(adapter).toBeNull();
        });

        it('should call adapter shutdown if available', () => {
            pluginGateway.registerAdapter('testplugin', mockAdapter);
            pluginGateway.unregisterAdapter('testplugin');
            
            expect(mockAdapter.shutdown).toHaveBeenCalled();
        });

        it('should handle unregistering non-existent adapter gracefully', () => {
            expect(() => {
                pluginGateway.unregisterAdapter('nonexistent');
            }).not.toThrow();
        });
    });

    describe('getAdapter', () => {
        it('should return registered adapter', () => {
            pluginGateway.registerAdapter('testplugin', mockAdapter);
            
            const adapter = pluginGateway.getAdapter('testplugin');
            expect(adapter).toBe(mockAdapter);
        });

        it('should return null for non-existent adapter', () => {
            const adapter = pluginGateway.getAdapter('nonexistent');
            expect(adapter).toBeNull();
        });

        it('should be case-insensitive', () => {
            pluginGateway.registerAdapter('TestPlugin', mockAdapter);
            
            const adapter = pluginGateway.getAdapter('testplugin');
            expect(adapter).toBe(mockAdapter);
        });
    });

    describe('configure', () => {
        beforeEach(() => {
            pluginGateway.registerAdapter('testplugin', mockAdapter);
        });

        it('should configure an adapter', () => {
            const config = { enabled: true, baseUrl: 'http://test' };
            pluginGateway.configure('testplugin', config);
            
            expect(mockAdapter.configure).toHaveBeenCalledWith(config);
        });

        it('should store configuration', () => {
            const config = { enabled: true, baseUrl: 'http://test' };
            pluginGateway.configure('testplugin', config);
            
            const storedConfig = pluginGateway.getConfig('testplugin');
            expect(storedConfig).toEqual(config);
        });

        it('should throw error for invalid config', () => {
            expect(() => {
                pluginGateway.configure('testplugin', null);
            }).toThrow('Configuration must be an object');

            expect(() => {
                pluginGateway.configure('testplugin', 'invalid');
            }).toThrow('Configuration must be an object');
        });

        it('should work even if adapter is not registered', () => {
            const config = { enabled: true };
            expect(() => {
                pluginGateway.configure('nonexistent', config);
            }).not.toThrow();
        });
    });

    describe('getConfig', () => {
        it('should return stored configuration', () => {
            pluginGateway.registerAdapter('testplugin', mockAdapter);
            const config = { enabled: true, baseUrl: 'http://test' };
            pluginGateway.configure('testplugin', config);
            
            const result = pluginGateway.getConfig('testplugin');
            expect(result).toEqual(config);
        });

        it('should return null for non-configured adapter', () => {
            const result = pluginGateway.getConfig('nonexistent');
            expect(result).toBeNull();
        });
    });

    describe('initialize', () => {
        beforeEach(() => {
            pluginGateway.registerAdapter('testplugin', mockAdapter);
        });

        it('should initialize an adapter', async () => {
            const result = await pluginGateway.initialize('testplugin');
            
            expect(mockAdapter.initialize).toHaveBeenCalled();
            expect(result).toEqual({ success: true });
        });

        it('should throw error if adapter not found', async () => {
            await expect(pluginGateway.initialize('nonexistent')).rejects.toThrow(
                'Adapter not found for plugin: nonexistent'
            );
        });

        it('should log audit event on error', async () => {
            mockAdapter.initialize.mockRejectedValue(new Error('Connection failed'));
            
            await expect(pluginGateway.initialize('testplugin')).rejects.toThrow('Connection failed');
            
            expect(logAuditEvent).toHaveBeenCalledWith(
                'system_error',
                'system',
                expect.objectContaining({
                    plugin: 'testplugin',
                    error: 'Connection failed'
                })
            );
        });
    });

    describe('call', () => {
        beforeEach(() => {
            pluginGateway.registerAdapter('testplugin', mockAdapter);
        });

        it('should call adapter method successfully', async () => {
            const result = await pluginGateway.call('testplugin', 'testMethod', { param: 'value' });
            
            expect(mockAdapter.testMethod).toHaveBeenCalledWith({ param: 'value' });
            expect(result).toEqual({ data: 'test result' });
        });

        it('should throw error if adapter not found', async () => {
            await expect(
                pluginGateway.call('nonexistent', 'testMethod')
            ).rejects.toThrow('Adapter not found for plugin: nonexistent');
        });

        it('should throw error if method not found', async () => {
            await expect(
                pluginGateway.call('testplugin', 'nonexistentMethod')
            ).rejects.toThrow("Method 'nonexistentMethod' not found on testplugin adapter");
        });

        it('should log audit event on error', async () => {
            mockAdapter.testMethod.mockRejectedValue(new Error('Method failed'));
            
            await expect(
                pluginGateway.call('testplugin', 'testMethod')
            ).rejects.toThrow('Method failed');
            
            expect(logAuditEvent).toHaveBeenCalledWith(
                'system_error',
                'system',
                expect.objectContaining({
                    plugin: 'testplugin',
                    method: 'testMethod',
                    error: 'Method failed'
                })
            );
        });

        it('should pass empty params by default', async () => {
            await pluginGateway.call('testplugin', 'testMethod');
            
            expect(mockAdapter.testMethod).toHaveBeenCalledWith({});
        });
    });

    describe('checkHealth', () => {
        beforeEach(() => {
            pluginGateway.registerAdapter('testplugin', mockAdapter);
        });

        it('should return health status for registered adapter', async () => {
            const health = await pluginGateway.checkHealth('testplugin');
            
            expect(mockAdapter.checkHealth).toHaveBeenCalled();
            expect(health).toEqual({ status: 'healthy', message: 'OK' });
        });

        it('should return unknown status for non-existent adapter', async () => {
            const health = await pluginGateway.checkHealth('nonexistent');
            
            expect(health).toEqual({
                status: 'unknown',
                message: 'Adapter not registered: nonexistent'
            });
        });

        it('should return healthy if no health check implemented', async () => {
            delete mockAdapter.checkHealth;
            
            const health = await pluginGateway.checkHealth('testplugin');
            
            expect(health).toEqual({
                status: 'healthy',
                message: 'No health check implemented'
            });
        });

        it('should return unhealthy on error', async () => {
            mockAdapter.checkHealth.mockRejectedValue(new Error('Health check failed'));
            
            const health = await pluginGateway.checkHealth('testplugin');
            
            expect(health).toEqual({
                status: 'unhealthy',
                message: 'Health check failed'
            });
        });
    });

    describe('checkAllHealth', () => {
        it('should check health of all registered adapters', async () => {
            const adapter1 = { ...mockAdapter };
            const adapter2 = { 
                ...mockAdapter,
                checkHealth: jest.fn().mockResolvedValue({ status: 'unhealthy', message: 'Failed' })
            };

            pluginGateway.registerAdapter('plugin1', adapter1);
            pluginGateway.registerAdapter('plugin2', adapter2);

            const result = await pluginGateway.checkAllHealth();

            expect(result.healthy).toBe(false);
            expect(result.count).toBe(2);
            expect(result.adapters.plugin1).toEqual({ status: 'healthy', message: 'OK' });
            expect(result.adapters.plugin2).toEqual({ status: 'unhealthy', message: 'Failed' });
        });

        it('should return healthy true if all adapters are healthy', async () => {
            pluginGateway.registerAdapter('plugin1', mockAdapter);
            pluginGateway.registerAdapter('plugin2', mockAdapter);

            const result = await pluginGateway.checkAllHealth();

            expect(result.healthy).toBe(true);
        });

        it('should return empty result if no adapters registered', async () => {
            const result = await pluginGateway.checkAllHealth();

            expect(result.healthy).toBe(true);
            expect(result.count).toBe(0);
            expect(result.adapters).toEqual({});
        });

        it('should handle errors gracefully', async () => {
            mockAdapter.checkHealth.mockRejectedValue(new Error('Health check error'));
            pluginGateway.registerAdapter('testplugin', mockAdapter);

            const result = await pluginGateway.checkAllHealth();

            expect(result.healthy).toBe(false);
            expect(result.adapters.testplugin).toEqual({
                status: 'unhealthy',
                message: 'Health check error'
            });
        });
    });

    describe('getRegisteredAdapters', () => {
        it('should return list of registered adapter names', () => {
            pluginGateway.registerAdapter('plugin1', mockAdapter);
            pluginGateway.registerAdapter('plugin2', mockAdapter);

            const adapters = pluginGateway.getRegisteredAdapters();

            expect(adapters).toEqual(['plugin1', 'plugin2']);
        });

        it('should return empty array if no adapters registered', () => {
            const adapters = pluginGateway.getRegisteredAdapters();

            expect(adapters).toEqual([]);
        });
    });

    describe('shutdown', () => {
        it('should shutdown all adapters', async () => {
            const adapter1 = { ...mockAdapter };
            const adapter2 = { ...mockAdapter, shutdown: jest.fn() };

            pluginGateway.registerAdapter('plugin1', adapter1);
            pluginGateway.registerAdapter('plugin2', adapter2);

            await pluginGateway.shutdown();

            expect(adapter1.shutdown).toHaveBeenCalled();
            expect(adapter2.shutdown).toHaveBeenCalled();
        });

        it('should clear all adapters and configs', async () => {
            pluginGateway.registerAdapter('testplugin', mockAdapter);
            pluginGateway.configure('testplugin', { enabled: true });

            await pluginGateway.shutdown();

            expect(pluginGateway.getRegisteredAdapters()).toEqual([]);
            expect(pluginGateway.getConfig('testplugin')).toBeNull();
        });

        it('should handle errors during shutdown', async () => {
            mockAdapter.shutdown.mockRejectedValue(new Error('Shutdown failed'));
            pluginGateway.registerAdapter('testplugin', mockAdapter);

            await expect(pluginGateway.shutdown()).resolves.not.toThrow();
        });

        it('should work if adapters have no shutdown method', async () => {
            delete mockAdapter.shutdown;
            pluginGateway.registerAdapter('testplugin', mockAdapter);

            await expect(pluginGateway.shutdown()).resolves.not.toThrow();
        });
    });
});
