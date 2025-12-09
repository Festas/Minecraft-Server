/**
 * Plugin Integrations - Map Endpoints Tests
 * 
 * Tests for the new map-related plugin integration endpoints
 */

const request = require('supertest');
const express = require('express');
const pluginIntegrationsRoutes = require('../../routes/pluginIntegrations');

// Mock the pluginGateway
jest.mock('../../services/pluginGateway', () => ({
    call: jest.fn(),
    checkHealth: jest.fn()
}));

// Mock playerTracker
jest.mock('../../services/playerTracker', () => ({
    getAllPlayers: jest.fn(),
    getOnlinePlayers: jest.fn(),
    formatDuration: jest.fn()
}));

// Mock audit log
jest.mock('../../services/auditLog', () => ({
    logAuditEvent: jest.fn().mockResolvedValue(undefined),
    AUDIT_EVENTS: {
        API_ACCESS: 'api_access'
    },
    getClientIp: jest.fn()
}));

// Mock bearerAuth
jest.mock('../../auth/bearerAuth', () => ({
    requireAuthOrToken: (req, res, next) => {
        req.session = { username: 'testuser', authenticated: true };
        next();
    },
    skipCsrfForBearer: (req, res, next) => next()
}));

describe('Plugin Integrations - Map Endpoints', () => {
    let app;
    const pluginGateway = require('../../services/pluginGateway');
    const playerTracker = require('../../services/playerTracker');

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api/plugins', pluginIntegrationsRoutes);
        
        // Reset all mocks
        jest.clearAllMocks();
    });

    describe('GET /api/plugins/dynmap/configuration', () => {
        test('should return map configuration when successful', async () => {
            const mockConfig = {
                title: 'Test Server',
                worlds: [{ name: 'world', title: 'Overworld' }],
                baseUrl: 'http://localhost:8123'
            };

            pluginGateway.call.mockResolvedValue(mockConfig);

            const response = await request(app)
                .get('/api/plugins/dynmap/configuration')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.plugin).toBe('dynmap');
            expect(response.body.data).toEqual(mockConfig);
            expect(pluginGateway.call).toHaveBeenCalledWith('dynmap', 'getConfiguration');
        });

        test('should return 503 when plugin is not ready', async () => {
            pluginGateway.call.mockRejectedValue(new Error('Plugin not ready'));

            const response = await request(app)
                .get('/api/plugins/dynmap/configuration')
                .expect(503);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('not ready');
        });

        test('should return 500 on other errors', async () => {
            pluginGateway.call.mockRejectedValue(new Error('Server error'));

            const response = await request(app)
                .get('/api/plugins/dynmap/configuration')
                .expect(500);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/plugins/dynmap/players-enriched', () => {
        test('should return enriched player data combining Dynmap and tracker stats', async () => {
            const mockDynmapPlayers = [
                {
                    name: 'TestPlayer',
                    displayName: 'TestPlayer',
                    world: 'world',
                    x: 100,
                    y: 64,
                    z: 200,
                    health: 20,
                    armor: 10
                }
            ];

            const mockTrackerPlayers = [
                {
                    username: 'TestPlayer',
                    uuid: '123-456-789',
                    total_playtime_ms: 3600000,
                    session_count: 5,
                    first_seen: '2024-01-01T00:00:00Z',
                    last_seen: '2024-01-02T00:00:00Z'
                }
            ];

            const mockOnlineUuids = ['123-456-789'];

            pluginGateway.call.mockResolvedValue(mockDynmapPlayers);
            playerTracker.getAllPlayers.mockReturnValue(mockTrackerPlayers);
            playerTracker.getOnlinePlayers.mockReturnValue(mockOnlineUuids);
            playerTracker.formatDuration.mockReturnValue('1h 0m');

            const response = await request(app)
                .get('/api/plugins/dynmap/players-enriched')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.plugin).toBe('dynmap');
            expect(response.body.data.players).toHaveLength(1);
            
            const enrichedPlayer = response.body.data.players[0];
            expect(enrichedPlayer.name).toBe('TestPlayer');
            expect(enrichedPlayer.world).toBe('world');
            expect(enrichedPlayer.x).toBe(100);
            expect(enrichedPlayer.uuid).toBe('123-456-789');
            expect(enrichedPlayer.totalPlaytime).toBe(3600000);
            expect(enrichedPlayer.formattedPlaytime).toBe('1h 0m');
            expect(enrichedPlayer.isOnline).toBe(true);
        });

        test('should handle players not in tracker', async () => {
            const mockDynmapPlayers = [
                {
                    name: 'NewPlayer',
                    world: 'world',
                    x: 0,
                    y: 64,
                    z: 0,
                    health: 20,
                    armor: 0
                }
            ];

            pluginGateway.call.mockResolvedValue(mockDynmapPlayers);
            playerTracker.getAllPlayers.mockReturnValue([]);
            playerTracker.getOnlinePlayers.mockReturnValue([]);

            const response = await request(app)
                .get('/api/plugins/dynmap/players-enriched')
                .expect(200);

            expect(response.body.success).toBe(true);
            const enrichedPlayer = response.body.data.players[0];
            expect(enrichedPlayer.name).toBe('NewPlayer');
            expect(enrichedPlayer.uuid).toBeNull();
            expect(enrichedPlayer.totalPlaytime).toBe(0);
            expect(enrichedPlayer.isOnline).toBe(false);
        });

        test('should return 503 when Dynmap is not ready', async () => {
            pluginGateway.call.mockRejectedValue(new Error('Dynmap not ready'));

            const response = await request(app)
                .get('/api/plugins/dynmap/players-enriched')
                .expect(503);

            expect(response.body.success).toBe(false);
        });
    });
});
