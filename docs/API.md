# API Documentation

This document describes the REST API endpoints available in the Minecraft Server Web Console.

## Base URL

All API endpoints are prefixed with `/api`.

## Authentication

Most endpoints require authentication. Authentication is handled via session cookies.

### Login

**POST** `/api/login`

Authenticate a user and create a session.

**Rate Limit:** 5 requests per 15 minutes

**Request Body:**
```json
{
  "username": "admin",
  "password": "your-password"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful"
}
```

**Response (401 Unauthorized):**
```json
{
  "error": "Invalid credentials"
}
```

### Logout

**POST** `/api/logout`

Destroy the current session.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Check Session

**GET** `/api/session`

Check if the current session is authenticated.

**Response (200 OK):**
```json
{
  "authenticated": true,
  "username": "admin"
}
```

### Get CSRF Token

**GET** `/api/csrf-token`

Get a CSRF token for making authenticated requests.

**Response (200 OK):**
```json
{
  "csrfToken": "your-csrf-token"
}
```

## Server Management

All server management endpoints require authentication.

**Rate Limit:** 20 requests per minute

### Get Server Status

**GET** `/api/server/status`

Get the current status of the Minecraft server.

**Response (200 OK):**
```json
{
  "status": "running",
  "players": {
    "online": 5,
    "max": 20
  },
  "cpu": 45.2,
  "memory": {
    "used": 2048,
    "total": 4096
  },
  "uptime": 3600
}
```

### Start Server

**POST** `/api/server/start`

Start the Minecraft server.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Server starting..."
}
```

### Stop Server

**POST** `/api/server/stop`

Stop the Minecraft server gracefully.

**Request Body:**
```json
{
  "confirmed": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Server stopping..."
}
```

### Restart Server

**POST** `/api/server/restart`

Restart the Minecraft server.

**Request Body:**
```json
{
  "confirmed": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Server restarting..."
}
```

### Kill Server

**POST** `/api/server/kill`

Force kill the server (emergency only).

**Request Body:**
```json
{
  "confirmed": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Server killed"
}
```

### Save Worlds

**POST** `/api/server/save`

Save all world data.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Worlds saved"
}
```

### Create Backup

**POST** `/api/server/backup`

Create a manual backup of the server.

