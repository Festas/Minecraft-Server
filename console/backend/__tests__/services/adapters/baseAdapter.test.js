const BasePluginAdapter = require('../../../services/adapters/baseAdapter');
const axios = require('axios');

// Mock axios
jest.mock('axios');

describe('BasePluginAdapter', () => {
    let adapter;

    beforeEach(() => {
        adapter = new BasePluginAdapter('TestPlugin');
        jest.clearAllMocks();
    });

    describe('constructor', () => {
        it('should create adapter with plugin name', () => {
            expect(adapter.pluginName).toBe('TestPlugin');
            expect(adapter.initialized).toBe(false);
        });

        it('should set default configuration', () => {
            expect(adapter.config).toEqual({
                enabled: false,
                baseUrl: null,
                apiToken: null,
                timeout: 10000,
                retries: 3,
                retryDelay: 1000
            });
        });

        it('should throw error if no plugin name provided', () => {
            expect(() => new BasePluginAdapter()).toThrow('Plugin name is required');
            expect(() => new BasePluginAdapter('')).toThrow('Plugin name is required');
        });
    });

    describe('configure', () => {
        it('should update configuration', () => {
            adapter.configure({
                enabled: true,
                baseUrl: 'http://localhost:8080',
                apiToken: 'test-token'
            });

            expect(adapter.config.enabled).toBe(true);
            expect(adapter.config.baseUrl).toBe('http://localhost:8080');
            expect(adapter.config.apiToken).toBe('test-token');
        });

        it('should throw error if enabled without baseUrl', () => {
            expect(() => {
                adapter.configure({ enabled: true });
            }).toThrow('baseUrl is required when enabled');
        });

        it('should throw error for invalid config', () => {
            expect(() => adapter.configure(null)).toThrow('Configuration must be an object');
            expect(() => adapter.configure('invalid')).toThrow('Configuration must be an object');
        });
    });

    describe('initialize', () => {
        it('should initialize when enabled', async () => {
            adapter.configure({
                enabled: true,
                baseUrl: 'http://localhost:8080'
            });

            const result = await adapter.initialize();

            expect(result.enabled).toBe(true);
            expect(adapter.initialized).toBe(true);
        });

        it('should not initialize when disabled', async () => {
            adapter.configure({ enabled: false });

            const result = await adapter.initialize();

            expect(result.enabled).toBe(false);
            expect(adapter.initialized).toBe(false);
        });
    });

    describe('makeRequest', () => {
        beforeEach(async () => {
            adapter.configure({
                enabled: true,
                baseUrl: 'http://localhost:8080'
            });
            await adapter.initialize();
        });

        it('should make successful GET request', async () => {
            const mockResponse = {
                data: { result: 'success' },
                status: 200,
                headers: {}
            };
            axios.mockResolvedValue(mockResponse);

            const result = await adapter.makeRequest('GET', '/test');

            expect(result.data).toEqual({ result: 'success' });
            expect(result.status).toBe(200);
        });

        it('should throw error if adapter not ready', async () => {
            adapter.initialized = false;

            await expect(adapter.makeRequest('GET', '/test')).rejects.toThrow(
                'TestPlugin adapter is not ready'
            );
        });

        it('should retry on network error', async () => {
            const error = new Error('Network error');
            axios
                .mockRejectedValueOnce(error)
                .mockRejectedValueOnce(error)
                .mockResolvedValueOnce({ data: {}, status: 200, headers: {} });

            const result = await adapter.makeRequest('GET', '/test');

            expect(axios).toHaveBeenCalledTimes(3);
            expect(result.status).toBe(200);
        });
    });
});
