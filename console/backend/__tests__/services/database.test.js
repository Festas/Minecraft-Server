const database = require('../../services/database');
const fs = require('fs');
const path = require('path');

describe('DatabaseService', () => {
    const testDbPath = path.join(__dirname, '../../data/test-players.db');

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

    describe('initialize', () => {
        it('should create database file', () => {
            expect(fs.existsSync(testDbPath)).toBe(true);
        });

        it('should create players table', () => {
            const stmt = database.db.prepare(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='players'
            `);
            const result = stmt.get();
            expect(result).toBeDefined();
            expect(result.name).toBe('players');
        });
    });

    describe('upsertPlayer', () => {
        it('should insert a new player', () => {
            const uuid = '12345678-1234-1234-1234-123456789abc';
            const username = 'TestPlayer';
            const timestamp = new Date().toISOString();

            const player = database.upsertPlayer(uuid, username, timestamp);

            expect(player).toBeDefined();
            expect(player.uuid).toBe(uuid);
            expect(player.username).toBe(username);
        });

        it('should update existing player username', () => {
            const uuid = '12345678-1234-1234-1234-123456789abc';
            const timestamp = new Date().toISOString();

            // Insert with old username
            database.upsertPlayer(uuid, 'OldName', timestamp);

            // Update with new username
            const player = database.upsertPlayer(uuid, 'NewName', timestamp);

            expect(player.username).toBe('NewName');
        });
    });

    describe('startSession', () => {
        it('should start a session and increment session count', () => {
            const uuid = '12345678-1234-1234-1234-123456789abc';
            const timestamp = new Date().toISOString();
            const sessionStart = Date.now();

            // Create player
            database.upsertPlayer(uuid, 'TestPlayer', timestamp);

            // Start session
            database.startSession(uuid, sessionStart);

            const player = database.getPlayerByUuid(uuid);
            expect(player.current_session_start).toBe(sessionStart);
            expect(player.session_count).toBe(1);
        });

        it('should increment session count on multiple sessions', () => {
            const uuid = '12345678-1234-1234-1234-123456789abc';
            const timestamp = new Date().toISOString();

            database.upsertPlayer(uuid, 'TestPlayer', timestamp);

            // Start first session
            database.startSession(uuid, Date.now());
            database.endSession(uuid);

            // Start second session
            database.startSession(uuid, Date.now());

            const player = database.getPlayerByUuid(uuid);
            expect(player.session_count).toBe(2);
        });
    });

    describe('endSession', () => {
        it('should end session and update total playtime', (done) => {
            const uuid = '12345678-1234-1234-1234-123456789abc';
            const timestamp = new Date().toISOString();
            const sessionStart = Date.now();

            database.upsertPlayer(uuid, 'TestPlayer', timestamp);
            database.startSession(uuid, sessionStart);

            // Wait a bit to accumulate playtime
            setTimeout(() => {
                const sessionDuration = database.endSession(uuid);
                const player = database.getPlayerByUuid(uuid);

                expect(sessionDuration).toBeGreaterThan(0);
                expect(player.total_playtime_ms).toBeGreaterThan(0);
                expect(player.current_session_start).toBeNull();
                done();
            }, 50);
        });

        it('should return 0 if no active session', () => {
            const uuid = '12345678-1234-1234-1234-123456789abc';
            const timestamp = new Date().toISOString();

            database.upsertPlayer(uuid, 'TestPlayer', timestamp);

            const sessionDuration = database.endSession(uuid);
            expect(sessionDuration).toBe(0);
        });
    });

    describe('updateLastSeen', () => {
        it('should update last_seen timestamp', (done) => {
            const uuid = '12345678-1234-1234-1234-123456789abc';
            const timestamp = new Date().toISOString();

            database.upsertPlayer(uuid, 'TestPlayer', timestamp);

            const initialPlayer = database.getPlayerByUuid(uuid);
            const initialLastSeen = initialPlayer.last_seen;

            // Wait a bit and update
            setTimeout(() => {
                database.updateLastSeen(uuid);
                const updatedPlayer = database.getPlayerByUuid(uuid);

                expect(updatedPlayer.last_seen).not.toBe(initialLastSeen);
                done();
            }, 50);
        });
    });

    describe('getPlayerByUuid', () => {
        it('should retrieve player by UUID', () => {
            const uuid = '12345678-1234-1234-1234-123456789abc';
            const username = 'TestPlayer';
            const timestamp = new Date().toISOString();

            database.upsertPlayer(uuid, username, timestamp);

            const player = database.getPlayerByUuid(uuid);
            expect(player).toBeDefined();
            expect(player.uuid).toBe(uuid);
            expect(player.username).toBe(username);
        });

        it('should return null for non-existent player', () => {
            const player = database.getPlayerByUuid('non-existent-uuid');
            expect(player).toBeUndefined();
        });
    });

    describe('getPlayerByUsername', () => {
        it('should retrieve player by username', () => {
            const uuid = '12345678-1234-1234-1234-123456789abc';
            const username = 'TestPlayer';
            const timestamp = new Date().toISOString();

            database.upsertPlayer(uuid, username, timestamp);

            const player = database.getPlayerByUsername(username);
            expect(player).toBeDefined();
            expect(player.username).toBe(username);
        });
    });

    describe('getAllPlayers', () => {
        it('should return all players sorted by playtime', () => {
            const timestamp = new Date().toISOString();

            // Create multiple players with different playtimes
            database.upsertPlayer('uuid-1', 'Player1', timestamp);
            database.upsertPlayer('uuid-2', 'Player2', timestamp);
            database.upsertPlayer('uuid-3', 'Player3', timestamp);

            // Manually set different playtimes
            database.db.prepare('UPDATE players SET total_playtime_ms = ? WHERE uuid = ?').run(3000, 'uuid-1');
            database.db.prepare('UPDATE players SET total_playtime_ms = ? WHERE uuid = ?').run(1000, 'uuid-2');
            database.db.prepare('UPDATE players SET total_playtime_ms = ? WHERE uuid = ?').run(2000, 'uuid-3');

            const players = database.getAllPlayers();

            expect(players).toHaveLength(3);
            expect(players[0].username).toBe('Player1'); // Highest playtime
            expect(players[1].username).toBe('Player3');
            expect(players[2].username).toBe('Player2'); // Lowest playtime
        });

        it('should return empty array when no players', () => {
            const players = database.getAllPlayers();
            expect(players).toEqual([]);
        });
    });

    describe('getActivePlayers', () => {
        it('should return only players with active sessions', () => {
            const timestamp = new Date().toISOString();
            const sessionStart = Date.now();

            database.upsertPlayer('uuid-1', 'ActivePlayer', timestamp);
            database.upsertPlayer('uuid-2', 'InactivePlayer', timestamp);

            database.startSession('uuid-1', sessionStart);

            const activePlayers = database.getActivePlayers();

            expect(activePlayers).toHaveLength(1);
            expect(activePlayers[0]).toBe('uuid-1');
        });
    });

    describe('getPlayerCount', () => {
        it('should return correct player count', () => {
            expect(database.getPlayerCount()).toBe(0);

            const timestamp = new Date().toISOString();
            database.upsertPlayer('uuid-1', 'Player1', timestamp);
            database.upsertPlayer('uuid-2', 'Player2', timestamp);

            expect(database.getPlayerCount()).toBe(2);
        });
    });

    describe('getPlayersWithStaleSessions', () => {
        it('should return players with stale sessions', (done) => {
            const timestamp = new Date().toISOString();
            const sessionStart = Date.now();

            // Create two players with active sessions
            database.upsertPlayer('uuid-1', 'StalePlayer', timestamp);
            database.upsertPlayer('uuid-2', 'ActivePlayer', timestamp);
            database.startSession('uuid-1', sessionStart);
            database.startSession('uuid-2', sessionStart);

            // Manually set old last_seen for first player (5 seconds ago)
            const oldTimestamp = new Date(Date.now() - 5000).toISOString();
            database.setLastSeen('uuid-1', oldTimestamp);

            // Wait a bit then check for stale sessions (timeout: 2 seconds)
            setTimeout(() => {
                const stalePlayers = database.getPlayersWithStaleSessions(2000);

                expect(stalePlayers).toHaveLength(1);
                expect(stalePlayers[0].username).toBe('StalePlayer');
                expect(stalePlayers[0].uuid).toBe('uuid-1');

                done();
            }, 100);
        });

        it('should return empty array when no stale sessions', () => {
            const timestamp = new Date().toISOString();
            const sessionStart = Date.now();

            database.upsertPlayer('uuid-1', 'ActivePlayer', timestamp);
            database.startSession('uuid-1', sessionStart);
            database.updateLastSeen('uuid-1'); // Update to current time

            const stalePlayers = database.getPlayersWithStaleSessions(60000); // 60 second timeout
            expect(stalePlayers).toEqual([]);
        });

        it('should not return players without active sessions', () => {
            const timestamp = new Date().toISOString();

            // Create player without active session
            database.upsertPlayer('uuid-1', 'InactivePlayer', timestamp);

            const stalePlayers = database.getPlayersWithStaleSessions(1000);
            expect(stalePlayers).toEqual([]);
        });
    });
});
