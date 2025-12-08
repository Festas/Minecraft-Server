const fs = require('fs').promises;
const path = require('path');
const playerTracker = require('../../services/playerTracker');

// Mock file system
jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn(),
        writeFile: jest.fn()
    }
}));

describe('PlayerTrackerService', () => {
    const testDataFile = path.join(__dirname, '../../data/player-stats.json');

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset player data
        playerTracker.players = new Map();
        playerTracker.activeSessions = new Map();
        // Clear any pending save timers
        if (playerTracker.saveDebounceTimer) {
            clearTimeout(playerTracker.saveDebounceTimer);
            playerTracker.saveDebounceTimer = null;
        }
    });

    describe('initialize', () => {
        it('should load existing player data', async () => {
            const mockData = [
                {
                    username: 'TestPlayer',
                    firstSeen: '2024-01-01T00:00:00.000Z',
                    lastSeen: '2024-01-02T00:00:00.000Z',
                    totalPlaytimeMs: 3600000,
                    sessionCount: 5
                }
            ];

            fs.readFile.mockResolvedValue(JSON.stringify(mockData));

            await playerTracker.initialize();

            expect(fs.readFile).toHaveBeenCalledWith(testDataFile, 'utf8');
            expect(playerTracker.players.size).toBe(1);
            expect(playerTracker.players.get('TestPlayer')).toEqual(mockData[0]);
        });

        it('should handle missing data file gracefully', async () => {
            const error = new Error('File not found');
            error.code = 'ENOENT';
            fs.readFile.mockRejectedValue(error);

            await playerTracker.initialize();

            expect(playerTracker.players.size).toBe(0);
        });
    });

    describe('playerJoined', () => {
        it('should create new player record on first join', () => {
            const username = 'NewPlayer';
            
            playerTracker.playerJoined(username);

            const player = playerTracker.players.get(username);
            expect(player).toBeDefined();
            expect(player.username).toBe(username);
            expect(player.sessionCount).toBe(1);
            expect(player.totalPlaytimeMs).toBe(0);
            expect(playerTracker.activeSessions.has(username)).toBe(true);
        });

        it('should increment session count for returning player', () => {
            const username = 'ReturningPlayer';
            
            // First join
            playerTracker.playerJoined(username);
            playerTracker.playerLeft(username);
            
            // Second join
            playerTracker.playerJoined(username);
            
            const player = playerTracker.players.get(username);
            expect(player.sessionCount).toBe(2);
        });
    });

    describe('playerLeft', () => {
        it('should update player stats when leaving', (done) => {
            const username = 'LeavingPlayer';
            
            playerTracker.playerJoined(username);
            
            // Wait a bit to accumulate playtime
            setTimeout(() => {
                playerTracker.playerLeft(username);
                
                const player = playerTracker.players.get(username);
                expect(player.totalPlaytimeMs).toBeGreaterThan(0);
                expect(player.lastSeen).toBeDefined();
                expect(playerTracker.activeSessions.has(username)).toBe(false);
                done();
            }, 50);
        });

        it('should handle leaving without active session', () => {
            const username = 'NoSessionPlayer';
            
            // Should not throw error
            expect(() => playerTracker.playerLeft(username)).not.toThrow();
        });
    });

    describe('getAllPlayers', () => {
        it('should return all tracked players', () => {
            playerTracker.playerJoined('Player1');
            playerTracker.playerJoined('Player2');
            
            const allPlayers = playerTracker.getAllPlayers();
            
            expect(allPlayers).toHaveLength(2);
            expect(allPlayers.map(p => p.username)).toContain('Player1');
            expect(allPlayers.map(p => p.username)).toContain('Player2');
        });

        it('should return empty array when no players', () => {
            const allPlayers = playerTracker.getAllPlayers();
            expect(allPlayers).toEqual([]);
        });
    });

    describe('getOnlinePlayers', () => {
        it('should return only online players', () => {
            playerTracker.playerJoined('OnlinePlayer1');
            playerTracker.playerJoined('OnlinePlayer2');
            playerTracker.playerJoined('OfflinePlayer');
            playerTracker.playerLeft('OfflinePlayer');
            
            const onlinePlayers = playerTracker.getOnlinePlayers();
            
            expect(onlinePlayers).toHaveLength(2);
            expect(onlinePlayers).toContain('OnlinePlayer1');
            expect(onlinePlayers).toContain('OnlinePlayer2');
            expect(onlinePlayers).not.toContain('OfflinePlayer');
        });
    });

    describe('formatDuration', () => {
        it('should format seconds', () => {
            expect(playerTracker.formatDuration(5000)).toBe('5s');
        });

        it('should format minutes', () => {
            expect(playerTracker.formatDuration(125000)).toBe('2m');
        });

        it('should format hours', () => {
            expect(playerTracker.formatDuration(3665000)).toBe('1h 1m');
        });

        it('should format days', () => {
            expect(playerTracker.formatDuration(90000000)).toBe('1d 1h');
        });
    });

    describe('saveData', () => {
        it('should debounce save operations', (done) => {
            playerTracker.playerJoined('TestPlayer');
            
            // Should not save immediately
            expect(fs.writeFile).not.toHaveBeenCalled();
            
            // Wait for debounce
            setTimeout(() => {
                expect(fs.writeFile).toHaveBeenCalled();
                done();
            }, 5100); // Wait for debounce timer (5000ms + buffer)
        }, 10000);
    });

    describe('shutdown', () => {
        it('should save data immediately on shutdown', async () => {
            playerTracker.playerJoined('TestPlayer');
            
            await playerTracker.shutdown();
            
            expect(fs.writeFile).toHaveBeenCalled();
            const savedData = JSON.parse(fs.writeFile.mock.calls[0][1]);
            expect(savedData).toHaveLength(1);
            expect(savedData[0].username).toBe('TestPlayer');
        });
    });
});
