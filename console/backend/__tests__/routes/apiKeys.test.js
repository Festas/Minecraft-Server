/**
 * API Key Routes Tests
 */

const request = require('supertest');
const express = require('express');

// Mock the services before requiring routes
jest.mock('../../services/apiKeyService');
const apiKeyService = require('../../services/apiKeyService');

// Mock the requireAuth middleware
jest.mock('../../auth/auth', () => ({
    requireAuth: (req, res, next) => {
        req.session = { username: 'testuser', role: 'admin', authenticated: true };
        next();
    }
}));

// Mock the RBAC middleware
jest.mock('../../middleware/rbac', () => ({
    requirePermission: (_permission) => (req, res, next) => next()
}));

// Now require the routes after mocks are set up
const apiKeyRoutes = require('../../routes/apiKeys');

// Create a test app
const app = express();
app.use(express.json());
app.use('/api/api-keys', apiKeyRoutes);

describe('API Key Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/api-keys', () => {
        it('should return list of API keys', async () => {
            const mockKeys = [
                {
                    id: 'key-1',
                    name: 'Test Key 1',
                    key_prefix: 'mcs_abc123',
                    scopes: ['server:read'],
                    rate_limit_per_hour: 1000,
                    enabled: true,
                    created_by: 'admin'
                }
            ];

            apiKeyService.listApiKeys.mockReturnValue(mockKeys);

            const response = await request(app)
                .get('/api/api-keys');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.api_keys).toHaveLength(1);
            expect(response.body.api_keys[0].name).toBe('Test Key 1');
        });
    });

    describe('GET /api/api-keys/scopes', () => {
        it('should return available scopes', async () => {
            const mockScopes = [
                { scope: 'server:read', description: 'Read server status' },
                { scope: 'server:control', description: 'Control server' }
            ];

            apiKeyService.getAvailableScopes.mockReturnValue(mockScopes);

            const response = await request(app)
                .get('/api/api-keys/scopes');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.scopes).toHaveLength(2);
        });
    });

    describe('GET /api/api-keys/:id', () => {
        it('should return specific API key', async () => {
            const mockKey = {
                id: 'key-1',
                name: 'Test Key',
                scopes: ['server:read'],
                enabled: true
            };

            apiKeyService.getApiKey.mockReturnValue(mockKey);

            const response = await request(app)
                .get('/api/api-keys/key-1');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.api_key.name).toBe('Test Key');
        });

        it('should return 404 for non-existent key', async () => {
            apiKeyService.getApiKey.mockReturnValue(null);

            const response = await request(app)
                .get('/api/api-keys/non-existent');

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/api-keys', () => {
        it('should create API key with valid data', async () => {
            const mockCreatedKey = {
                id: 'key-1',
                name: 'New Key',
                api_key: 'mcs_1234567890abcdef',
                scopes: ['server:read'],
                enabled: true,
                created_by: 'testuser'
            };

            apiKeyService.createApiKey.mockReturnValue(mockCreatedKey);

            const response = await request(app)
                .post('/api/api-keys')
                .send({
                    name: 'New Key',
                    scopes: ['server:read']
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.api_key.api_key).toBe('mcs_1234567890abcdef');
            expect(response.body.warning).toBeDefined();
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/api/api-keys')
                .send({
                    // Missing name and scopes
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Validation failed');
        });

        it('should validate scopes is an array', async () => {
            const response = await request(app)
                .post('/api/api-keys')
                .send({
                    name: 'Test Key',
                    scopes: 'not-an-array'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('should handle service errors', async () => {
            apiKeyService.createApiKey.mockImplementation(() => {
                throw new Error('Invalid scopes provided');
            });

            const response = await request(app)
                .post('/api/api-keys')
                .send({
                    name: 'Test Key',
                    scopes: ['invalid:scope']
                });

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid scopes provided');
        });
    });

    describe('PATCH /api/api-keys/:id', () => {
        it('should update API key', async () => {
            const mockUpdatedKey = {
                id: 'key-1',
                name: 'Updated Name',
                scopes: ['server:read'],
                enabled: true
            };

            apiKeyService.updateApiKey.mockReturnValue(mockUpdatedKey);

            const response = await request(app)
                .patch('/api/api-keys/key-1')
                .send({
                    name: 'Updated Name'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.api_key.name).toBe('Updated Name');
        });

        it('should return 404 for non-existent key', async () => {
            apiKeyService.updateApiKey.mockReturnValue(null);

            const response = await request(app)
                .patch('/api/api-keys/non-existent')
                .send({
                    name: 'Updated'
                });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it('should validate update fields', async () => {
            const response = await request(app)
                .patch('/api/api-keys/key-1')
                .send({
                    enabled: 'not-a-boolean'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('DELETE /api/api-keys/:id', () => {
        it('should revoke API key', async () => {
            apiKeyService.revokeApiKey.mockReturnValue(true);

            const response = await request(app)
                .delete('/api/api-keys/key-1');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('revoked');
        });

        it('should return 404 for non-existent key', async () => {
            apiKeyService.revokeApiKey.mockReturnValue(false);

            const response = await request(app)
                .delete('/api/api-keys/non-existent');

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/api-keys/:id/logs', () => {
        it('should return usage logs', async () => {
            const mockLogs = [
                {
                    id: 1,
                    api_key_id: 'key-1',
                    endpoint: '/api/server/status',
                    method: 'GET',
                    status_code: 200,
                    timestamp: '2024-01-01T12:00:00Z'
                }
            ];

            apiKeyService.getUsageLogs.mockReturnValue(mockLogs);

            const response = await request(app)
                .get('/api/api-keys/key-1/logs');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.logs).toHaveLength(1);
        });

        it('should accept limit parameter', async () => {
            apiKeyService.getUsageLogs.mockReturnValue([]);

            const response = await request(app)
                .get('/api/api-keys/key-1/logs?limit=50');

            expect(response.status).toBe(200);
            expect(apiKeyService.getUsageLogs).toHaveBeenCalledWith('key-1', 50);
        });

        it('should validate limit parameter', async () => {
            const response = await request(app)
                .get('/api/api-keys/key-1/logs?limit=2000');

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/api-keys/:id/stats', () => {
        it('should return usage statistics', async () => {
            const mockStats = {
                total_requests: 100,
                successful_requests: 95,
                failed_requests: 5,
                avg_response_time: 50,
                max_response_time: 200,
                success_rate: 95
            };

            apiKeyService.getUsageStats.mockReturnValue(mockStats);

            const response = await request(app)
                .get('/api/api-keys/key-1/stats');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.stats.total_requests).toBe(100);
            expect(response.body.date_range).toBeDefined();
        });

        it('should accept date range parameters', async () => {
            apiKeyService.getUsageStats.mockReturnValue({});

            const response = await request(app)
                .get('/api/api-keys/key-1/stats?start_date=2024-01-01T00:00:00Z&end_date=2024-01-31T23:59:59Z');

            expect(response.status).toBe(200);
            expect(apiKeyService.getUsageStats).toHaveBeenCalledWith(
                'key-1',
                '2024-01-01T00:00:00Z',
                '2024-01-31T23:59:59Z'
            );
        });

        it('should use default date range if not provided', async () => {
            apiKeyService.getUsageStats.mockReturnValue({});

            const response = await request(app)
                .get('/api/api-keys/key-1/stats');

            expect(response.status).toBe(200);
            expect(apiKeyService.getUsageStats).toHaveBeenCalled();
        });
    });
});
