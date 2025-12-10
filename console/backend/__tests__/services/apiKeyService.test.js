/**
 * API Key Service Tests
 */

const apiKeyService = require('../../services/apiKeyService');
const database = require('../../services/database');
const fs = require('fs');
const path = require('path');

describe('ApiKeyService', () => {
    const testDbPath = path.join(__dirname, '../../data/test-api-keys.db');

    beforeEach(() => {
        // Use a test database
        database.dbPath = testDbPath;
        
        // Remove test database if it exists
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
        
        // Remove WAL files too
        ['-shm', '-wal'].forEach(ext => {
            const walFile = testDbPath + ext;
            if (fs.existsSync(walFile)) {
                fs.unlinkSync(walFile);
            }
        });

        // Initialize database
        database.initialize();
    });

    afterEach(() => {
        // Close database
        database.close();
        
        // Clean up test database
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
        
        // Clean up WAL files
        ['-shm', '-wal'].forEach(ext => {
            const walFile = testDbPath + ext;
            if (fs.existsSync(walFile)) {
                fs.unlinkSync(walFile);
            }
        });
    });

    describe('createApiKey', () => {
        it('should create an API key with valid data', () => {
            const keyData = {
                name: 'Test API Key',
                scopes: ['server:read', 'players:read'],
                created_by: 'testuser'
            };

            const result = apiKeyService.createApiKey(keyData);

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
            expect(result.name).toBe('Test API Key');
            expect(result.scopes).toEqual(['server:read', 'players:read']);
            expect(result.api_key).toBeDefined();
            expect(result.api_key.startsWith('mcs_')).toBe(true);
            expect(result.enabled).toBe(true);
        });

        it('should throw error if name is missing', () => {
            const keyData = {
                scopes: ['server:read'],
                created_by: 'testuser'
            };

            expect(() => apiKeyService.createApiKey(keyData)).toThrow('API key name is required');
        });

        it('should throw error if scopes are invalid', () => {
            const keyData = {
                name: 'Test Key',
                scopes: ['invalid:scope'],
                created_by: 'testuser'
            };

            expect(() => apiKeyService.createApiKey(keyData)).toThrow('Invalid scopes provided');
        });

        it('should throw error if created_by is missing', () => {
            const keyData = {
                name: 'Test Key',
                scopes: ['server:read']
            };

            expect(() => apiKeyService.createApiKey(keyData)).toThrow('Creator username is required');
        });

        it('should set custom rate limit', () => {
            const keyData = {
                name: 'Test Key',
                scopes: ['server:read'],
                rate_limit_per_hour: 500,
                created_by: 'testuser'
            };

            const result = apiKeyService.createApiKey(keyData);
            expect(result.rate_limit_per_hour).toBe(500);
        });
    });

    describe('validateApiKey', () => {
        it('should validate a valid API key', () => {
            const keyData = {
                name: 'Test Key',
                scopes: ['server:read'],
                created_by: 'testuser'
            };

            const created = apiKeyService.createApiKey(keyData);
            const validated = apiKeyService.validateApiKey(created.api_key);

            expect(validated).toBeDefined();
            expect(validated.id).toBe(created.id);
            expect(validated.name).toBe('Test Key');
        });

        it('should return null for invalid API key', () => {
            const result = apiKeyService.validateApiKey('mcs_invalid_key_123456789');
            expect(result).toBeNull();
        });

        it('should return null for disabled API key', () => {
            const keyData = {
                name: 'Test Key',
                scopes: ['server:read'],
                created_by: 'testuser'
            };

            const created = apiKeyService.createApiKey(keyData);
            
            // Disable the key
            apiKeyService.updateApiKey(created.id, { enabled: false });
            
            const validated = apiKeyService.validateApiKey(created.api_key);
            expect(validated).toBeNull();
        });

        it('should return null for expired API key', () => {
            const keyData = {
                name: 'Test Key',
                scopes: ['server:read'],
                created_by: 'testuser',
                expires_at: new Date(Date.now() - 1000).toISOString() // Expired 1 second ago
            };

            const created = apiKeyService.createApiKey(keyData);
            const validated = apiKeyService.validateApiKey(created.api_key);
            
            expect(validated).toBeNull();
        });

        it('should return null for non-mcs_ prefixed key', () => {
            const result = apiKeyService.validateApiKey('invalid_key_format');
            expect(result).toBeNull();
        });
    });

    describe('getApiKey', () => {
        it('should get API key by ID', () => {
            const keyData = {
                name: 'Test Key',
                scopes: ['server:read'],
                created_by: 'testuser'
            };

            const created = apiKeyService.createApiKey(keyData);
            const retrieved = apiKeyService.getApiKey(created.id);

            expect(retrieved).toBeDefined();
            expect(retrieved.id).toBe(created.id);
            expect(retrieved.name).toBe('Test Key');
        });

        it('should return null for non-existent key', () => {
            const result = apiKeyService.getApiKey('non-existent-id');
            expect(result).toBeNull();
        });

        it('should not return key_hash', () => {
            const keyData = {
                name: 'Test Key',
                scopes: ['server:read'],
                created_by: 'testuser'
            };

            const created = apiKeyService.createApiKey(keyData);
            const retrieved = apiKeyService.getApiKey(created.id);

            expect(retrieved.key_hash).toBeUndefined();
        });
    });

    describe('listApiKeys', () => {
        it('should list all API keys', () => {
            apiKeyService.createApiKey({
                name: 'Key 1',
                scopes: ['server:read'],
                created_by: 'testuser'
            });

            apiKeyService.createApiKey({
                name: 'Key 2',
                scopes: ['players:read'],
                created_by: 'testuser'
            });

            const keys = apiKeyService.listApiKeys();
            expect(keys).toHaveLength(2);
            expect(keys[0].name).toBeDefined();
            expect(keys[1].name).toBeDefined();
        });

        it('should not return key_hash in list', () => {
            apiKeyService.createApiKey({
                name: 'Key 1',
                scopes: ['server:read'],
                created_by: 'testuser'
            });

            const keys = apiKeyService.listApiKeys();
            expect(keys[0].key_hash).toBeUndefined();
        });
    });

    describe('updateApiKey', () => {
        it('should update API key name', () => {
            const keyData = {
                name: 'Original Name',
                scopes: ['server:read'],
                created_by: 'testuser'
            };

            const created = apiKeyService.createApiKey(keyData);
            const updated = apiKeyService.updateApiKey(created.id, { name: 'Updated Name' });

            expect(updated.name).toBe('Updated Name');
        });

        it('should update API key scopes', () => {
            const keyData = {
                name: 'Test Key',
                scopes: ['server:read'],
                created_by: 'testuser'
            };

            const created = apiKeyService.createApiKey(keyData);
            const updated = apiKeyService.updateApiKey(created.id, { 
                scopes: ['server:read', 'players:read'] 
            });

            expect(updated.scopes).toEqual(['server:read', 'players:read']);
        });

        it('should throw error for invalid scopes', () => {
            const keyData = {
                name: 'Test Key',
                scopes: ['server:read'],
                created_by: 'testuser'
            };

            const created = apiKeyService.createApiKey(keyData);
            
            expect(() => {
                apiKeyService.updateApiKey(created.id, { scopes: ['invalid:scope'] });
            }).toThrow('Invalid scopes provided');
        });

        it('should update enabled status', () => {
            const keyData = {
                name: 'Test Key',
                scopes: ['server:read'],
                created_by: 'testuser'
            };

            const created = apiKeyService.createApiKey(keyData);
            const updated = apiKeyService.updateApiKey(created.id, { enabled: false });

            expect(updated.enabled).toBe(false);
        });
    });

    describe('revokeApiKey', () => {
        it('should revoke (delete) an API key', () => {
            const keyData = {
                name: 'Test Key',
                scopes: ['server:read'],
                created_by: 'testuser'
            };

            const created = apiKeyService.createApiKey(keyData);
            const success = apiKeyService.revokeApiKey(created.id);

            expect(success).toBe(true);
            
            const retrieved = apiKeyService.getApiKey(created.id);
            expect(retrieved).toBeNull();
        });

        it('should return false for non-existent key', () => {
            const success = apiKeyService.revokeApiKey('non-existent-id');
            expect(success).toBe(false);
        });
    });

    describe('hasScope', () => {
        it('should return true for exact scope match', () => {
            const keyData = {
                scopes: ['server:read', 'players:read']
            };

            expect(apiKeyService.hasScope(keyData, 'server:read')).toBe(true);
        });

        it('should return false for missing scope', () => {
            const keyData = {
                scopes: ['server:read']
            };

            expect(apiKeyService.hasScope(keyData, 'players:read')).toBe(false);
        });

        it('should support wildcard scopes', () => {
            const keyData = {
                scopes: ['server:*']
            };

            expect(apiKeyService.hasScope(keyData, 'server:read')).toBe(true);
            expect(apiKeyService.hasScope(keyData, 'server:control')).toBe(true);
            expect(apiKeyService.hasScope(keyData, 'players:read')).toBe(false);
        });
    });

    describe('getAvailableScopes', () => {
        it('should return list of available scopes', () => {
            const scopes = apiKeyService.getAvailableScopes();
            
            expect(Array.isArray(scopes)).toBe(true);
            expect(scopes.length).toBeGreaterThan(0);
            expect(scopes[0]).toHaveProperty('scope');
            expect(scopes[0]).toHaveProperty('description');
        });
    });

    describe('usage tracking', () => {
        it('should update usage stats', () => {
            const keyData = {
                name: 'Test Key',
                scopes: ['server:read'],
                created_by: 'testuser'
            };

            const created = apiKeyService.createApiKey(keyData);
            
            apiKeyService.updateUsageStats(created.id);
            
            const updated = apiKeyService.getApiKey(created.id);
            expect(updated.use_count).toBe(1);
            expect(updated.last_used).toBeDefined();
        });

        it('should log API key usage', () => {
            const keyData = {
                name: 'Test Key',
                scopes: ['server:read'],
                created_by: 'testuser'
            };

            const created = apiKeyService.createApiKey(keyData);
            
            apiKeyService.logUsage({
                api_key_id: created.id,
                endpoint: '/api/server/status',
                method: 'GET',
                status_code: 200,
                ip_address: '127.0.0.1',
                user_agent: 'test-agent',
                response_time_ms: 50
            });
            
            const logs = apiKeyService.getUsageLogs(created.id);
            expect(logs).toHaveLength(1);
            expect(logs[0].endpoint).toBe('/api/server/status');
        });

        it('should get usage statistics', () => {
            const keyData = {
                name: 'Test Key',
                scopes: ['server:read'],
                created_by: 'testuser'
            };

            const created = apiKeyService.createApiKey(keyData);
            const now = new Date();
            const yesterday = new Date(now - 24 * 60 * 60 * 1000);
            
            // Log some usage
            apiKeyService.logUsage({
                api_key_id: created.id,
                endpoint: '/api/server/status',
                method: 'GET',
                status_code: 200,
                ip_address: '127.0.0.1',
                user_agent: 'test',
                response_time_ms: 50
            });
            
            const stats = apiKeyService.getUsageStats(
                created.id,
                yesterday.toISOString(),
                now.toISOString()
            );
            
            expect(stats.total_requests).toBe(1);
            expect(stats.successful_requests).toBe(1);
            expect(stats.failed_requests).toBe(0);
        });
    });
});
