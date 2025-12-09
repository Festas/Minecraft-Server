# Player Tracking System

## Overview

The player tracking system maintains a comprehensive database of all players who have ever joined the server, tracking their playtime, session history, and online status. The system is designed to be crash-resilient and require no manual intervention.

## Architecture

### Components

1. **SQLite Database** (`services/database.js`)
   - Persistent storage for all player data
   - WAL (Write-Ahead Logging) mode for crash resilience
   - Automatic schema creation and migration

2. **Player Tracker Service** (`services/playerTracker.js`)
   - Manages player sessions and events
   - Periodic heartbeat updates (every 60 seconds)
   - Graceful shutdown handling

3. **Mojang API Service** (`services/mojang.js`)
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
1. Player tracker iterates through active sessions
2. Database updates `last_seen` timestamp for each active player
3. Ensures accurate tracking even if player doesn't disconnect properly

### Player Disconnect

1. Log service detects "PlayerName left the game" message
2. Player tracker receives `player-left` event
3. Session duration calculated
4. Total playtime updated
5. Session marked as ended (current_session_start set to NULL)
6. Last seen timestamp updated

### Crash Recovery

- All writes are immediate (no debouncing)
- WAL mode ensures database consistency
- Heartbeat ensures recent activity is recorded
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

Configured in `playerTracker.js`:

```javascript
this.heartbeatIntervalMs = 60000; // 60 seconds
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

## Future Enhancements

Potential improvements:
- Player achievements and milestones
- Daily/weekly/monthly playtime statistics
- Player rank system based on playtime
- Session history (individual session records)
- Player location tracking (last known coordinates)
- Death statistics
- Block break/place statistics
