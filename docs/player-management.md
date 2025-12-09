# Advanced Player Management

This document describes the advanced player management features available in the Minecraft Server Console, including real-time player information, administrative actions, whitelist management, and action history tracking.

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Permissions](#permissions)
4. [Workflows](#workflows)
5. [API Endpoints](#api-endpoints)
6. [Database Schema](#database-schema)
7. [Troubleshooting](#troubleshooting)

## Overview

The Advanced Player Management system provides comprehensive tools for server administrators and moderators to manage players effectively. It includes:

- **Real-time Player Information**: View detailed stats for all players including playtime, session count, and online status
- **Administrative Actions**: Kick, ban, warn, mute, and teleport players with full audit trails
- **Whitelist Management**: Add, remove, and manage whitelisted players with notes
- **Action History**: Complete audit trail of all administrative actions taken on players
- **RBAC Integration**: Role-based access control ensures proper permission enforcement

## Features

### Player Statistics Dashboard

The player statistics dashboard displays:
- **Online Players**: Currently connected players with real-time status
- **All Players**: Complete list of all players who have ever joined, sorted by playtime
- **Player Cards**: Each player card shows:
  - Minecraft avatar
  - Username
  - Total playtime (formatted)
  - Last seen time (relative)
  - Online status indicator

### Administrative Actions

#### Kick Player
Immediately disconnects a player from the server.
- **Permission Required**: `player:kick` (Moderator+)
- **Supports**: Optional kick reason
- **Audit Trail**: Yes

#### Ban Player
Permanently bans a player from the server.
- **Permission Required**: `player:ban` (Moderator+)
- **Supports**: Optional ban reason
- **Confirmation Required**: Yes
- **Audit Trail**: Yes

#### Warn Player
Sends a warning message to a player.
- **Permission Required**: `player:warn` (Moderator+)
- **Required**: Reason must be provided
- **Notification**: Player receives in-game message
- **Audit Trail**: Yes

#### Mute Player
Prevents a player from sending messages (requires EssentialsX or similar plugin).
- **Permission Required**: `player:mute` (Moderator+)
- **Supports**: 
  - Optional duration (e.g., "1h", "30m")
  - Optional reason
- **Audit Trail**: Yes

#### Unmute Player
Removes mute from a player.
- **Permission Required**: `player:unmute` (Moderator+)
- **Audit Trail**: Yes

#### Teleport Player
Teleports a player to coordinates or another player.
- **Permission Required**: `player:teleport` (Moderator+)
- **Supports**: 
  - Target player name
  - Specific coordinates (x, y, z)
- **Audit Trail**: Yes

### Whitelist Management

The whitelist management system provides:

#### Add to Whitelist
- **Permission Required**: `player:whitelist` (Moderator+)
- **Fields**:
  - Player name (required)
  - Notes (optional) - e.g., "Friend of ServerMember"
- **Actions**:
  - Adds player to Minecraft whitelist via RCON
  - Stores entry in database with metadata
  - Records action in audit trail

#### Remove from Whitelist
- **Permission Required**: `player:whitelist` (Moderator+)
- **Confirmation Required**: Yes
- **Actions**:
  - Removes player from Minecraft whitelist via RCON
  - Marks database entry as inactive
  - Records action in audit trail

#### Whitelist Display
Shows all active whitelist entries with:
- Player username
- Who added them
- When they were added
- Optional notes
- Remove button

### Action History

The action history system tracks all administrative actions:

#### Features
- **Real-time Updates**: Automatically refreshes when new actions are taken
- **Color Coding**: 
  - Red border: Ban, Kick
  - Yellow border: Warn, Mute
  - Green border: Whitelist add, Unmute
- **Information Displayed**:
  - Action type
  - Player affected
  - Administrator who performed the action
  - Timestamp (relative format)
  - Reason (if provided)

#### Filtering
- View all actions across all players
- Filter by specific player (future enhancement)

## Permissions

The player management system uses the following RBAC permissions:

### View Permissions
- `player:view` - View basic player list (All roles)
- `player:view:details` - View detailed player information (Viewer+)
- `player:view:inventory` - View player inventory (Admin+)

### Action Permissions
- `player:kick` - Kick players (Moderator+)
- `player:ban` - Ban players (Moderator+)
- `player:pardon` - Unban players (Moderator+)
- `player:warn` - Warn players (Moderator+)
- `player:mute` - Mute players (Moderator+)
- `player:unmute` - Unmute players (Moderator+)
- `player:teleport` - Teleport players (Moderator+)
- `player:op` - Grant operator status (Admin+)
- `player:deop` - Remove operator status (Admin+)

### Management Permissions
- `player:whitelist` - Manage whitelist (Moderator+)
- `player:action:history` - View action history (Moderator+)

### Role Summary

| Role | View | Kick/Ban/Warn | Mute | Teleport | OP/DeOP | Whitelist | History |
|------|------|---------------|------|----------|---------|-----------|---------|
| Viewer | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Moderator | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ |
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Owner | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## Workflows

### Managing a Disruptive Player

1. **Warn the Player**
   - Enter player name in "Player Management" section
   - Click "Warn" button
   - Enter warning reason
   - Player receives in-game warning message

2. **Escalate to Mute** (if warnings are ignored)
   - Click "Mute" button
   - Enter reason and optional duration
   - Player is prevented from chatting

3. **Escalate to Kick** (if behavior continues)
   - Click "Kick" button
   - Confirm action
   - Player is disconnected

4. **Ban if Necessary** (for serious/repeated violations)
   - Click "Ban" button
   - Enter ban reason
   - Confirm action (requires double confirmation)
   - Player is permanently banned

### Adding Players to Whitelist

1. Navigate to "Whitelist Management" section
2. Enter player name
3. (Optional) Add notes explaining why they're whitelisted
4. Click "Add to Whitelist"
5. Player is added to server whitelist and appears in list

### Reviewing Administrative Actions

1. Navigate to "Action History" section
2. Review recent actions with color-coded entries
3. Click "Refresh" to update list
4. Use filter dropdown to view specific player's history

## API Endpoints

### Player Actions

#### POST /api/players/warn
Warn a player with a message.

**Request Body:**
```json
{
  "player": "PlayerName",
  "reason": "Reason for warning"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Warned PlayerName"
}
```

#### POST /api/players/mute
Mute a player.

**Request Body:**
```json
{
  "player": "PlayerName",
  "reason": "Reason for mute",
  "duration": "1h" // optional
}
```

#### POST /api/players/unmute
Unmute a player.

**Request Body:**
```json
{
  "player": "PlayerName"
}
```

#### POST /api/players/teleport
Teleport a player.

**Request Body (to coordinates):**
```json
{
  "player": "PlayerName",
  "x": 100,
  "y": 64,
  "z": 200
}
```

**Request Body (to player):**
```json
{
  "player": "PlayerName",
  "target": "TargetPlayerName"
}
```

### Player Information

#### GET /api/players/:uuid/details
Get detailed information about a specific player.

**Response:**
```json
{
  "success": true,
  "player": {
    "uuid": "...",
    "username": "PlayerName",
    "avatar": "https://mc-heads.net/avatar/PlayerName/128",
    "first_seen": "2024-01-01T00:00:00.000Z",
    "last_seen": "2024-12-09T17:00:00.000Z",
    "total_playtime_ms": 3600000,
    "formattedPlaytime": "1h 0m",
    "session_count": 5,
    "isOnline": true
  },
  "actionHistory": [...]
}
```

#### GET /api/players/:uuid/history
Get action history for a specific player.

**Query Parameters:**
- `limit` - Maximum number of actions to return (default: 50)

**Response:**
```json
{
  "success": true,
  "uuid": "...",
  "actions": [
    {
      "id": 1,
      "player_uuid": "...",
      "player_username": "PlayerName",
      "action_type": "warn",
      "performed_by": "AdminName",
      "performed_at": "2024-12-09T17:00:00.000Z",
      "reason": "Spamming chat"
    }
  ],
  "count": 1
}
```

#### GET /api/players/actions/all
Get all player actions (admin audit).

**Query Parameters:**
- `limit` - Maximum number of actions to return (default: 100)

### Whitelist Management

#### GET /api/players/whitelist
Get all active whitelist entries.

**Response:**
```json
{
  "success": true,
  "whitelist": [
    {
      "id": 1,
      "player_uuid": "...",
      "player_username": "PlayerName",
      "added_by": "AdminName",
      "added_at": "2024-12-09T17:00:00.000Z",
      "notes": "Friend of ServerMember",
      "is_active": 1
    }
  ],
  "count": 1
}
```

#### POST /api/players/whitelist/add
Add a player to the whitelist.

**Request Body:**
```json
{
  "player": "PlayerName",
  "notes": "Optional notes"
}
```

#### POST /api/players/whitelist/remove
Remove a player from the whitelist.

**Request Body:**
```json
{
  "player": "PlayerName"
}
```

## Database Schema

### players Table
Existing table for player tracking.

```sql
CREATE TABLE players (
    uuid TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    total_playtime_ms INTEGER DEFAULT 0,
    session_count INTEGER DEFAULT 0,
    current_session_start INTEGER
);
```

### player_actions Table
Tracks all administrative actions taken on players.

```sql
CREATE TABLE player_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_uuid TEXT NOT NULL,
    player_username TEXT NOT NULL,
    action_type TEXT NOT NULL,
    action_details TEXT,
    performed_by TEXT NOT NULL,
    performed_at TEXT NOT NULL,
    reason TEXT,
    FOREIGN KEY (player_uuid) REFERENCES players(uuid)
);
```

**Indexes:**
- `idx_action_player` on `(player_uuid, performed_at DESC)`

**Action Types:**
- `kick` - Player was kicked
- `ban` - Player was banned
- `pardon` - Player was unbanned
- `warn` - Player was warned
- `mute` - Player was muted
- `unmute` - Player was unmuted
- `teleport` - Player was teleported
- `whitelist_add` - Player was added to whitelist
- `whitelist_remove` - Player was removed from whitelist

### whitelist Table
Manages server whitelist with metadata.

```sql
CREATE TABLE whitelist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_uuid TEXT UNIQUE NOT NULL,
    player_username TEXT NOT NULL,
    added_by TEXT NOT NULL,
    added_at TEXT NOT NULL,
    notes TEXT,
    is_active INTEGER DEFAULT 1
);
```

**Indexes:**
- `idx_whitelist_uuid` on `player_uuid`

## Troubleshooting

### Common Issues

#### "Failed to get UUID" Error
**Cause**: Unable to fetch player UUID from Mojang API or player doesn't exist.

**Solution**:
1. Verify player name spelling is correct (case-sensitive)
2. Check if player has a valid Minecraft account
3. Check server internet connectivity
4. Wait a few seconds and retry (Mojang API may be rate-limited)

#### "Failed to mute player" Error
**Cause**: Server doesn't have EssentialsX or compatible plugin installed.

**Solution**:
1. Install EssentialsX plugin with mute functionality
2. Use alternative punishment methods (kick/ban)
3. Check plugin compatibility

#### Whitelist Not Syncing
**Cause**: Database and server whitelist may be out of sync.

**Solution**:
1. Use the console interface (which uses RCON) rather than manual file edits
2. Run `whitelist reload` from console if manual changes were made
3. Check RCON connectivity

#### Action History Not Showing
**Cause**: Database permissions or initialization issue.

**Solution**:
1. Check browser console for JavaScript errors
2. Verify API endpoint is accessible: `/api/players/actions/all`
3. Check backend logs for database errors
4. Verify user has `player:action:history` permission

#### Permission Denied Errors
**Cause**: User role doesn't have required permission.

**Solution**:
1. Review [Permissions](#permissions) section for role requirements
2. Contact server owner to request role upgrade
3. Check user management console to verify current role

### Debug Mode

To enable debug logging for player management:

1. Check backend console logs for detailed error messages
2. Open browser DevTools (F12) → Console tab for frontend errors
3. Check Network tab to see API request/response details
4. Review `/console/backend/data/audit.log` for security events

### Best Practices

1. **Always provide reasons** for administrative actions - helps with dispute resolution
2. **Use escalating punishments** - warn → mute → kick → ban
3. **Review action history regularly** - ensure consistency in enforcement
4. **Document whitelist notes** - helps track why players were whitelisted
5. **Coordinate with other moderators** - check action history before taking action
6. **Back up player database** - includes whitelist and action history

## Integration with Other Systems

### Audit Logging
All player management actions are automatically logged to:
- **Database**: `player_actions` table for searchable history
- **Audit Log**: `/console/backend/data/audit.log` for security compliance
- **Console Output**: Server logs for real-time monitoring

### RBAC System
Player management respects the global RBAC system:
- All actions check permissions via middleware
- Frontend UI shows/hides controls based on user role
- API endpoints enforce permissions at backend

### WebSocket Integration
Player status updates are pushed in real-time via WebSocket:
- Player join/leave events
- Online status updates
- Session tracking

## Future Enhancements

Planned features for future releases:
- Player inventory viewer (requires plugin integration)
- Player health/XP display in real-time
- Advanced filtering for action history
- Export action history to CSV
- Scheduled unmute/unban functionality
- Player notes/warnings system
- IP ban support
- Temporary ban support with duration

## Support

For issues or questions:
1. Check this documentation
2. Review troubleshooting section
3. Check GitHub issues
4. Contact server owner/administrator

---

**Version**: 1.0.0  
**Last Updated**: December 9, 2024  
**Related Documentation**: 
- [User Management](./user-management.md)
- [API Documentation](./API.md)
- [RBAC Guide](../IMPLEMENTATION_SUMMARY_RBAC.md)
