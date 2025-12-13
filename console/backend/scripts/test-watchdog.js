#!/usr/bin/env node

/**
 * Test script to demonstrate the watchdog functionality
 * 
 * This script simulates:
 * 1. Players joining the server
 * 2. A player disconnecting abruptly without proper leave event
 * 3. The watchdog automatically detecting and removing the stale session
 * 
 * Usage: node scripts/test-watchdog.js
 */

const path = require('path');
const fs = require('fs');

// Setup test database path
const testDbPath = path.join(__dirname, '../data/test-watchdog.db');

// Remove existing test database
if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
}
['-shm', '-wal'].forEach(ext => {
    const walFile = testDbPath + ext;
    if (fs.existsSync(walFile)) {
        fs.unlinkSync(walFile);
    }
});

// Configure services to use test database
const database = require('../services/database');
database.dbPath = testDbPath;

const playerTracker = require('../services/playerTracker');
const mojangService = require('../services/mojang');

// Mock Mojang service for testing
mojangService.getUuid = async (username) => {
    return `test-uuid-${username.toLowerCase()}`;
};

async function main() {
    console.log('='.repeat(60));
    console.log('Player Watchdog Test Script');
    console.log('='.repeat(60));
    console.log();

    // Initialize player tracker
    console.log('1. Initializing player tracker...');
    await playerTracker.initialize();
    
    const config = playerTracker.getWatchdogConfig();
    console.log(`   Watchdog configuration:`);
    console.log(`   - Heartbeat interval: ${config.heartbeatIntervalSeconds}s`);
    console.log(`   - Session timeout: ${config.sessionTimeoutSeconds}s`);
    console.log();

    // Set a short timeout for demonstration (10 seconds)
    console.log('2. Setting short timeout for demonstration (10 seconds)...');
    playerTracker.setSessionTimeout(10000);
    console.log();

    // Simulate players joining
    console.log('3. Simulating players joining...');
    await playerTracker.playerJoined('Player1');
    await playerTracker.playerJoined('Player2');
    await playerTracker.playerJoined('Player3');
    console.log(`   Active sessions: ${playerTracker.activeSessions.size}`);
    console.log();

    // Player1 leaves normally
    console.log('4. Player1 leaves normally...');
    await playerTracker.playerLeft('Player1');
    console.log(`   Active sessions: ${playerTracker.activeSessions.size}`);
    console.log();

    // Simulate Player2 crashing (no leave event, but we manually age the last_seen)
    console.log('5. Simulating Player2 crash (aging last_seen timestamp)...');
    const player2 = database.getPlayerByUsername('Player2');
    const oldTimestamp = new Date(Date.now() - 15000).toISOString(); // 15 seconds ago
    database.db.prepare('UPDATE players SET last_seen = ? WHERE uuid = ?')
        .run(oldTimestamp, player2.uuid);
    console.log(`   Player2 last_seen set to 15 seconds ago`);
    console.log(`   Active sessions: ${playerTracker.activeSessions.size}`);
    console.log();

    // Wait a moment and run watchdog check
    console.log('6. Running watchdog check...');
    playerTracker.checkForStaleSessions();
    
    // Wait for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`   Active sessions after watchdog: ${playerTracker.activeSessions.size}`);
    console.log();

    // Check database state
    console.log('7. Checking database state...');
    const allPlayers = database.getAllPlayers();
    console.log(`   Total players tracked: ${allPlayers.length}`);
    console.log();
    console.log('   Player details:');
    allPlayers.forEach(player => {
        console.log(`   - ${player.username}:`);
        console.log(`     UUID: ${player.uuid}`);
        console.log(`     Active session: ${player.current_session_start ? 'Yes' : 'No'}`);
        console.log(`     Last seen: ${player.last_seen}`);
        console.log(`     Session count: ${player.session_count}`);
    });
    console.log();

    // Verify watchdog worked
    console.log('8. Verification:');
    const player2After = database.getPlayerByUsername('Player2');
    const player3After = database.getPlayerByUsername('Player3');
    
    if (!player2After.current_session_start) {
        console.log('   ✓ Player2 session correctly ended by watchdog');
    } else {
        console.log('   ✗ Player2 session still active (unexpected)');
    }
    
    if (player3After.current_session_start) {
        console.log('   ✓ Player3 session still active (within timeout)');
    } else {
        console.log('   ✗ Player3 session ended (unexpected)');
    }
    console.log();

    // Cleanup
    console.log('9. Shutting down...');
    await playerTracker.shutdown();
    
    console.log();
    console.log('='.repeat(60));
    console.log('Test completed successfully!');
    console.log('='.repeat(60));
    
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
    }
    ['-shm', '-wal'].forEach(ext => {
        const walFile = testDbPath + ext;
        if (fs.existsSync(walFile)) {
            fs.unlinkSync(walFile);
        }
    });
}

main().catch(error => {
    console.error('Error during test:', error);
    process.exit(1);
});
