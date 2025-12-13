# Player Tracking System

## Overview

The player tracking system maintains a comprehensive database of all players who have ever joined the server, tracking their playtime, session history, and online status. The system is designed to be crash-resilient and require no manual intervention.

**Key Features:**
- **RCON-based tracking:** Uses Minecraft server as source of truth for online status
- **Zombie session detection:** Automatically removes players who disconnect abruptly
- **Error tolerance:** Handles temporary RCON failures gracefully
- **Comprehensive logging:** Detailed logs for troubleshooting and monitoring

## Requirements

1. **RCON enabled on Minecraft server** with proper configuration:
   - `enable-rcon=true` in `server.properties`
   - Valid `rcon.password` set
   - `rcon.port` accessible (default: 25575)

2. **Environment variables configured:**
   - `RCON_HOST`: Minecraft server hostname (default: `minecraft-server`)
   - `RCON_PORT`: RCON port (default: `25575`)
   - `RCON_PASSWORD`: RCON password (must match server.properties)

3. **Network connectivity:** Console backend must be able to reach Minecraft server's RCON port

## Architecture

### Components

1. **SQLite Database** (`services/database.js`)
   - Persistent storage for all player data
   - WAL (Write-Ahead Logging) mode for crash resilience
   - Automatic schema creation and migration

2. **Player Tracker Service** (`services/playerTracker.js`)
   - Manages player sessions and events
   - RCON-based online player polling (every 60 seconds)
   - Periodic heartbeat watchdog checks
   - Graceful shutdown handling

3. **RCON Service** (`services/rcon.js`)
   - Communicates with Minecraft server via RCON protocol
   - Polls `/list` command for actual online players
   - Automatic reconnection on connection loss
   - Used as source of truth for online status

4. **Mojang API Service** (`services/mojang.js`)
   - Fetches player UUIDs from Mojang API
   - Caches results to minimize API calls
   - Fallback UUID generation for offline mode

### Database Schema

```sql
CREATE TABLE players (
    uuid TEXT PRIMARY KEY,              -- Minecraft player UUID
    username TEXT NOT NULL,             -- Latest username
    first_seen TEXT NOT NULL,           -- ISO timestamp of first join
    last_seen TEXT NOT NULL,            -- ISO timestamp of last activity
    total_playtime_ms INTEGER DEFAULT 0,-- Cumulative playtime in milliseconds
    session_count INTEGER DEFAULT 0,    -- Total number of sessions
    current_session_start INTEGER       -- Unix timestamp of current session (NULL if offline)
)
```

### Indexes

- `idx_username`: For username lookups
- `idx_last_seen`: For sorting by last activity
- `idx_playtime`: For sorting by total playtime

## Data Flow

### Player Join

1. Log service detects "PlayerName joined the game" message
2. Player tracker receives `player-joined` event
3. Mojang API service fetches player UUID (or uses cached value)
4. Database creates/updates player record
5. Session starts with current timestamp
6. Session count increments

### Player Heartbeat

Every 60 seconds:
1. **RCON polls the Minecraft server** to get the actual list of online players via `/list` command
2. Player tracker **only updates `last_seen`** for players confirmed by RCON
3. Players not in the RCON list do NOT get their `last_seen` updated
4. **Watchdog checks for stale sessions** (players with `last_seen` older than timeout)

### Player Disconnect

1. Log service detects "PlayerName left the game" message
2. Player tracker receives `player-left` event
3. Session duration calculated
4. Total playtime updated
5. Session marked as ended (current_session_start set to NULL)
6. Last seen timestamp updated

### Watchdog: Automatic Timeout Detection with RCON Integration

**Problem:** Players who disconnect abruptly (crash, network loss, abrupt client termination) remain online in the backend indefinitely because no `player-left` event is triggered. The old system updated `last_seen` for ALL active sessions indiscriminately, preventing timeout detection.

**Solution:** RCON-based tracking with intelligent watchdog:

1. **RCON Polling** (every 60 seconds by default):
   - Polls Minecraft server via RCON `/list` command to get actual online players
   - Caches the list of RCON-confirmed online players
   - Includes error tolerance (3 consecutive failures allowed by default)

2. **Selective Last Seen Updates**:
   - **Only** updates `last_seen` for players confirmed by RCON as online
   - Players NOT in RCON list stop getting `last_seen` updates
   - This allows their timestamp to become stale naturally

3. **Watchdog Detection** (runs every heartbeat):
   - Query database for players with active sessions where `last_seen` exceeds timeout threshold
   - Default timeout: **3 minutes** (180 seconds) of inactivity
   - Automatically call `playerLeft()` for stale sessions
   - Comprehensive logging with player details, timeout duration, and reason

