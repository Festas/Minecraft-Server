const request = require('supertest');
const express = require('express');
const marketplaceRoutes = require('../../routes/marketplace');
const marketplaceService = require('../../services/marketplaceService');

// Mock dependencies
jest.mock('../../services/marketplaceService');
jest.mock('../../auth/auth', () => ({
    requireAuth: (req, res, next) => {
        req.session = { authenticated: true, username: 'testuser' };
        next();
    }
}));
jest.mock('../../middleware/rbac', () => ({
    checkPermission: () => (req, res, next) => next()
}));
jest.mock('express-rate-limit', () => {
    return jest.fn(() => (req, res, next) => next());
});

describe('Marketplace Routes', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api/marketplace', marketplaceRoutes);
        jest.clearAllMocks();
    });

    describe('GET /api/marketplace/search', () => {
        it('should search plugins successfully', async () => {
            const mockResults = {
                plugins: [
                    {
                        id: 'test-id',
                        name: 'Test Plugin',
                        description: 'Test description',
                        platform: 'modrinth'
                    }
                ],
                total: 1,
                hasMore: false
            };

            marketplaceService.searchPlugins.mockResolvedValueOnce(mockResults);

            const response = await request(app)
                .get('/api/marketplace/search')
                .query({ q: 'test', platform: 'modrinth' })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.plugins).toHaveLength(1);
            expect(response.body.total).toBe(1);
        });

        it('should handle search errors', async () => {
            marketplaceService.searchPlugins.mockRejectedValueOnce(
                new Error('Search failed')
            );

            const response = await request(app)
                .get('/api/marketplace/search')
                .query({ q: 'test' })
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Failed to search marketplace');
        });

        it('should apply default parameters', async () => {
            marketplaceService.searchPlugins.mockResolvedValueOnce({
                plugins: [],
                total: 0,
                hasMore: false
            });

            await request(app)
                .get('/api/marketplace/search')
                .expect(200);

            expect(marketplaceService.searchPlugins).toHaveBeenCalledWith('', {
                platform: 'all',
                category: null,
                version: null,
                limit: 20,
                offset: 0,
                sortBy: 'relevance'
            });
        });
    });

    describe('GET /api/marketplace/plugin/:platform/:pluginId', () => {
        it('should get plugin details successfully', async () => {
            const mockDetails = {
                id: 'test-id',
                name: 'Test Plugin',
                description: 'Full description',
                versions: []
            };

            marketplaceService.getPluginDetails.mockResolvedValueOnce(mockDetails);

            const response = await request(app)
                .get('/api/marketplace/plugin/modrinth/test-id')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.plugin.name).toBe('Test Plugin');
        });

        it('should reject invalid platform', async () => {
            const response = await request(app)
                .get('/api/marketplace/plugin/invalid/test-id')
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Invalid platform');
        });

        it('should handle fetch errors', async () => {
            marketplaceService.getPluginDetails.mockRejectedValueOnce(
                new Error('Not found')
            );

            const response = await request(app)
                .get('/api/marketplace/plugin/modrinth/test-id')
                .expect(500);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/marketplace/plugin/:platform/:pluginId/versions', () => {
        it('should get plugin versions successfully', async () => {
            const mockVersions = [
                { id: 'v1', versionNumber: '1.0.0' },
                { id: 'v2', versionNumber: '1.1.0' }
            ];

            marketplaceService.getPluginVersions.mockResolvedValueOnce(mockVersions);

            const response = await request(app)
                .get('/api/marketplace/plugin/modrinth/test-id/versions')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.versions).toHaveLength(2);
        });

        it('should pass gameVersion filter', async () => {
            marketplaceService.getPluginVersions.mockResolvedValueOnce([]);

            await request(app)
                .get('/api/marketplace/plugin/modrinth/test-id/versions')
                .query({ gameVersion: '1.20.1' })
                .expect(200);

            expect(marketplaceService.getPluginVersions).toHaveBeenCalledWith(
                'test-id',
                'modrinth',
                '1.20.1'
            );
        });

        it('should reject invalid platform', async () => {
            const response = await request(app)
                .get('/api/marketplace/plugin/invalid/test-id/versions')
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/marketplace/featured', () => {
        it('should get featured plugins successfully', async () => {
            const mockPlugins = [
                { id: '1', name: 'Plugin 1' },
                { id: '2', name: 'Plugin 2' }
            ];

            marketplaceService.getFeaturedPlugins.mockResolvedValueOnce(mockPlugins);

            const response = await request(app)
                .get('/api/marketplace/featured')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.plugins).toHaveLength(2);
        });

        it('should apply limit parameter', async () => {
            marketplaceService.getFeaturedPlugins.mockResolvedValueOnce([]);

            await request(app)
                .get('/api/marketplace/featured')
                .query({ limit: 5 })
                .expect(200);

            expect(marketplaceService.getFeaturedPlugins).toHaveBeenCalledWith({
                limit: 5,
                category: null,
                version: null
            });
        });

        it('should handle errors', async () => {
            marketplaceService.getFeaturedPlugins.mockRejectedValueOnce(
                new Error('Failed')
            );

            const response = await request(app)
                .get('/api/marketplace/featured')
                .expect(500);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/marketplace/categories', () => {
        it('should get categories successfully', async () => {
            const mockCategories = {
                modrinth: ['admin', 'economy'],
                hangar: ['admin_tools', 'chat']
            };

            marketplaceService.getCategories.mockResolvedValueOnce(mockCategories);

            const response = await request(app)
                .get('/api/marketplace/categories')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.categories).toHaveProperty('modrinth');
            expect(response.body.categories).toHaveProperty('hangar');
        });

        it('should handle errors', async () => {
            marketplaceService.getCategories.mockRejectedValueOnce(
                new Error('Failed')
            );

            const response = await request(app)
                .get('/api/marketplace/categories')
                .expect(500);

            expect(response.body.success).toBe(false);
        });
    });
});