**Rate Limit:** 2 requests per 5 minutes

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Backup completed successfully"
}
```

## Command Execution

All command endpoints require authentication.

**Rate Limit:** 30 requests per minute

### Execute Command

**POST** `/api/commands/execute`

Execute a Minecraft command via RCON.

**Request Body:**
```json
{
  "command": "say Hello, world!",
  "confirmed": false
}
```

For dangerous commands (stop, kill, ban, etc.), set `confirmed: true`.

**Response (200 OK):**
```json
{
  "success": true,
  "response": "Command executed successfully"
}
```

**Response (400 Bad Request - requires confirmation):**
```json
{
  "requiresConfirmation": true,
  "message": "This is a potentially dangerous command. Please confirm."
}
```

### Get Command History

**GET** `/api/commands/history`

Get the command history for the current session.

**Response (200 OK):**
```json
{
  "history": [
    {
      "command": "say Hello",
      "timestamp": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

### Add to Command History

**POST** `/api/commands/history`

Add a command to the history.

**Request Body:**
```json
{
  "command": "say Hello"
}
```

### Get Favorite Commands

**GET** `/api/commands/favorites`

Get favorite commands for the current session.

**Response (200 OK):**
```json
{
  "favorites": [
    {
      "id": "123456789",
      "command": "say Hello",
      "label": "Greeting"
    }
  ]
}
```

### Add Favorite Command

**POST** `/api/commands/favorites`

Add a command to favorites.

**Request Body:**
```json
{
  "command": "say Hello",
  "label": "Greeting"
}
```

### Remove Favorite Command

**DELETE** `/api/commands/favorites/:id`

Remove a command from favorites.

## Player Management

All player endpoints require authentication.

### Get Player List

**GET** `/api/players/list`

Get list of online players.

**Response (200 OK):**
```json
{
  "players": [
    {
      "name": "Steve",
      "uuid": "uuid-here"
    }
  ]
}
```

### Get Player Info

**GET** `/api/players/:player`

Get information about a specific player.

**Response (200 OK):**
```json
{
  "name": "Steve",
  "uuid": "uuid-here",
  "online": true
}
```

### Kick Player

**POST** `/api/players/:player/kick`

Kick a player from the server.

**Request Body:**
```json
{
  "reason": "Violation of server rules"
}
```

### Ban Player

**POST** `/api/players/:player/ban`

Ban a player from the server.

**Request Body:**
```json
{
  "reason": "Cheating"
}
```

### Unban Player

**POST** `/api/players/:player/unban`

Unban a previously banned player.

## Plugin Management

All plugin endpoints require authentication.

### List Plugins

**GET** `/api/plugins/list`

Get list of installed plugins.

**Response (200 OK):**
```json
{
  "plugins": [
    {
      "name": "EssentialsX",
      "version": "2.20.1",
      "enabled": true
    }
  ]
}
```

### Install Plugin

**POST** `/api/plugins/install`

Install a plugin from URL.

**Request Body:**
```json
{
  "url": "https://example.com/plugin.jar",
  "name": "MyPlugin"
}
```

### Enable Plugin

**POST** `/api/plugins/:plugin/enable`

Enable a disabled plugin.

### Disable Plugin

**POST** `/api/plugins/:plugin/disable`

Disable an enabled plugin.

### Delete Plugin

**DELETE** `/api/plugins/:plugin`

Delete a plugin.

## Backup Management

All backup endpoints require authentication.

### List Backups

**GET** `/api/backups/list`

Get list of available backups.

**Response (200 OK):**
```json
{
  "backups": [
    {
      "name": "backup-2024-01-01.zip",
      "size": 1024000,
      "date": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

### Download Backup

**GET** `/api/backups/:name/download`

Download a backup file.

### Restore Backup

**POST** `/api/backups/:name/restore`

Restore from a backup.

**Request Body:**
```json
{
  "confirmed": true
}
```

### Delete Backup

**DELETE** `/api/backups/:name`

Delete a backup file.

## File Management

All file endpoints require authentication.

### List Files

**GET** `/api/files/list`

List files in a directory.

**Query Parameters:**
- `path` - Directory path (default: `/`)

**Response (200 OK):**
```json
{
  "files": [
    {
      "name": "server.properties",
      "type": "file",
      "size": 1024
    }
  ]
}
```

### Read File

**GET** `/api/files/read`

Read file contents.

**Query Parameters:**
- `path` - File path

**Response (200 OK):**
```json
{
  "content": "file contents here"
}
```

### Write File

**POST** `/api/files/write`

Write to a file.

**Request Body:**
```json
{
  "path": "config.yml",
  "content": "new content"
}
```

### Delete File

**DELETE** `/api/files/:path`

Delete a file.

## Error Responses

All endpoints may return error responses in the following format:

**400 Bad Request:**
```json
{
  "error": "Invalid input",
  "errors": [
    {
      "field": "username",
      "message": "Username is required"
    }
  ]
}
```

**401 Unauthorized:**
```json
{
  "error": "Authentication required"
}
```

**403 Forbidden:**
```json
{
  "error": "Invalid CSRF token"
}
```

**404 Not Found:**
```json
{
  "error": "Not Found - /api/invalid"
}
```

**429 Too Many Requests:**
```json
{
  "error": "Too many requests, please try again later"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error"
}
```

## Rate Limiting

Different endpoints have different rate limits:

- **Login:** 5 requests per 15 minutes
- **Commands:** 30 requests per minute
- **Server Control:** 20 requests per minute
- **Backups:** 2 requests per 5 minutes
- **General API:** 100 requests per minute

Rate limit information is included in response headers:
- `RateLimit-Limit` - Maximum requests allowed
- `RateLimit-Remaining` - Requests remaining in window
- `RateLimit-Reset` - Time when limit resets

## WebSocket Events

The console also supports real-time communication via WebSocket.

**Connection URL:** `ws://localhost:3001`

### Events

**Client -> Server:**
- `execute-command` - Execute a command

**Server -> Client:**
- `log` - New log entry
- `logs` - Buffered logs on connect
- `command-result` - Command execution result
- `command-error` - Command execution error
- `error` - General error

## Security

- All API requests (except login and session check) require CSRF token
- CSRF tokens are obtained via `/api/csrf-token`
- Include CSRF token in `x-csrf-token` header or `_csrf` body field
- Sessions expire after inactivity
- Rate limiting is enforced on all endpoints