4. **Error Tolerance**:
   - Allows up to 3 consecutive RCON failures before considering RCON unreliable
   - During RCON failures: NO `last_seen` updates (prevents false timeouts)
   - Automatically recovers when RCON connection is restored

**Configuration:**
- Heartbeat interval: 60 seconds (configurable via `PLAYER_HEARTBEAT_INTERVAL_MS`)
- Session timeout: 3 minutes (configurable via `PLAYER_SESSION_TIMEOUT_MS`)
- RCON poll interval: 60 seconds (configurable via `RCON_POLL_INTERVAL_MS`)
- RCON max failures: 3 (configurable via `RCON_MAX_FAILURES`)
- Use `setSessionTimeout(ms)` to adjust timeout programmatically

**Logging:**
- `console.log()` for successful RCON polls with player count
- `console.warn()` for RCON connection failures with retry count
- `console.warn()` for each stale session detected with full details:
  - Player username and UUID
  - Last seen timestamp and minutes elapsed
  - Timeout threshold
  - Removal reason
- `console.log()` with ✓ when player successfully removed (zombie cleanup)
- `console.error()` if automatic removal fails

### Crash Recovery

- All writes are immediate (no debouncing)
- WAL mode ensures database consistency
- Heartbeat ensures recent activity is recorded
- **Watchdog automatically removes ghost sessions** caused by crashes
- On restart, active sessions are automatically closed during shutdown

## API Endpoints

### GET `/api/players/all`

Returns all players with their statistics.

**Response:**

```json
{
  "success": true,
  "players": [
    {
      "uuid": "12345678-1234-1234-1234-123456789abc",
      "username": "PlayerName",
      "avatar": "https://mc-heads.net/avatar/PlayerName/48",
      "first_seen": "2024-01-01T00:00:00.000Z",
      "last_seen": "2024-01-02T12:34:56.789Z",
      "total_playtime_ms": 3600000,
      "session_count": 5,
      "isOnline": true,
      "formattedPlaytime": "1h 0m"
    }
  ],
  "totalPlayers": 100,
  "onlineCount": 5,
  "maxPlayers": 20
}
```

**Fields:**

- `uuid`: Minecraft player UUID (from Mojang API)
- `username`: Latest known username
- `avatar`: URL to player's Minecraft skin avatar (48x48px)
- `first_seen`: ISO timestamp of first join
- `last_seen`: ISO timestamp of last activity
- `total_playtime_ms`: Cumulative playtime in milliseconds
- `session_count`: Total number of sessions
- `isOnline`: Whether player is currently online
- `formattedPlaytime`: Human-readable playtime (e.g., "2d 5h", "3h 45m", "30m")

**Sorting:**

Players are sorted by total playtime in descending order (most active first).

## Frontend Display

The console frontend displays two lists:

1. **Online Players**: Currently connected players with online indicator
2. **All Players**: All players who have ever joined, sorted by playtime

Each player card shows:
- Avatar image (from mc-heads.net)
- Username with online badge (●) if connected
- Total playtime
- Last seen timestamp (relative time or "Online now")

## Configuration

### Heartbeat Interval

