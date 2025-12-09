/**
 * Tests for Advanced Player Management API Routes
 */

const request = require('supertest');
const express = require('express');
const session = require('express-session');

// Mock dependencies before requiring routes
jest.mock('../../services/rcon');
jest.mock('../../services/playerTracker');
jest.mock('../../services/database');
jest.mock('../../services/mojang');
jest.mock('../../services/auditLog');
jest.mock('../../middleware/rbac', () => ({
    checkPermission: () => (req, res, next) => next()
}));

const playersRouter = require('../../routes/players');
const rconService = require('../../services/rcon');
const playerTracker = require('../../services/playerTracker');
const database = require('../../services/database');
const mojangService = require('../../services/mojang');

describe('Advanced Player Management Routes', () => {
    let app;

    beforeEach(() => {
        // Create Express app with middleware
        app = express();
        app.use(express.json());
        
        // Add session middleware
        app.use(session({
            secret: 'test-secret',
            resave: false,
            saveUninitialized: false
        }));
        
        // Mock authentication middleware
        app.use((req, res, next) => {
            req.session.authenticated = true;
            req.session.username = 'testadmin';
            req.session.role = 'admin';
            next();
        });
        
        // Mount router
        app.use('/api/players', playersRouter);
        
        // Reset mocks
        jest.clearAllMocks();
    });

    describe('POST /api/players/warn', () => {
        test('warns player with reason', async () => {
            rconService.executeCommand.mockResolvedValue({ success: true });
            mojangService.getUuid.mockResolvedValue('test-uuid-123');
            database.recordPlayerAction.mockReturnValue(undefined);

            const response = await request(app)
                .post('/api/players/warn')
                .send({
                    player: 'TestPlayer',
                    reason: 'Spamming chat'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(rconService.executeCommand).toHaveBeenCalled();
            expect(database.recordPlayerAction).toHaveBeenCalledWith(
                'test-uuid-123',
                'TestPlayer',
                'warn',
                'testadmin',
                'Spamming chat'
            );
        });

        test('returns error when player name missing', async () => {
            const response = await request(app)
                .post('/api/players/warn')
                .send({
                    reason: 'Test reason'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Player name is required');
        });

        test('returns error when reason missing', async () => {
            const response = await request(app)
                .post('/api/players/warn')
                .send({
                    player: 'TestPlayer'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Reason is required for warnings');
        });
    });

    describe('POST /api/players/mute', () => {
        test('mutes player with reason and duration', async () => {
            rconService.executeCommand.mockResolvedValue({ success: true });
            mojangService.getUuid.mockResolvedValue('test-uuid-123');
            database.recordPlayerAction.mockReturnValue(undefined);

            const response = await request(app)
                .post('/api/players/mute')
                .send({
                    player: 'TestPlayer',
                    reason: 'Inappropriate language',
                    duration: '1h'
                });

            expect(response.status).toBe(200);
            expect(rconService.executeCommand).toHaveBeenCalledWith('mute TestPlayer 1h Inappropriate language');
            expect(database.recordPlayerAction).toHaveBeenCalledWith(
                'test-uuid-123',
                'TestPlayer',
                'mute',
                'testadmin',
                'Inappropriate language',
                { duration: '1h' }
            );
        });
    });

    describe('POST /api/players/unmute', () => {
        test('unmutes player', async () => {
            rconService.executeCommand.mockResolvedValue({ success: true });
            mojangService.getUuid.mockResolvedValue('test-uuid-123');
            database.recordPlayerAction.mockReturnValue(undefined);

            const response = await request(app)
                .post('/api/players/unmute')
                .send({
                    player: 'TestPlayer'
                });

            expect(response.status).toBe(200);
            expect(rconService.executeCommand).toHaveBeenCalledWith('unmute TestPlayer');
            expect(database.recordPlayerAction).toHaveBeenCalledWith(
                'test-uuid-123',
                'TestPlayer',
                'unmute',
                'testadmin'
            );
        });
    });

    describe('GET /api/players/:uuid/details', () => {
        test('returns player details with action history', async () => {
            const mockPlayer = {
                uuid: 'test-uuid-123',
                username: 'TestPlayer',
                first_seen: '2024-01-01T00:00:00.000Z',
                last_seen: '2024-12-09T17:00:00.000Z',
                total_playtime_ms: 3600000,
                session_count: 5
            };

            const mockHistory = [
                {
                    id: 1,
                    action_type: 'warn',
                    performed_by: 'testadmin',
                    reason: 'Test warning'
                }
            ];

            database.getPlayerByUuid.mockReturnValue(mockPlayer);
            database.getPlayerActionHistory.mockReturnValue(mockHistory);
            playerTracker.getOnlinePlayers.mockReturnValue(['test-uuid-123']);
            playerTracker.formatDuration.mockReturnValue('1h 0m');

            const response = await request(app)
                .get('/api/players/test-uuid-123/details');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.player.username).toBe('TestPlayer');
            expect(response.body.player.isOnline).toBe(true);
            expect(response.body.actionHistory).toHaveLength(1);
        });

        test('returns 404 when player not found', async () => {
            database.getPlayerByUuid.mockReturnValue(null);

            const response = await request(app)
                .get('/api/players/nonexistent-uuid/details');

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Player not found');
        });
    });

    describe('GET /api/players/:uuid/history', () => {
        test('returns action history for player', async () => {
            const mockHistory = [
                {
                    id: 1,
                    player_uuid: 'test-uuid-123',
                    action_type: 'warn',
                    performed_by: 'testadmin',
                    performed_at: '2024-12-09T17:00:00.000Z'
                },
                {
                    id: 2,
                    player_uuid: 'test-uuid-123',
                    action_type: 'mute',
                    performed_by: 'testadmin',
                    performed_at: '2024-12-09T16:00:00.000Z'
                }
            ];

            database.getPlayerActionHistory.mockReturnValue(mockHistory);

            const response = await request(app)
                .get('/api/players/test-uuid-123/history');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.actions).toHaveLength(2);
            expect(database.getPlayerActionHistory).toHaveBeenCalledWith('test-uuid-123', 50);
        });

        test('respects limit parameter', async () => {
            database.getPlayerActionHistory.mockReturnValue([]);

            await request(app)
                .get('/api/players/test-uuid-123/history?limit=10');

            expect(database.getPlayerActionHistory).toHaveBeenCalledWith('test-uuid-123', 10);
        });
    });

    describe('GET /api/players/whitelist', () => {
        test('returns whitelist entries', async () => {
            const mockWhitelist = [
                {
                    id: 1,
                    player_uuid: 'test-uuid-123',
                    player_username: 'TestPlayer',
                    added_by: 'testadmin',
                    added_at: '2024-12-09T17:00:00.000Z',
                    notes: 'Friend of member',
                    is_active: 1
                }
            ];

            database.getActiveWhitelist.mockReturnValue(mockWhitelist);

            const response = await request(app)
                .get('/api/players/whitelist');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.whitelist).toHaveLength(1);
            expect(response.body.count).toBe(1);
        });
    });

    describe('POST /api/players/whitelist/add', () => {
        test('adds player to whitelist', async () => {
            mojangService.getUuid.mockResolvedValue('test-uuid-123');
            rconService.executeCommand.mockResolvedValue({ success: true });
            database.addToWhitelist.mockReturnValue(undefined);
            database.recordPlayerAction.mockReturnValue(undefined);

            const response = await request(app)
                .post('/api/players/whitelist/add')
                .send({
                    player: 'TestPlayer',
                    notes: 'Friend of member'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(rconService.executeCommand).toHaveBeenCalledWith('whitelist add TestPlayer');
            expect(database.addToWhitelist).toHaveBeenCalledWith(
                'test-uuid-123',
                'TestPlayer',
                'testadmin',
                'Friend of member'
            );
        });

        test('returns error when player not found', async () => {
            mojangService.getUuid.mockResolvedValue(null);

            const response = await request(app)
                .post('/api/players/whitelist/add')
                .send({
                    player: 'NonexistentPlayer'
                });

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Player not found');
        });
    });

    describe('POST /api/players/whitelist/remove', () => {
        test('removes player from whitelist', async () => {
            mojangService.getUuid.mockResolvedValue('test-uuid-123');
            rconService.executeCommand.mockResolvedValue({ success: true });
            database.removeFromWhitelist.mockReturnValue(undefined);
            database.recordPlayerAction.mockReturnValue(undefined);

            const response = await request(app)
                .post('/api/players/whitelist/remove')
                .send({
                    player: 'TestPlayer'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(rconService.executeCommand).toHaveBeenCalledWith('whitelist remove TestPlayer');
            expect(database.removeFromWhitelist).toHaveBeenCalledWith('test-uuid-123');
        });
    });
});
