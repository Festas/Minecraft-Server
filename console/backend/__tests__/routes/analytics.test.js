/**
 * Analytics Routes Tests
 * 
 * Tests for analytics API endpoints
 */

const request = require('supertest');
const express = require('express');

// Mock the services before requiring routes
jest.mock('../../services/analyticsService');
const analyticsService = require('../../services/analyticsService');

// Mock the requireAuth middleware
jest.mock('../../auth/auth', () => ({
    requireAuth: (req, res, next) => {
        req.session = { username: 'testuser', role: 'admin', authenticated: true };
        next();
    }
}));

// Mock the RBAC middleware
jest.mock('../../middleware/rbac', () => ({
    requirePermission: (permission) => (req, res, next) => next()
}));

// Mock rate limiter
jest.mock('express-rate-limit', () => {
    return jest.fn(() => (req, res, next) => next());
});

// Now require the routes after mocks are set up
const analyticsRouter = require('../../routes/analytics');

// Create a test app
const app = express();
app.use(express.json());
app.use('/api/analytics', analyticsRouter);

describe('Analytics Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/analytics/dashboard', () => {
        it('should return dashboard statistics', async () => {
            const mockStats = {
                players: { unique_players: 10, total_events: 150 },
                server: { avg_cpu: 45.5, avg_memory: 60.2, avg_tps: 19.8, avg_players: 5.5 },
                plugins: { active_plugins: 15, total_plugin_events: 200 }
            };

            analyticsService.getDashboardStats.mockReturnValue(mockStats);

            const response = await request(app)
                .get('/api/analytics/dashboard');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('stats');
            expect(response.body.stats).toEqual(mockStats);
        });

        it('should accept date range filters', async () => {
            const mockStats = {
                players: { unique_players: 5, total_events: 75 },
                server: { avg_cpu: 40.0, avg_memory: 55.0, avg_tps: 20.0, avg_players: 3.0 },
                plugins: { active_plugins: 10, total_plugin_events: 100 }
            };

            analyticsService.getDashboardStats.mockReturnValue(mockStats);

            const response = await request(app)
                .get('/api/analytics/dashboard')
                .query({ 
                    startDate: '2024-01-01T00:00:00.000Z',
                    endDate: '2024-01-31T23:59:59.999Z'
                });

            expect(response.status).toBe(200);
            expect(analyticsService.getDashboardStats).toHaveBeenCalledWith(
                '2024-01-01T00:00:00.000Z',
                '2024-01-31T23:59:59.999Z'
            );
        });

        it('should return 400 for invalid date format', async () => {
            const response = await request(app)
                .get('/api/analytics/dashboard')
                .query({ startDate: 'invalid-date' });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('GET /api/analytics/players', () => {
        it('should return player activity data', async () => {
            const mockData = {
                topPlayers: [
                    { player_username: 'player1', player_uuid: 'uuid1', event_count: 100, last_seen: '2024-01-15' }
                ],
                eventsByType: [
                    { event_type: 'player.join', count: 50 },
                    { event_type: 'player.leave', count: 50 }
                ],
                activityOverTime: [
                    { date: '2024-01-15', event_count: 100, unique_players: 5 }
                ]
            };

            analyticsService.getPlayerActivity.mockReturnValue(mockData);

            const response = await request(app)
                .get('/api/analytics/players');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toEqual(mockData);
        });

        it('should handle errors gracefully', async () => {
            analyticsService.getPlayerActivity.mockImplementation(() => {
                throw new Error('Database error');
            });

            const response = await request(app)
                .get('/api/analytics/players');

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('GET /api/analytics/server', () => {
        it('should return server health data', async () => {
            const mockData = {
                recentMetrics: [
                    { timestamp: '2024-01-15T10:00:00Z', cpu_percent: 45, memory_percent: 60, tps: 19.8, player_count: 5 }
                ],
                summary: {
                    avg_cpu: 45.5,
                    max_cpu: 70.0,
                    avg_memory: 60.2,
                    max_memory: 80.0,
                    avg_tps: 19.8,
                    min_tps: 18.5,
                    avg_players: 5.5,
                    max_players: 10
                }
            };

            analyticsService.getServerHealth.mockReturnValue(mockData);

            const response = await request(app)
                .get('/api/analytics/server');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toEqual(mockData);
        });
    });

    describe('GET /api/analytics/plugins', () => {
        it('should return plugin usage data', async () => {
            const mockData = {
                usageByPlugin: [
                    { plugin_name: 'EssentialsX', plugin_version: '2.20.0', event_count: 150, last_activity: '2024-01-15' }
                ],
                usageByEventType: [
                    { event_type: 'plugin.enable', count: 10 },
                    { event_type: 'plugin.command', count: 140 }
                ]
            };

            analyticsService.getPluginUsage.mockReturnValue(mockData);

            const response = await request(app)
                .get('/api/analytics/plugins');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toEqual(mockData);
        });
    });

    describe('GET /api/analytics/export', () => {
        it('should export data as JSON', async () => {
            const mockData = { test: 'data' };
            analyticsService.exportData.mockReturnValue(mockData);

            const response = await request(app)
                .get('/api/analytics/export')
                .query({ 
                    format: 'json',
                    dataType: 'players'
                });

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toMatch(/application\/json/);
            expect(analyticsService.exportData).toHaveBeenCalledWith('json', 'players', undefined, undefined);
        });

        it('should export data as CSV', async () => {
            const mockCSV = 'Username,UUID,Events\nplayer1,uuid1,100';
            analyticsService.exportData.mockReturnValue(mockCSV);

            const response = await request(app)
                .get('/api/analytics/export')
                .query({ 
                    format: 'csv',
                    dataType: 'players'
                });

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toMatch(/text\/csv/);
            expect(response.text).toBe(mockCSV);
        });

        it('should validate format parameter', async () => {
            const response = await request(app)
                .get('/api/analytics/export')
                .query({ 
                    format: 'invalid',
                    dataType: 'players'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        it('should validate dataType parameter', async () => {
            const response = await request(app)
                .get('/api/analytics/export')
                .query({ 
                    format: 'json',
                    dataType: 'invalid'
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('GET /api/analytics/settings', () => {
        it('should return privacy settings', async () => {
            const mockSettings = {
                collectPlayerData: true,
                collectServerMetrics: true,
                collectPluginData: true,
                retentionDays: 90
            };

            analyticsService.getPrivacySettings.mockReturnValue(mockSettings);

            const response = await request(app)
                .get('/api/analytics/settings');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('settings');
            expect(response.body.settings).toEqual(mockSettings);
        });
    });

    describe('POST /api/analytics/settings', () => {
        it('should update privacy settings', async () => {
            const updatedSettings = {
                collectPlayerData: false,
                collectServerMetrics: true,
                collectPluginData: true,
                retentionDays: 60
            };

            analyticsService.updatePrivacySettings.mockReturnValue(updatedSettings);

            const response = await request(app)
                .post('/api/analytics/settings')
                .send(updatedSettings);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('settings');
            expect(response.body.settings).toEqual(updatedSettings);
        });

        it('should validate boolean fields', async () => {
            const response = await request(app)
                .post('/api/analytics/settings')
                .send({ collectPlayerData: 'not-a-boolean' });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        it('should validate retentionDays range', async () => {
            const response = await request(app)
                .post('/api/analytics/settings')
                .send({ retentionDays: 500 });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });

        it('should handle errors during update', async () => {
            analyticsService.updatePrivacySettings.mockImplementation(() => {
                throw new Error('Database error');
            });

            const response = await request(app)
                .post('/api/analytics/settings')
                .send({ collectPlayerData: false });

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('error');
        });
    });
});