Controls how often the watchdog checks for stale sessions (NOT when `last_seen` is updated - that's controlled by RCON polling).

**Environment variable:**
```bash
PLAYER_HEARTBEAT_INTERVAL_MS=60000  # Default: 60 seconds
```

**Default in code:**
```javascript
this.heartbeatIntervalMs = 60000; // 60 seconds
```

### Session Timeout (Watchdog)

Controls how long a player can be inactive before being automatically removed.

**Environment variable:**
```bash
PLAYER_SESSION_TIMEOUT_MS=180000  # Default: 3 minutes (180 seconds)
```

**Default in code:**
```javascript
this.sessionTimeoutMs = 180000; // 3 minutes (180 seconds)
```

**Adjusting timeout at runtime:**

```javascript
playerTracker.setSessionTimeout(300000); // Set to 5 minutes
```

### RCON Polling Interval

Controls how often the system polls the Minecraft server for actual online players.

**Environment variable:**
```bash
RCON_POLL_INTERVAL_MS=60000  # Default: 60 seconds
```

**Default in code:**
```javascript
this.rconPollIntervalMs = 60000; // 60 seconds
```

**Recommendation:** Keep RCON poll interval equal to or less than heartbeat interval for optimal accuracy.

### RCON Error Tolerance

Controls how many consecutive RCON failures are tolerated before considering RCON unreliable.

**Environment variable:**
```bash
RCON_MAX_FAILURES=3  # Default: 3 consecutive failures
```

**Default in code:**
```javascript
this.rconMaxFailures = 3; // 3 failures
```

**Behavior:** When RCON failures exceed this threshold, the system stops updating `last_seen` timestamps to prevent false timeouts during RCON connection issues.

### Getting Current Configuration

```javascript
const config = playerTracker.getWatchdogConfig();
// Returns: {
//   heartbeatIntervalMs: 60000,
//   sessionTimeoutMs: 180000,
//   heartbeatIntervalSeconds: 60,
//   sessionTimeoutSeconds: 180,
//   rconPollIntervalMs: 60000,
//   rconPollIntervalSeconds: 60,
//   rconMaxFailures: 3,
//   rconConsecutiveFailures: 0,
//   rconReliable: true,
//   rconLastPollTime: 1702461234567,
//   rconLastSuccessTime: 1702461234567,
//   rconOnlineCount: 2
// }
```

### Database Location

Configured in `database.js`:

```javascript
this.dbPath = path.join(__dirname, '../data/players.db');
```

### Mojang API Cache

Configured in `mojang.js`:

```javascript
this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
```

## Error Handling

### Mojang API Failures

If the Mojang API is unavailable or returns an error:
1. A deterministic fallback UUID is generated based on username hash
2. Player tracking continues normally
3. UUID will be corrected on next successful API call

### Database Errors

- All database operations are wrapped in try-catch blocks
- Errors are logged but don't crash the service
- Graceful degradation when database is unavailable

### Session Recovery

On server restart:
1. All active sessions are properly closed during shutdown
2. Total playtime is updated for each active session
3. Fresh tracking begins on next startup

## Testing

### Unit Tests

- `__tests__/services/database.test.js`: Database operations
- `__tests__/services/mojang.test.js`: UUID fetching and caching
- `__tests__/services/playerTracker.test.js`: Session tracking and events

Run tests:

```bash
npm test
```

### Integration Testing

The system is tested against real Minecraft server logs to ensure proper event detection and tracking.

## Maintenance

### Backup

The SQLite database file is located at `console/backend/data/players.db`.

To backup:
```bash
cp console/backend/data/players.db console/backend/data/players.db.backup
```

### Database Inspection

Use SQLite CLI to inspect the database:

```bash
sqlite3 console/backend/data/players.db

# Example queries:
SELECT * FROM players ORDER BY total_playtime_ms DESC LIMIT 10;
SELECT COUNT(*) FROM players WHERE current_session_start IS NOT NULL;
```

### Performance

The database uses indexes for efficient queries:
- Username lookups: O(log n)
- Playtime sorting: O(n log n)
- Last seen sorting: O(n log n)

For large player counts (>10,000), consider adding pagination to the API endpoint.

## Migration from Legacy System

The old `player-stats.json` file is no longer used. The new system starts with a fresh database.

To manually import old data (if needed):
1. Read old JSON file
2. For each player, call `database.upsertPlayer()` with UUID and username
3. Use Mojang API to fetch correct UUIDs
4. Update total_playtime_ms and session_count manually

## Client Integration & Heartbeat Recommendations

### For API Clients and Plugins

If you're integrating with the player tracking system via API or custom plugins:

**Important:** The system now uses **RCON-based tracking**. The `last_seen` timestamp is ONLY updated for players confirmed by RCON as online. Manual `last_seen` updates are generally NOT needed.

**How the system works:**

1. **RCON Polling:** Every 60 seconds, the system polls the Minecraft server via RCON `/list` to get actual online players
2. **Selective Updates:** Only players in the RCON list get their `last_seen` timestamp updated
3. **Automatic Cleanup:** Players not in the RCON list eventually timeout and are automatically removed

**Recommendations for external integrations:**

1. **Don't manually update `last_seen`:** The RCON system handles this automatically
2. **Rely on RCON:** Trust the Minecraft server as the source of truth for online status
3. **Session timeout awareness:** Players are removed after 3 minutes without RCON confirmation
4. **Event-based tracking:** Use `player-joined` and `player-left` events for custom logic
5. **RCON requirements:** Ensure RCON is properly configured and accessible

**When to manually update `last_seen` (rare cases):**

Only if you have a custom system that bypasses RCON entirely:

```javascript
// Only needed for non-RCON custom integrations (not recommended)
database.updateLastSeen(playerUuid);
```

**Note:** The RCON-based system is self-sufficient and requires no manual intervention for standard Minecraft server setups. External heartbeat calls are unnecessary and may interfere with zombie session detection.

## Future Enhancements

Potential improvements:
- Player achievements and milestones
- Daily/weekly/monthly playtime statistics
- Player rank system based on playtime
- Session history (individual session records)
- Player location tracking (last known coordinates)
- Death statistics
- Block break/place statistics
