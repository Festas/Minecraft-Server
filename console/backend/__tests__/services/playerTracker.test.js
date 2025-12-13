const fs = require('fs');
const path = require('path');
const playerTracker = require('../../services/playerTracker');
const database = require('../../services/database');
const mojangService = require('../../services/mojang');
const rconService = require('../../services/rcon');

// Mock services
jest.mock('../../services/mojang');
jest.mock('../../services/rcon');

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

        // Mock RCON service
        rconService.isConnected.mockReturnValue(true);
        rconService.getPlayers.mockResolvedValue({
            online: 0,
            max: 20,
            players: []
        });

        // Initialize player tracker
        await playerTracker.initialize();
        
        // Clear any active sessions
        playerTracker.activeSessions.clear();
        
        // Stop RCON polling for most tests (re-enable in specific tests)
        playerTracker.stopRconPolling();
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
            database.setLastSeen(player.uuid, oldTimestamp);
            
            // Run watchdog check
            await playerTracker.checkForStaleSessions();
            
            // Wait a bit for async operations to complete
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
            await playerTracker.checkForStaleSessions();
            
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
            const stalePlayers = ['StalePlayer1', 'StalePlayer2', 'StalePlayer3'];
            stalePlayers.forEach(name => {
                const p = database.getPlayerByUsername(name);
                database.setLastSeen(p.uuid, oldTimestamp);
            });
            
            // Run watchdog check
            await playerTracker.checkForStaleSessions();
            
            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // All sessions should be removed
            expect(playerTracker.activeSessions.size).toBe(0);
            
            // Reset timeout to default
            playerTracker.setSessionTimeout(180000);
        });
    });

    describe('RCON integration', () => {
        it('should poll RCON for online players', async () => {
            // Mock RCON to return a player
            rconService.getPlayers.mockResolvedValue({
                online: 2,
                max: 20,
                players: ['Player1', 'Player2']
            });

            // Poll RCON
            await playerTracker.pollRconOnlinePlayers();

            // Check that players are in cache
            expect(playerTracker.rconOnlinePlayers.has('Player1')).toBe(true);
            expect(playerTracker.rconOnlinePlayers.has('Player2')).toBe(true);
            expect(playerTracker.rconOnlinePlayers.size).toBe(2);
            expect(playerTracker.rconConsecutiveFailures).toBe(0);
        });

        it('should handle RCON connection failure', async () => {
            // Mock RCON as disconnected
            rconService.isConnected.mockReturnValue(false);

            // Poll RCON
            await playerTracker.pollRconOnlinePlayers();

            // Should increment failure counter
            expect(playerTracker.rconConsecutiveFailures).toBe(1);
        });

        it('should handle RCON response errors', async () => {
            // Mock RCON to throw error
            rconService.getPlayers.mockRejectedValue(new Error('RCON error'));

            // Poll RCON
            await playerTracker.pollRconOnlinePlayers();

            // Should increment failure counter
            expect(playerTracker.rconConsecutiveFailures).toBe(1);
        });

        it('should reset failure counter on successful poll', async () => {
            // Set some failures
            playerTracker.rconConsecutiveFailures = 2;

            // Mock successful RCON response
            rconService.getPlayers.mockResolvedValue({
                online: 1,
                max: 20,
                players: ['Player1']
            });

            // Poll RCON
            await playerTracker.pollRconOnlinePlayers();

            // Failure counter should be reset
            expect(playerTracker.rconConsecutiveFailures).toBe(0);
        });

        it('should consider RCON unreliable after max failures', () => {
            expect(playerTracker.isRconReliable()).toBe(true);
            
            playerTracker.rconConsecutiveFailures = 3;
            expect(playerTracker.isRconReliable()).toBe(false);
            
            playerTracker.rconConsecutiveFailures = 2;
            expect(playerTracker.isRconReliable()).toBe(true);
        });

        it('should only update last_seen for RCON-confirmed players', async () => {
            // Add two players
            await playerTracker.playerJoined('OnlinePlayer');
            await playerTracker.playerJoined('OfflinePlayer');

            // Mock RCON to only show OnlinePlayer
            rconService.getPlayers.mockResolvedValue({
                online: 1,
                max: 20,
                players: ['OnlinePlayer']
            });

            // Poll RCON to update cache
            await playerTracker.pollRconOnlinePlayers();

            // Get initial last_seen timestamps
            const onlinePlayer1 = database.getPlayerByUsername('OnlinePlayer');
            const offlinePlayer1 = database.getPlayerByUsername('OfflinePlayer');
            const onlineLastSeen1 = onlinePlayer1.last_seen;
            const offlineLastSeen1 = offlinePlayer1.last_seen;

            // Wait for at least one second to ensure timestamp changes
            await new Promise(resolve => setTimeout(resolve, 1100));

            // Run heartbeat update
            playerTracker.updateActiveSessions();

            // Get updated last_seen timestamps
            const onlinePlayer2 = database.getPlayerByUsername('OnlinePlayer');
            const offlinePlayer2 = database.getPlayerByUsername('OfflinePlayer');

            // OnlinePlayer should have updated last_seen
            expect(onlinePlayer2.last_seen).not.toBe(onlineLastSeen1);
            
            // OfflinePlayer should NOT have updated last_seen (not in RCON list)
            expect(offlinePlayer2.last_seen).toBe(offlineLastSeen1);
        });

        it('should not update any sessions when RCON is unreliable', async () => {
            // Add a player
            await playerTracker.playerJoined('TestPlayer');

            // Mock RCON as working initially
            rconService.getPlayers.mockResolvedValue({
                online: 1,
                max: 20,
                players: ['TestPlayer']
            });
            await playerTracker.pollRconOnlinePlayers();

            // Get initial last_seen
            const player1 = database.getPlayerByUsername('TestPlayer');
            const lastSeen1 = player1.last_seen;

            // Simulate RCON failures
            playerTracker.rconConsecutiveFailures = 3; // Hit max failures

            // Wait a moment
            await new Promise(resolve => setTimeout(resolve, 100));

            // Try to update sessions
            playerTracker.updateActiveSessions();

            // Get updated player
            const player2 = database.getPlayerByUsername('TestPlayer');

            // last_seen should NOT be updated (RCON unreliable)
            expect(player2.last_seen).toBe(lastSeen1);
        });

        it('should include RCON info in watchdog config', () => {
            playerTracker.rconConsecutiveFailures = 1;
            playerTracker.rconOnlinePlayers.add('Player1');

            const config = playerTracker.getWatchdogConfig();

            expect(config.rconPollIntervalMs).toBeDefined();
            expect(config.rconMaxFailures).toBe(3);
            expect(config.rconConsecutiveFailures).toBe(1);
            expect(config.rconReliable).toBe(true);
            expect(config.rconOnlineCount).toBe(1);
        });

        it('should stop RCON polling on shutdown', async () => {
            // Start RCON polling
            playerTracker.startRconPolling();
            expect(playerTracker.rconPollInterval).toBeDefined();

            // Shutdown
            await playerTracker.shutdown();

            // RCON polling should be stopped
            expect(playerTracker.rconPollInterval).toBeNull();

            // Re-initialize for cleanup
            database.initialize();
        });
    });

    describe('RCON-based zombie session cleanup', () => {
        it('should remove sessions not in RCON list after timeout', async () => {
            // Set short timeout for testing
            playerTracker.setSessionTimeout(2000); // 2 seconds

            // Add a player
            await playerTracker.playerJoined('ZombiePlayer');
            expect(playerTracker.activeSessions.size).toBe(1);

            // Mock RCON to return empty player list (player not on server)
            rconService.getPlayers.mockResolvedValue({
                online: 0,
                max: 20,
                players: []
            });
            await playerTracker.pollRconOnlinePlayers();

            // Manually set last_seen to old timestamp
            const player = database.getPlayerByUsername('ZombiePlayer');
            const oldTimestamp = new Date(Date.now() - 5000).toISOString(); // 5 seconds ago
            database.setLastSeen(player.uuid, oldTimestamp);

            // Run heartbeat (won't update last_seen because player not in RCON list)
            playerTracker.updateActiveSessions();

            // Wait for watchdog async operation
            await new Promise(resolve => setTimeout(resolve, 100));

            // Session should be removed by watchdog
            expect(playerTracker.activeSessions.size).toBe(0);

            // Reset timeout
            playerTracker.setSessionTimeout(180000);
        });

        it('should keep sessions that are in RCON list', async () => {
            // Set short timeout
            playerTracker.setSessionTimeout(2000);

            // Add a player
            await playerTracker.playerJoined('ActivePlayer');
            expect(playerTracker.activeSessions.size).toBe(1);

            // Mock RCON to return this player
            rconService.getPlayers.mockResolvedValue({
                online: 1,
                max: 20,
                players: ['ActivePlayer']
            });
            await playerTracker.pollRconOnlinePlayers();

            // Manually set last_seen to old timestamp
            const player = database.getPlayerByUsername('ActivePlayer');
            const oldTimestamp = new Date(Date.now() - 5000).toISOString();
            database.setLastSeen(player.uuid, oldTimestamp);

            // Run heartbeat (will update last_seen because player IS in RCON list)
            playerTracker.updateActiveSessions();

            // Wait for watchdog
            await new Promise(resolve => setTimeout(resolve, 100));

            // Session should still be active (last_seen was updated)
            const updatedPlayer = database.getPlayerByUsername('ActivePlayer');
            expect(updatedPlayer.last_seen).not.toBe(oldTimestamp); // Should be updated
            expect(playerTracker.activeSessions.size).toBe(1);

            // Cleanup
            await playerTracker.playerLeft('ActivePlayer');
            playerTracker.setSessionTimeout(180000);
        });
    });
});

