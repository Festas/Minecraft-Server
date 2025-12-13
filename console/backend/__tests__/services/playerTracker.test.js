const fs = require('fs');
const path = require('path');
const playerTracker = require('../../services/playerTracker');
const database = require('../../services/database');
const mojangService = require('../../services/mojang');

// Mock mojangService
jest.mock('../../services/mojang');

describe('PlayerTrackerService', () => {
    const testDbPath = path.join(__dirname, '../../data/test-tracker-players.db');

    beforeEach(async () => {
        jest.clearAllMocks();
        
        // Setup database with test path
        database.dbPath = testDbPath;
        
        // Remove test database if it exists
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
        
        // Remove WAL files
        ['-shm', '-wal'].forEach(ext => {
            const walFile = testDbPath + ext;
            if (fs.existsSync(walFile)) {
                fs.unlinkSync(walFile);
            }
        });

        // Mock Mojang service to return predictable UUIDs
        mojangService.getUuid.mockImplementation((username) => {
            return Promise.resolve(`uuid-${username.toLowerCase()}`);
        });

        // Initialize player tracker
        await playerTracker.initialize();
        
        // Clear any active sessions
        playerTracker.activeSessions.clear();
    });

    afterEach(async () => {
        // Shutdown player tracker
        await playerTracker.shutdown();
        
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

    describe('initialize', () => {
        it('should initialize database', async () => {
            expect(fs.existsSync(testDbPath)).toBe(true);
        });

        it('should start heartbeat timer', async () => {
            expect(playerTracker.heartbeatInterval).toBeDefined();
        });
    });

    describe('playerJoined', () => {
        it('should create new player record on first join', async () => {
            const username = 'NewPlayer';
            
            await playerTracker.playerJoined(username);

            const players = playerTracker.getAllPlayers();
            const player = players.find(p => p.username === username);
            
            expect(player).toBeDefined();
            expect(player.username).toBe(username);
            expect(player.session_count).toBe(1);
            expect(playerTracker.activeSessions.size).toBe(1);
        });

        it('should increment session count for returning player', async () => {
            const username = 'ReturningPlayer';
            
            // First join
            await playerTracker.playerJoined(username);
            await playerTracker.playerLeft(username);
            
            // Second join
            await playerTracker.playerJoined(username);
            
            const players = playerTracker.getAllPlayers();
            const player = players.find(p => p.username === username);
            expect(player.session_count).toBe(2);
        });

        it('should track active session', async () => {
            const username = 'ActivePlayer';
            
            await playerTracker.playerJoined(username);
            
            const onlinePlayers = playerTracker.getOnlinePlayers();
            expect(onlinePlayers.length).toBe(1);
            expect(onlinePlayers[0]).toBe('uuid-activeplayer');
        });
    });

    describe('playerLeft', () => {
        it('should update player stats when leaving', (done) => {
            const username = 'LeavingPlayer';
            
            playerTracker.playerJoined(username).then(() => {
                // Wait a bit to accumulate playtime
                setTimeout(async () => {
                    await playerTracker.playerLeft(username);
                    
                    const players = playerTracker.getAllPlayers();
                    const player = players.find(p => p.username === username);
                    
                    expect(player.total_playtime_ms).toBeGreaterThan(0);
                    expect(player.last_seen).toBeDefined();
                    expect(playerTracker.activeSessions.size).toBe(0);
                    done();
                }, 50);
            });
        });

        it('should handle leaving without active session gracefully', async () => {
            const username = 'NoSessionPlayer';
            
            // Should not throw error
            await expect(playerTracker.playerLeft(username)).resolves.not.toThrow();
        });
    });

    describe('getAllPlayers', () => {
        it('should return all tracked players', async () => {
            await playerTracker.playerJoined('Player1');
            await playerTracker.playerJoined('Player2');
            
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
        it('should return only online players', async () => {
            await playerTracker.playerJoined('OnlinePlayer1');
            await playerTracker.playerJoined('OnlinePlayer2');
            await playerTracker.playerJoined('OfflinePlayer');
            await playerTracker.playerLeft('OfflinePlayer');
            
            const onlinePlayers = playerTracker.getOnlinePlayers();
            
            expect(onlinePlayers).toHaveLength(2);
            expect(onlinePlayers).toContain('uuid-onlineplayer1');
            expect(onlinePlayers).toContain('uuid-onlineplayer2');
            expect(onlinePlayers).not.toContain('uuid-offlineplayer');
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

    describe.skip('heartbeat', () => {
        it('should update active sessions on heartbeat', async (done) => {
            await playerTracker.playerJoined('HeartbeatPlayer');
            
            const player1 = database.getPlayerByUsername('HeartbeatPlayer');
            const lastSeen1 = player1.last_seen;
            
            // Wait for heartbeat
            setTimeout(() => {
                const player2 = database.getPlayerByUsername('HeartbeatPlayer');
                const lastSeen2 = player2.last_seen;
                
                // Last seen should be updated
                expect(lastSeen2).not.toBe(lastSeen1);
                done();
            }, 61000); // Wait for heartbeat (60s + buffer)
        }, 65000);
    });

    describe('shutdown', () => {
        it('should end all active sessions on shutdown', async () => {
            await playerTracker.playerJoined('TestPlayer1');
            await playerTracker.playerJoined('TestPlayer2');
            
            expect(playerTracker.activeSessions.size).toBe(2);
            
            await playerTracker.shutdown();
            
            expect(playerTracker.activeSessions.size).toBe(0);
            
            // Re-initialize for cleanup
            database.initialize();
        });
    });

    describe('watchdog', () => {
        it('should have default timeout configuration', () => {
            const config = playerTracker.getWatchdogConfig();
            expect(config.sessionTimeoutMs).toBe(180000); // 3 minutes
            expect(config.heartbeatIntervalMs).toBe(60000); // 60 seconds
        });

        it('should allow setting session timeout', () => {
            playerTracker.setSessionTimeout(120000); // 2 minutes
            const config = playerTracker.getWatchdogConfig();
            expect(config.sessionTimeoutMs).toBe(120000);
            
            // Reset to default
            playerTracker.setSessionTimeout(180000);
        });

        it('should reject invalid timeout values', () => {
            expect(() => playerTracker.setSessionTimeout(500)).toThrow();
        });

        it('should detect and remove stale sessions', async () => {
            // Set a very short timeout for testing (2 seconds)
            playerTracker.setSessionTimeout(2000);
            
            // Add a player
            await playerTracker.playerJoined('StalePlayer');
            expect(playerTracker.activeSessions.size).toBe(1);
            
            // Manually set last_seen to old timestamp to simulate stale session
            const player = database.getPlayerByUsername('StalePlayer');
            const oldTimestamp = new Date(Date.now() - 5000).toISOString(); // 5 seconds ago
            database.db.prepare('UPDATE players SET last_seen = ? WHERE uuid = ?')
                .run(oldTimestamp, player.uuid);
            
            // Run watchdog check
            playerTracker.checkForStaleSessions();
            
            // Wait a bit for async playerLeft to complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Session should be removed
            expect(playerTracker.activeSessions.size).toBe(0);
            
            // Player should have no active session in DB
            const updatedPlayer = database.getPlayerByUsername('StalePlayer');
            expect(updatedPlayer.current_session_start).toBeNull();
            
            // Reset timeout to default
            playerTracker.setSessionTimeout(180000);
        });

        it('should not remove active sessions within timeout', async () => {
            // Set a reasonable timeout
            playerTracker.setSessionTimeout(60000); // 1 minute
            
            // Add a player
            await playerTracker.playerJoined('ActivePlayer');
            expect(playerTracker.activeSessions.size).toBe(1);
            
            // Update last_seen to recent timestamp (within timeout)
            database.updateLastSeen('uuid-activeplayer');
            
            // Run watchdog check
            playerTracker.checkForStaleSessions();
            
            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Session should still be active
            expect(playerTracker.activeSessions.size).toBe(1);
            
            // Clean up
            await playerTracker.playerLeft('ActivePlayer');
            
            // Reset timeout to default
            playerTracker.setSessionTimeout(180000);
        });

        it('should handle multiple stale sessions', async () => {
            // Set a very short timeout for testing
            playerTracker.setSessionTimeout(2000);
            
            // Add multiple players
            await playerTracker.playerJoined('StalePlayer1');
            await playerTracker.playerJoined('StalePlayer2');
            await playerTracker.playerJoined('StalePlayer3');
            expect(playerTracker.activeSessions.size).toBe(3);
            
            // Make all sessions stale
            const oldTimestamp = new Date(Date.now() - 5000).toISOString();
            database.db.prepare('UPDATE players SET last_seen = ? WHERE current_session_start IS NOT NULL')
                .run(oldTimestamp);
            
            // Run watchdog check
            playerTracker.checkForStaleSessions();
            
            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // All sessions should be removed
            expect(playerTracker.activeSessions.size).toBe(0);
            
            // Reset timeout to default
            playerTracker.setSessionTimeout(180000);
        });
    });
});

