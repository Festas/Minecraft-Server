# API, SDK & Developer Portal

This document provides comprehensive documentation for the Minecraft Server Console API, SDKs, and Developer Portal.

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Authentication](#authentication)
4. [API Reference](#api-reference)
5. [SDK Usage](#sdk-usage)
6. [Rate Limiting](#rate-limiting)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)
9. [Examples](#examples)

## Overview

The Minecraft Server Console API provides programmatic access to server management, player administration, plugin control, backups, analytics, and more. The API is RESTful, uses JSON for request/response payloads, and supports API key-based authentication for external integrations.

### Features

- **Server Management**: Start, stop, restart server, view status and statistics
- **Player Management**: List players, kick, ban, manage whitelist
- **Plugin Management**: Install, update, remove, enable/disable plugins
- **Backup Management**: Create, restore, download backups
- **Analytics**: Access server analytics and player statistics
- **Automation**: Manage scheduled tasks
- **Webhooks**: Configure inbound and outbound webhooks
- **Commands**: Execute server commands via RCON

### Base URL

All API endpoints are prefixed with `/api`:

```
https://your-server.com/api
```

For local development:
```
http://localhost:3001/api
```

## Getting Started

### 1. Create an API Key

1. Navigate to the Developer Portal in the web console
2. Click "Create New Key"
3. Provide a name for your key
4. Select the required scopes (permissions)
5. Set a rate limit (default: 1000 requests/hour)
6. Optionally set an expiration date
7. Click "Create"
8. **Important**: Copy the API key immediately - it will only be shown once!

### 2. Test Your API Key

Use cURL to test your API key:

```bash
curl -X GET "https://your-server.com/api/server/status" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 3. Integrate into Your Application

See the [SDK Usage](#sdk-usage) section for language-specific examples.

## Authentication

### API Key Authentication

All API requests must include your API key in the `Authorization` header using the Bearer token scheme:

```
Authorization: Bearer YOUR_API_KEY
```

API keys start with the prefix `mcs_` (Minecraft Console Server).

### Scopes

API keys use scope-based permissions. Each endpoint requires specific scopes:

| Scope | Description |
|-------|-------------|
| `server:read` | Read server status and information |
| `server:control` | Start, stop, restart server |
| `players:read` | View player information |
| `players:manage` | Kick, ban, manage players |
| `plugins:read` | View installed plugins |
| `plugins:manage` | Install, update, remove plugins |
| `backups:read` | View backup information |
| `backups:manage` | Create, restore, delete backups |
| `analytics:read` | View analytics and statistics |
| `commands:execute` | Execute server commands |
| `files:read` | Read server files |
| `files:write` | Modify server files |
| `webhooks:read` | View webhook configurations |
| `webhooks:manage` | Create, update, delete webhooks |
| `automation:read` | View automation tasks |
| `automation:manage` | Create, update, delete automation tasks |

### Security Best Practices

- **Never commit API keys** to version control
- **Use environment variables** to store API keys
- **Rotate keys regularly** for enhanced security
- **Use minimal scopes** - only grant permissions your application needs
- **Set expiration dates** for temporary integrations
- **Monitor API usage** in the Developer Portal

## API Reference

### Server Management

#### Get Server Status

Get current server status, player count, and resource usage.

```http
GET /api/server/status
```

**Required Scope**: `server:read`

**Response**:
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

#### Start Server

Start the Minecraft server.

```http
POST /api/server/start
```

**Required Scope**: `server:control`

**Response**:
```json
{
  "success": true,
  "message": "Server starting..."
}
```

#### Stop Server

Stop the Minecraft server gracefully.

```http
POST /api/server/stop
```

**Required Scope**: `server:control`

**Request Body**:
```json
{
  "confirmed": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Server stopping..."
}
```

#### Restart Server

Restart the Minecraft server.

```http
POST /api/server/restart
```

**Required Scope**: `server:control`

**Request Body**:
```json
{
  "confirmed": true
}
```

### Player Management

#### List Players

Get list of online players.

```http
GET /api/players
```

**Required Scope**: `players:read`

**Response**:
```json
{
  "players": [
    {
      "name": "Steve",
      "uuid": "uuid-here",
      "online": true
    }
  ]
}
```

#### Kick Player

Kick a player from the server.

```http
POST /api/players/:player/kick
```

**Required Scope**: `players:manage`

**Request Body**:
```json
{
  "reason": "Violation of server rules"
}
```

#### Ban Player

Ban a player from the server.

```http
POST /api/players/:player/ban
```

**Required Scope**: `players:manage`

**Request Body**:
```json
{
  "reason": "Cheating"
}
```

### Plugin Management

#### List Plugins

Get list of installed plugins.

```http
GET /api/plugins
```

**Required Scope**: `plugins:read`

**Response**:
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

#### Install Plugin

Install a plugin from URL.

```http
POST /api/plugins/install
```

**Required Scope**: `plugins:manage`

**Request Body**:
```json
{
  "url": "https://example.com/plugin.jar",
  "name": "MyPlugin"
}
```

### Backup Management

#### List Backups

Get list of available backups.

```http
GET /api/backups
```

**Required Scope**: `backups:read`

**Response**:
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

#### Create Backup

Create a new backup.

```http
POST /api/backups
```

**Required Scope**: `backups:manage`

**Request Body**:
```json
{
  "name": "my-backup",
  "description": "Backup before update"
}
```

### Analytics

#### Get Dashboard Statistics

Get overview dashboard statistics.

```http
GET /api/analytics/dashboard
```

**Required Scope**: `analytics:read`

**Query Parameters**:
- `startDate` (optional): ISO 8601 date string
- `endDate` (optional): ISO 8601 date string

**Response**:
```json
{
  "success": true,
  "stats": {
    "totalPlayers": 150,
    "activeToday": 25,
    "averagePlaytime": 3600000
  }
}
```

## SDK Usage

### JavaScript/TypeScript

Using `fetch` API:

```javascript
const API_KEY = process.env.MINECRAFT_API_KEY;
const BASE_URL = 'https://your-server.com/api';

async function getServerStatus() {
  const response = await fetch(`${BASE_URL}/server/status`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return await response.json();
}

// Usage
getServerStatus()
  .then(status => console.log('Server status:', status))
  .catch(error => console.error('Error:', error));
```

Using `axios`:

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://your-server.com/api',
  headers: {
    'Authorization': `Bearer ${process.env.MINECRAFT_API_KEY}`
  }
});

// Get server status
const status = await api.get('/server/status');
console.log(status.data);

// Restart server
await api.post('/server/restart', { confirmed: true });
```

### Python

Using `requests` library:

```python
import os
import requests

API_KEY = os.getenv('MINECRAFT_API_KEY')
BASE_URL = 'https://your-server.com/api'

headers = {
    'Authorization': f'Bearer {API_KEY}'
}

def get_server_status():
    response = requests.get(
        f'{BASE_URL}/server/status',
        headers=headers
    )
    response.raise_for_status()
    return response.json()

def restart_server():
    response = requests.post(
        f'{BASE_URL}/server/restart',
        headers=headers,
        json={'confirmed': True}
    )
    response.raise_for_status()
    return response.json()

# Usage
status = get_server_status()
print(f"Server status: {status['status']}")
print(f"Players online: {status['players']['online']}")
```

### Node.js Example Integration

Complete example of a Discord bot that monitors server status:

```javascript
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

// Configuration
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const API_KEY = process.env.MINECRAFT_API_KEY;
const BASE_URL = process.env.MINECRAFT_API_URL;

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Authorization': `Bearer ${API_KEY}` }
});

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] 
});

// Command: /status
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  if (interaction.commandName === 'status') {
    try {
      const { data } = await api.get('/server/status');
      
      const embed = {
        color: data.status === 'running' ? 0x00FF00 : 0xFF0000,
        title: 'Server Status',
        fields: [
          { name: 'Status', value: data.status, inline: true },
          { name: 'Players', value: `${data.players.online}/${data.players.max}`, inline: true },
          { name: 'CPU Usage', value: `${data.cpu}%`, inline: true }
        ],
        timestamp: new Date()
      };
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      await interaction.reply('Failed to fetch server status');
    }
  }
});

client.login(DISCORD_TOKEN);
```

## Rate Limiting

Each API key has a configurable rate limit (default: 1000 requests per hour). Rate limit information is included in response headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1640995200
```

### Handling Rate Limits

When you exceed the rate limit, the API returns a `429 Too Many Requests` response:

```json
{
  "error": "Rate limit exceeded",
  "limit": 1000,
  "reset": 1640995200
}
```

**Best Practice**: Implement exponential backoff and respect the `X-RateLimit-Reset` header.

Example with retry logic:

```javascript
async function apiRequestWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const resetTime = parseInt(response.headers.get('X-RateLimit-Reset'));
        const waitTime = (resetTime - Date.now() / 1000) * 1000;
        
        console.log(`Rate limited. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}
```

## Best Practices

### 1. Error Handling

Always handle errors appropriately:

```javascript
try {
  const response = await fetch('/api/server/status', {
    headers: { 'Authorization': `Bearer ${API_KEY}` }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Unknown error');
  }
  
  const data = await response.json();
  // Process data
} catch (error) {
  console.error('API Error:', error.message);
  // Handle error appropriately
}
```

### 2. Use Environment Variables

Store API keys in environment variables, never hardcode them:

```bash
# .env file
MINECRAFT_API_KEY=mcs_your_api_key_here
MINECRAFT_API_URL=https://your-server.com/api
```

### 3. Implement Caching

Cache responses when appropriate to reduce API calls:

```javascript
const cache = new Map();
const CACHE_TTL = 60000; // 1 minute

async function getCachedServerStatus() {
  const cached = cache.get('server_status');
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await getServerStatus();
  cache.set('server_status', { data, timestamp: Date.now() });
  
  return data;
}
```

### 4. Monitor API Usage

Regularly check your API usage in the Developer Portal to:
- Track request patterns
- Identify anomalies
- Optimize your integration
- Plan for rate limit increases

## Troubleshooting

### Common Issues

#### 401 Unauthorized

**Problem**: API returns 401 status code.

**Causes**:
- Invalid or expired API key
- Missing Authorization header
- Incorrect header format

**Solution**:
```bash
# Verify your API key format
curl -X GET "https://your-server.com/api/server/status" \
  -H "Authorization: Bearer mcs_your_key_here" \
  -v
```

#### 403 Forbidden

**Problem**: API returns 403 status code.

**Causes**:
- API key lacks required scope
- Endpoint requires higher permissions

**Solution**: Check that your API key has the necessary scopes in the Developer Portal.

#### 429 Too Many Requests

**Problem**: Rate limit exceeded.

**Solution**: Implement rate limiting handling (see [Rate Limiting](#rate-limiting) section).

#### Connection Refused

**Problem**: Cannot connect to API.

**Causes**:
- Server is down
- Incorrect base URL
- Network/firewall issues

**Solution**:
```bash
# Test connectivity
curl -X GET "https://your-server.com/api/session"

# Check DNS resolution
nslookup your-server.com
```

### Debug Mode

Enable verbose logging in your application:

```javascript
const DEBUG = process.env.DEBUG === 'true';

async function apiCall(endpoint, options) {
  if (DEBUG) {
    console.log('Request:', endpoint, options);
  }
  
  const response = await fetch(endpoint, options);
  
  if (DEBUG) {
    console.log('Response:', response.status, await response.text());
  }
  
  return response;
}
```

## Examples

### Complete Application Examples

#### 1. Server Status Dashboard (React)

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    'Authorization': `Bearer ${process.env.REACT_APP_API_KEY}`
  }
});

function ServerDashboard() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { data } = await api.get('/server/status');
        setStatus(data);
      } catch (error) {
        console.error('Failed to fetch status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Update every 30s
    
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!status) return <div>Failed to load server status</div>;

  return (
    <div className="dashboard">
      <h1>Server Status</h1>
      <div className="status-card">
        <span className={`status-indicator ${status.status}`}>
          {status.status}
        </span>
        <div className="players">
          {status.players.online} / {status.players.max} players
        </div>
        <div className="resources">
          <div>CPU: {status.cpu}%</div>
          <div>Memory: {status.memory.used}MB / {status.memory.total}MB</div>
        </div>
      </div>
    </div>
  );
}

export default ServerDashboard;
```

#### 2. Automated Backup Script (Python)

```python
#!/usr/bin/env python3
import os
import sys
import requests
from datetime import datetime

API_KEY = os.getenv('MINECRAFT_API_KEY')
BASE_URL = os.getenv('MINECRAFT_API_URL')

def create_backup():
    """Create a backup with timestamp"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    response = requests.post(
        f'{BASE_URL}/backups',
        headers={'Authorization': f'Bearer {API_KEY}'},
        json={
            'name': f'auto_backup_{timestamp}',
            'description': f'Automated backup created at {timestamp}'
        }
    )
    
    response.raise_for_status()
    return response.json()

def cleanup_old_backups(keep=10):
    """Keep only the most recent N backups"""
    response = requests.get(
        f'{BASE_URL}/backups',
        headers={'Authorization': f'Bearer {API_KEY}'}
    )
    
    response.raise_for_status()
    backups = response.json()['backups']
    
    # Sort by date, newest first
    backups.sort(key=lambda x: x['date'], reverse=True)
    
    # Delete old backups
    for backup in backups[keep:]:
        requests.delete(
            f'{BASE_URL}/backups/{backup["name"]}',
            headers={'Authorization': f'Bearer {API_KEY}'}
        )
        print(f'Deleted old backup: {backup["name"]}')

if __name__ == '__main__':
    try:
        print('Creating backup...')
        result = create_backup()
        print(f'Backup created: {result["name"]}')
        
        print('Cleaning up old backups...')
        cleanup_old_backups(keep=10)
        
        print('Done!')
    except Exception as e:
        print(f'Error: {e}', file=sys.stderr)
        sys.exit(1)
```

#### 3. Player Activity Monitor (Node.js)

```javascript
const axios = require('axios');
const nodemailer = require('nodemailer');

const api = axios.create({
  baseURL: process.env.MINECRAFT_API_URL,
  headers: { 'Authorization': `Bearer ${process.env.MINECRAFT_API_KEY}` }
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function monitorPlayers() {
  try {
    const { data } = await api.get('/players');
    const onlinePlayers = data.players.filter(p => p.online);
    
    // Alert if no players online for extended period
    if (onlinePlayers.length === 0) {
      await sendAlert('No players online', 'Server might be experiencing issues');
    }
    
    // Check for specific players
    const vipPlayers = ['Steve', 'Alex'];
    const vipOnline = onlinePlayers.filter(p => vipPlayers.includes(p.name));
    
    if (vipOnline.length > 0) {
      console.log('VIP players online:', vipOnline.map(p => p.name).join(', '));
    }
  } catch (error) {
    console.error('Failed to monitor players:', error.message);
    await sendAlert('Monitoring Error', error.message);
  }
}

async function sendAlert(subject, message) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: process.env.ADMIN_EMAIL,
    subject: `Minecraft Server Alert: ${subject}`,
    text: message
  });
}

// Run every 5 minutes
setInterval(monitorPlayers, 5 * 60 * 1000);
monitorPlayers(); // Run immediately
```

## Support

For additional help:

- Check the [API Reference](#api-reference) section
- Review [Common Issues](#troubleshooting)
- Monitor your API usage in the Developer Portal
- Contact your server administrator

## Changelog

### Version 1.0.0 (2024-12-10)

- Initial release of API, SDK, and Developer Portal
- Support for server management, players, plugins, backups, analytics
- API key authentication with scope-based permissions
- Rate limiting and usage tracking
- Interactive developer portal with API playground
- Comprehensive documentation and examples
