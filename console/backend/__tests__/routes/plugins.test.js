const request = require('supertest');
const express = require('express');
const pluginManager = require('../../services/pluginManager');

// Mock pluginManager before requiring routes
jest.mock('../../services/pluginManager');

// Mock the requireAuth middleware
jest.mock('../../auth/auth', () => ({
    requireAuth: (req, res, next) => {
        req.user = { username: 'testuser' };
        next();
    }
}));

// Now require the routes after mocks are set up
const pluginsRouter = require('../../routes/plugins');

// Create a test app
const app = express();
app.use(express.json());

// Add plugins router
app.use('/api/plugins', pluginsRouter);

describe('Plugins API Routes - Error Handling', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/plugins', () => {
        it('should return empty plugins array when getAllPlugins returns empty', async () => {
            pluginManager.getAllPlugins.mockResolvedValue([]);
            pluginManager.hasBackup.mockReturnValue(false);

            const response = await request(app)
                .get('/api/plugins');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('plugins');
            expect(response.body.plugins).toEqual([]);
        });

        it('should return plugins array with error field on exception', async () => {
            pluginManager.getAllPlugins.mockRejectedValue(new Error('Test error'));

            const response = await request(app)
                .get('/api/plugins');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('plugins');
            expect(response.body.plugins).toEqual([]);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toContain('Failed to load plugins');
        });

        it('should return plugins with backup status', async () => {
            const mockPlugins = [
                { name: 'Plugin1', enabled: true },
                { name: 'Plugin2', enabled: false }
            ];
            pluginManager.getAllPlugins.mockResolvedValue(mockPlugins);
            pluginManager.hasBackup.mockImplementation(name => name === 'Plugin1');

            const response = await request(app)
                .get('/api/plugins');

            expect(response.status).toBe(200);
            expect(response.body.plugins).toHaveLength(2);
            expect(response.body.plugins[0].hasBackup).toBe(true);
            expect(response.body.plugins[1].hasBackup).toBe(false);
        });
    });

    describe('GET /api/plugins/health', () => {
        it('should return 200 when healthy', async () => {
            const mockHealth = {
                healthy: true,
                checks: {
                    pluginsJson: { status: 'ok', message: 'Found 5 plugins' },
                    pluginsDir: { status: 'ok', message: 'Directory is writable' }
                }
            };
            pluginManager.checkHealth.mockResolvedValue(mockHealth);

            const response = await request(app)
                .get('/api/plugins/health');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('healthy');
            expect(response.body.checks).toEqual(mockHealth.checks);
        });

        it('should return 503 when unhealthy', async () => {
            const mockHealth = {
                healthy: false,
                checks: {
                    pluginsJson: { status: 'error', message: 'File not found' },
                    pluginsDir: { status: 'ok', message: 'Directory is writable' }
                }
            };
            pluginManager.checkHealth.mockResolvedValue(mockHealth);

            const response = await request(app)
                .get('/api/plugins/health');

            expect(response.status).toBe(503);
            expect(response.body.status).toBe('unhealthy');
            expect(response.body.checks).toEqual(mockHealth.checks);
        });

        it('should return 500 on exception', async () => {
            pluginManager.checkHealth.mockRejectedValue(new Error('Health check failed'));

            const response = await request(app)
                .get('/api/plugins/health');

            expect(response.status).toBe(500);
            expect(response.body.status).toBe('error');
            expect(response.body.error).toContain('Health check failed');
        });
    });

    describe('POST /api/plugins/install', () => {
        it('should return 400 when URL is missing', async () => {
            const response = await request(app)
                .post('/api/plugins/install')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        it('should handle installation errors gracefully', async () => {
            pluginManager.installFromUrl.mockRejectedValue(
                new Error('Plugins directory not accessible or not writable')
            );

            const response = await request(app)
                .post('/api/plugins/install')
                .send({ url: 'http://example.com/test.jar' });

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBeTruthy();
        });

        it('should return status "installed" on successful installation', async () => {
            pluginManager.installFromUrl.mockResolvedValue({
                status: 'installed',
                pluginName: 'TestPlugin',
                version: '1.0.0',
                metadata: { name: 'TestPlugin', version: '1.0.0' }
            });

            const response = await request(app)
                .post('/api/plugins/install')
                .send({ url: 'http://example.com/test.jar' });

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('installed');
            expect(response.body.pluginName).toBe('TestPlugin');
            expect(response.body.version).toBe('1.0.0');
        });

        it('should return status "conflict" when plugin already exists', async () => {
            pluginManager.installFromUrl.mockResolvedValue({
                status: 'conflict',
                pluginName: 'ExistingPlugin',
                currentVersion: '1.0.0',
                newVersion: '1.1.0',
                comparison: 'upgrade',
                metadata: { name: 'ExistingPlugin', version: '1.1.0' }
            });

            const response = await request(app)
                .post('/api/plugins/install')
                .send({ url: 'http://example.com/existing-plugin.jar' });

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('conflict');
            expect(response.body.pluginName).toBe('ExistingPlugin');
            expect(response.body.comparison).toBe('upgrade');
        });

        it('should return status "multiple-options" when multiple JARs are available', async () => {
            pluginManager.installFromUrl.mockResolvedValue({
                status: 'multiple-options',
                options: [
                    { downloadUrl: 'http://example.com/plugin-1.jar', filename: 'plugin-1.jar', size: 1024 },
                    { downloadUrl: 'http://example.com/plugin-2.jar', filename: 'plugin-2.jar', size: 2048 }
                ]
            });

            const response = await request(app)
                .post('/api/plugins/install')
                .send({ url: 'http://example.com/plugin-release' });

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('multiple-options');
            expect(response.body.options).toHaveLength(2);
        });

        it('should accept customName parameter', async () => {
            pluginManager.installFromUrl.mockResolvedValue({
                status: 'installed',
                pluginName: 'CustomPluginName',
                version: '1.0.0',
                metadata: { name: 'OriginalName', version: '1.0.0' }
            });

            const response = await request(app)
                .post('/api/plugins/install')
                .send({ url: 'http://example.com/test.jar', customName: 'CustomPluginName' });

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('installed');
            expect(pluginManager.installFromUrl).toHaveBeenCalledWith(
                'http://example.com/test.jar',
                'CustomPluginName',
                expect.any(Function)
            );
        });

        it('should accept selectedOption parameter for multi-jar releases', async () => {
            pluginManager.installFromUrl.mockResolvedValue({
                status: 'installed',
                pluginName: 'TestPlugin',
                version: '1.0.0',
                metadata: { name: 'TestPlugin', version: '1.0.0' }
            });

            const response = await request(app)
                .post('/api/plugins/install')
                .send({ 
                    url: 'http://example.com/release',
                    selectedOption: 'http://example.com/specific.jar'
                });

            expect(response.status).toBe(200);
            expect(pluginManager.installFromUrl).toHaveBeenCalledWith(
                'http://example.com/specific.jar',
                undefined,
                expect.any(Function)
            );
        });
    });

    describe('POST /api/plugins/uninstall', () => {
        it('should return 400 when plugin name is missing', async () => {
            const response = await request(app)
                .post('/api/plugins/uninstall')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        it('should handle uninstall errors gracefully', async () => {
            pluginManager.uninstallPlugin.mockRejectedValue(
                new Error('Plugin not found')
            );

            const response = await request(app)
                .post('/api/plugins/uninstall')
                .send({ pluginName: 'TestPlugin' });

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBeTruthy();
        });
    });

    describe('POST /api/plugins/toggle', () => {
        it('should return 400 when plugin name is missing', async () => {
            const response = await request(app)
                .post('/api/plugins/toggle')
                .send({ enabled: true });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        it('should return 400 when enabled is not a boolean', async () => {
            const response = await request(app)
                .post('/api/plugins/toggle')
                .send({ pluginName: 'Test', enabled: 'yes' });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('POST /api/plugins/rollback', () => {
        it('should return 400 when plugin name is missing', async () => {
            const response = await request(app)
                .post('/api/plugins/rollback')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        it('should handle rollback errors gracefully', async () => {
            pluginManager.rollbackPlugin.mockRejectedValue(
                new Error('No backup available for this plugin')
            );

            const response = await request(app)
                .post('/api/plugins/rollback')
                .send({ pluginName: 'TestPlugin' });

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBeTruthy();
        });
    });
});
