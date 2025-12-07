const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

// Mock paths for testing - must be set BEFORE requiring pluginManager
const TEST_DIR = path.join(__dirname, '../test-data');
const TEST_PLUGINS_DIR = path.join(TEST_DIR, 'plugins');
const TEST_PLUGINS_JSON = path.join(TEST_DIR, 'plugins.json');

// Override environment variables for testing
process.env.PLUGINS_DIR = TEST_PLUGINS_DIR;
process.env.PLUGINS_JSON = TEST_PLUGINS_JSON;

// Now require pluginManager after env vars are set
const pluginManager = require('../../services/pluginManager');

describe('Plugin Manager - Error Handling', () => {
    beforeEach(async () => {
        // Clean up test directory
        if (fsSync.existsSync(TEST_DIR)) {
            await fs.rm(TEST_DIR, { recursive: true, force: true });
        }
        await fs.mkdir(TEST_DIR, { recursive: true });
    });

    afterEach(async () => {
        // Clean up after each test
        if (fsSync.existsSync(TEST_DIR)) {
            try {
                // Reset permissions before cleanup
                const resetPerms = async (dir) => {
                    try {
                        const entries = await fs.readdir(dir, { withFileTypes: true });
                        for (const entry of entries) {
                            const fullPath = path.join(dir, entry.name);
                            if (entry.isDirectory()) {
                                await fs.chmod(fullPath, 0o755).catch(() => {});
                                await resetPerms(fullPath);
                            } else {
                                await fs.chmod(fullPath, 0o644).catch(() => {});
                            }
                        }
                        await fs.chmod(dir, 0o755).catch(() => {});
                    } catch (e) {
                        // Ignore errors during permission reset
                    }
                };
                
                await resetPerms(TEST_DIR).catch(() => {});
                await fs.rm(TEST_DIR, { recursive: true, force: true });
            } catch (e) {
                // Ignore cleanup errors - test directory is temporary
                console.warn('Cleanup warning:', e.message);
            }
        }
    });

    describe('getAllPlugins', () => {
        it('should return empty array when plugins.json does not exist', async () => {
            const plugins = await pluginManager.getAllPlugins();
            expect(plugins).toEqual([]);
        });

        it('should return empty array when plugins.json is empty', async () => {
            await fs.writeFile(TEST_PLUGINS_JSON, '', 'utf8');
            const plugins = await pluginManager.getAllPlugins();
            expect(plugins).toEqual([]);
        });

        it('should return empty array when plugins.json contains invalid JSON', async () => {
            await fs.writeFile(TEST_PLUGINS_JSON, '{invalid json', 'utf8');
            const plugins = await pluginManager.getAllPlugins();
            expect(plugins).toEqual([]);
        });

        it('should return empty array when plugins.json is missing plugins array', async () => {
            await fs.writeFile(TEST_PLUGINS_JSON, '{"other": "data"}', 'utf8');
            const plugins = await pluginManager.getAllPlugins();
            expect(plugins).toEqual([]);
        });

        it('should return plugins when plugins.json is valid', async () => {
            const testData = {
                plugins: [
                    { name: 'TestPlugin', enabled: true, category: 'test' }
                ]
            };
            await fs.writeFile(TEST_PLUGINS_JSON, JSON.stringify(testData), 'utf8');
            const plugins = await pluginManager.getAllPlugins();
            expect(plugins).toHaveLength(1);
            expect(plugins[0].name).toBe('TestPlugin');
        });

        it('should handle non-object JSON', async () => {
            await fs.writeFile(TEST_PLUGINS_JSON, '[]', 'utf8');
            const plugins = await pluginManager.getAllPlugins();
            expect(plugins).toEqual([]);
        });

        it('should handle whitespace-only file', async () => {
            await fs.writeFile(TEST_PLUGINS_JSON, '   \n\t  ', 'utf8');
            const plugins = await pluginManager.getAllPlugins();
            expect(plugins).toEqual([]);
        });
    });

    describe('checkHealth', () => {
        it('should return unhealthy when plugins.json does not exist', async () => {
            const health = await pluginManager.checkHealth();
            expect(health.healthy).toBe(false);
            expect(health.checks.pluginsJson.status).toBe('error');
            expect(health.checks.pluginsJson.message).toContain('not found');
        });

        it('should return unhealthy when plugins.json is empty', async () => {
            await fs.writeFile(TEST_PLUGINS_JSON, '', 'utf8');
            const health = await pluginManager.checkHealth();
            expect(health.healthy).toBe(false);
            expect(health.checks.pluginsJson.status).toBe('error');
            expect(health.checks.pluginsJson.message).toContain('empty');
        });

        it('should return unhealthy when plugins.json has invalid JSON', async () => {
            await fs.writeFile(TEST_PLUGINS_JSON, '{invalid', 'utf8');
            const health = await pluginManager.checkHealth();
            expect(health.healthy).toBe(false);
            expect(health.checks.pluginsJson.status).toBe('error');
            expect(health.checks.pluginsJson.message).toContain('parse error');
        });

        it('should return unhealthy when plugins directory does not exist', async () => {
            // Create valid plugins.json but no directory
            await fs.writeFile(TEST_PLUGINS_JSON, '{"plugins":[]}', 'utf8');
            const health = await pluginManager.checkHealth();
            expect(health.healthy).toBe(false);
            expect(health.checks.pluginsDir.status).toBe('error');
            expect(health.checks.pluginsDir.message).toContain('not found');
        });

        it('should return healthy when both plugins.json and directory are valid', async () => {
            await fs.mkdir(TEST_PLUGINS_DIR, { recursive: true });
            await fs.writeFile(TEST_PLUGINS_JSON, '{"plugins":[]}', 'utf8');
            const health = await pluginManager.checkHealth();
            expect(health.healthy).toBe(true);
            expect(health.checks.pluginsJson.status).toBe('ok');
            expect(health.checks.pluginsDir.status).toBe('ok');
        });

        it('should return unhealthy when plugins.json has invalid structure', async () => {
            await fs.mkdir(TEST_PLUGINS_DIR, { recursive: true });
            await fs.writeFile(TEST_PLUGINS_JSON, '{"plugins":"not-an-array"}', 'utf8');
            const health = await pluginManager.checkHealth();
            expect(health.healthy).toBe(false);
            expect(health.checks.pluginsJson.status).toBe('error');
            expect(health.checks.pluginsJson.message).toContain('invalid structure');
        });

        it('should detect non-writable directory', async () => {
            await fs.mkdir(TEST_PLUGINS_DIR, { recursive: true });
            await fs.writeFile(TEST_PLUGINS_JSON, '{"plugins":[]}', 'utf8');
            
            // Make directory read-only (Unix only)
            if (process.platform !== 'win32') {
                try {
                    await fs.chmod(TEST_PLUGINS_DIR, 0o444);
                    const health = await pluginManager.checkHealth();
                    expect(health.healthy).toBe(false);
                    expect(health.checks.pluginsDir.status).toBe('error');
                    expect(health.checks.pluginsDir.message).toContain('not writable');
                } finally {
                    // Restore permissions for cleanup
                    await fs.chmod(TEST_PLUGINS_DIR, 0o755).catch(() => {});
                }
            }
        });
    });

    describe('uninstallPlugin - error handling', () => {
        beforeEach(async () => {
            await fs.mkdir(TEST_PLUGINS_DIR, { recursive: true });
            await fs.writeFile(TEST_PLUGINS_JSON, JSON.stringify({
                plugins: [{ name: 'TestPlugin', enabled: true }]
            }), 'utf8');
        });

        it('should fail when plugin does not exist in plugins.json', async () => {
            await expect(
                pluginManager.uninstallPlugin('NonExistentPlugin')
            ).rejects.toThrow('Plugin not found');
        });
    });
});

