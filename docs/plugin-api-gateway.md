# Plugin API Gateway

The Plugin API Gateway provides a unified, scalable abstraction layer for integrating external Minecraft server plugins via REST APIs and WebSockets. This system enables the console to interact with plugins like Dynmap, EssentialsX, and others in a standardized, secure manner.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Core Components](#core-components)
- [Integrated Plugins](#integrated-plugins)
- [Setup & Configuration](#setup--configuration)
- [API Endpoints](#api-endpoints)
- [Security](#security)
- [Extending to New Plugins](#extending-to-new-plugins)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Overview

The Plugin API Gateway is designed to:

- **Provide unified access** to multiple plugin APIs through a single gateway interface
- **Standardize authentication** across different plugins with per-plugin token support
- **Enable scalability** by making it easy to add new plugin integrations
- **Ensure security** through proper authentication, rate limiting, and audit logging
- **Handle errors gracefully** with retry mechanisms and comprehensive logging
- **Support future automation** by exposing well-documented REST endpoints

## Architecture

### High-Level Design

```
Frontend/Automation Tools
         ↓
    REST API Endpoints (/api/plugins/*)
         ↓
    Plugin Integration Routes (routes/pluginIntegrations.js)
         ↓
    Plugin Gateway (services/pluginGateway.js)
         ↓
    Plugin Adapters (services/adapters/*)
         ↓
    External Plugin APIs (Dynmap, EssentialsX, etc.)
```

### Key Principles

1. **Abstraction**: Each plugin has its own adapter that implements a common interface
2. **Configuration**: Per-plugin settings stored in environment variables
3. **Isolation**: Failures in one plugin don't affect others
4. **Observability**: Comprehensive logging and health checks
5. **Security**: Bearer token authentication, CSRF protection, rate limiting

## Core Components

### 1. Plugin Gateway (`services/pluginGateway.js`)

The central orchestrator that manages all plugin adapters.

**Key Features:**
- Register/unregister adapters
- Configure adapters with authentication details
- Route method calls to appropriate adapters
- Aggregate health checks across all plugins
- Handle graceful shutdown

**Example Usage:**
```javascript
const pluginGateway = require('./services/pluginGateway');

// Register an adapter
pluginGateway.registerAdapter('dynmap', dynmapAdapter);

// Configure the adapter
pluginGateway.configure('dynmap', {
    enabled: true,
    baseUrl: 'http://localhost:8123',
    apiToken: 'your-token-here'
});

// Initialize the adapter
await pluginGateway.initialize('dynmap');

// Call a method
const players = await pluginGateway.call('dynmap', 'getPlayers');

// Check health
const health = await pluginGateway.checkHealth('dynmap');
```

### 2. Base Plugin Adapter (`services/adapters/baseAdapter.js`)

Abstract base class that all plugin adapters extend.

**Features:**
- Common configuration management
- HTTP request handling with retries
- Authentication token management
- Health check implementation
- Error formatting

**Interface:**
```javascript
class BasePluginAdapter {
    configure(config)           // Configure the adapter
    initialize()                // Initialize connection to plugin
    isReady()                   // Check if adapter is ready
    checkHealth()               // Perform health check
    makeRequest(method, endpoint, data, options)  // Make HTTP request
    shutdown()                  // Clean up resources
}
```

### 3. Plugin Adapters

Concrete implementations for specific plugins:
- **Dynmap Adapter** (`services/adapters/dynmapAdapter.js`)
- **EssentialsX Adapter** (`services/adapters/essentialsxAdapter.js`)

Each adapter extends `BasePluginAdapter` and implements plugin-specific methods.

### 4. Route Handler (`routes/pluginIntegrations.js`)

Express routes that expose plugin functionality via REST API.

**Features:**
- Authentication via session or Bearer token
- Rate limiting (60 requests/minute)
- CSRF protection for session-based requests
- Audit logging
- Standardized response format

## Integrated Plugins

### Dynmap

Dynmap is a dynamic web-based map for Minecraft servers that provides real-time player positions and world visualization.

**Available Endpoints:**
- `GET /api/plugins/dynmap/players` - Get online players with positions
- `GET /api/plugins/dynmap/worlds` - Get list of available worlds
- `GET /api/plugins/dynmap/world/:worldName` - Get specific world data
- `GET /api/plugins/dynmap/markers/:worldName` - Get markers for a world
- `GET /api/plugins/dynmap/health` - Health check

**Configuration:**
```bash
DYNMAP_ENABLED=true
DYNMAP_BASE_URL=http://localhost:8123
DYNMAP_API_TOKEN=  # Optional
```

**Example Response:**
```json
{
    "success": true,
    "plugin": "dynmap",
    "data": {
        "players": [
            {
                "name": "Player1",
                "displayName": "Player1",
                "world": "world",
                "x": 123.45,
                "y": 64.0,
                "z": -456.78,
                "health": 20,
                "armor": 0
            }
        ],
        "count": 1
    },
    "timestamp": "2024-12-09T15:00:00.000Z"
}
```

### EssentialsX

EssentialsX is a comprehensive essentials plugin that provides player management, economy, and utility features.

**Available Endpoints:**
- `GET /api/plugins/essentialsx/status` - Get server status
- `GET /api/plugins/essentialsx/players` - Get all players
- `GET /api/plugins/essentialsx/players/online` - Get online players
- `GET /api/plugins/essentialsx/player/:identifier` - Get specific player info
- `GET /api/plugins/essentialsx/warps` - Get list of warps
- `GET /api/plugins/essentialsx/kits` - Get list of kits
- `GET /api/plugins/essentialsx/health` - Health check

**Configuration:**
```bash
ESSENTIALSX_ENABLED=true
ESSENTIALSX_BASE_URL=http://localhost:8080
ESSENTIALSX_API_TOKEN=your-api-token-here
```

**Example Response:**
```json
{
    "success": true,
    "plugin": "essentialsx",
    "data": {
        "players": [
            {
                "uuid": "550e8400-e29b-41d4-a716-446655440000",
                "name": "Player1",
                "displayName": "Player1",
                "online": true,
                "afk": false,
                "balance": 1000.50,
                "location": {
                    "world": "world",
                    "x": 100,
                    "y": 64,
                    "z": -200
                }
            }
        ],
        "count": 1
    },
    "timestamp": "2024-12-09T15:00:00.000Z"
}
```

## Setup & Configuration

### 1. Environment Variables

Add plugin configuration to your `.env` file:

```bash
# Dynmap Integration
DYNMAP_ENABLED=true
DYNMAP_BASE_URL=http://localhost:8123
DYNMAP_API_TOKEN=  # Optional

# EssentialsX Integration
ESSENTIALSX_ENABLED=true
ESSENTIALSX_BASE_URL=http://localhost:8080
ESSENTIALSX_API_TOKEN=your-api-token-here
```

### 2. Plugin Setup

#### Dynmap
1. Install Dynmap plugin on your Minecraft server
2. Configure Dynmap to enable web interface (default port: 8123)
3. If authentication is required, generate an API token
4. Set `DYNMAP_BASE_URL` to point to your Dynmap web interface

#### EssentialsX
1. Install EssentialsX and EssentialsX WebAPI on your Minecraft server
2. Configure WebAPI in `plugins/Essentials/config.yml`:
   ```yaml
   webapi:
     enabled: true
     port: 8080
     api-key: your-secure-api-key-here
   ```
3. Set `ESSENTIALSX_API_TOKEN` to match your configured API key
4. Restart your server

### 3. Starting the Console

When the console starts, it will:
1. Register all plugin adapters
2. Configure enabled adapters based on environment variables
3. Attempt to initialize connections to enabled plugins
4. Log success or failure for each plugin

Example startup logs:
```
[PluginGateway] Initializing plugin integrations...
[Dynmap] Configured: { enabled: true, baseUrl: 'http://localhost:8123', hasToken: false }
[Dynmap] Connected to Dynmap server. Title: My Minecraft Server
[PluginGateway] ✓ Dynmap integration initialized
[EssentialsX] Configured: { enabled: true, baseUrl: 'http://localhost:8080', hasToken: true }
[EssentialsX] Connected to server. Version: 1.20.1
[PluginGateway] ✓ EssentialsX integration initialized
[PluginGateway] ✓ Plugin gateway initialized with 2 adapter(s): dynmap, essentialsx
```

## API Endpoints

### General Endpoints

#### List All Integrations
```
GET /api/plugins/integrations
```

Returns list of registered plugin adapters.

**Response:**
```json
{
    "success": true,
    "data": {
        "adapters": ["dynmap", "essentialsx"],
        "count": 2
    },
    "timestamp": "2024-12-09T15:00:00.000Z"
}
```

#### Check All Health
```
GET /api/plugins/integrations/health
```

Returns health status for all registered adapters.

**Response:**
```json
{
    "success": true,
    "data": {
        "healthy": true,
        "adapters": {
            "dynmap": {
                "status": "healthy",
                "message": "Dynmap is reachable",
                "responseTime": 45
            },
            "essentialsx": {
                "status": "healthy",
                "message": "EssentialsX is reachable",
                "responseTime": 32
            }
        },
        "count": 2
    },
    "timestamp": "2024-12-09T15:00:00.000Z"
}
```

### Authentication

All plugin integration endpoints require authentication via:
1. **Session authentication** (for web console users)
2. **Bearer token authentication** (for API clients)

**Using Bearer Token:**
```bash
curl -H "Authorization: Bearer YOUR_PLUGIN_ADMIN_TOKEN" \
     http://localhost:3001/api/plugins/dynmap/players
```

### Rate Limiting

Plugin integration endpoints are rate limited to **60 requests per minute** per IP address.

### Error Responses

Standard error format:
```json
{
    "success": false,
    "error": "Error message here",
    "plugin": "dynmap"
}
```

**HTTP Status Codes:**
- `200` - Success
- `404` - Resource not found
- `500` - Internal server error
- `503` - Service unavailable (plugin not ready)

## Security

### Authentication & Authorization

1. **Session-based**: Web console users authenticated via session
2. **Token-based**: API clients use Bearer token (`PLUGIN_ADMIN_TOKEN`)
3. **CSRF Protection**: Session-based requests require CSRF token
4. **Skip CSRF for Bearer**: Bearer token requests bypass CSRF

### Per-Plugin Authentication

Each plugin can have its own API token:
- Configured via `DYNMAP_API_TOKEN`, `ESSENTIALSX_API_TOKEN`, etc.
- Sent as `Authorization: Bearer <token>` to plugin APIs
- Validated by the plugin itself

### Audit Logging

All plugin API accesses are logged to `console/backend/data/audit.log`:

```json
{
    "timestamp": "2024-12-09T15:00:00.000Z",
    "event": "API_ACCESS",
    "username": "admin",
    "details": {
        "endpoint": "/api/plugins/dynmap/players",
        "playerCount": 5
    },
    "ipAddress": "192.168.1.100"
}
```

### Rate Limiting

- **60 requests per minute** per IP for plugin integration endpoints
- Protects against abuse and DoS attacks
- Returns `429 Too Many Requests` when exceeded

### Best Practices

1. **Use strong API tokens**: Generate with `openssl rand -base64 48`
2. **Enable HTTPS**: Use secure cookies in production
3. **Restrict network access**: Firewall plugin ports appropriately
4. **Monitor audit logs**: Regularly review for suspicious activity
5. **Rotate tokens**: Periodically change API tokens

## Extending to New Plugins

### Step 1: Create Plugin Adapter

Create a new file in `console/backend/services/adapters/`:

```javascript
// services/adapters/myPluginAdapter.js
const BasePluginAdapter = require('./baseAdapter');

class MyPluginAdapter extends BasePluginAdapter {
    constructor() {
        super('MyPlugin');
    }

    async initialize() {
        const baseResult = await super.initialize();
        if (!baseResult.enabled) {
            return baseResult;
        }

        // Test connection
        try {
            const status = await this.getStatus();
            console.log(`[MyPlugin] Connected. Version: ${status.version}`);
            return {
                enabled: true,
                message: 'MyPlugin adapter initialized successfully'
            };
        } catch (error) {
            throw new Error(`Failed to connect to MyPlugin: ${error.message}`);
        }
    }

    async getStatus() {
        const response = await this.makeRequest('GET', '/api/status');
        return response.data;
    }

    async getSomeData() {
        const response = await this.makeRequest('GET', '/api/data');
        return response.data;
    }
}

module.exports = new MyPluginAdapter();
```

### Step 2: Register Adapter

Update `server.js` to register the new adapter:

```javascript
// In initializePluginGateway function
const myPluginAdapter = require('./services/adapters/myPluginAdapter');
pluginGateway.registerAdapter('myplugin', myPluginAdapter);

// Configure if enabled
const myPluginEnabled = process.env.MYPLUGIN_ENABLED === 'true';
if (myPluginEnabled) {
    pluginGateway.configure('myplugin', {
        enabled: true,
        baseUrl: process.env.MYPLUGIN_BASE_URL || 'http://localhost:9000',
        apiToken: process.env.MYPLUGIN_API_TOKEN || null
    });
    
    try {
        await pluginGateway.initialize('myplugin');
        console.log('[PluginGateway] ✓ MyPlugin integration initialized');
    } catch (error) {
        console.error('[PluginGateway] ✗ MyPlugin initialization failed:', error.message);
    }
}
```

### Step 3: Add Route Endpoints

Update `routes/pluginIntegrations.js`:

```javascript
/**
 * GET /api/plugins/myplugin/status
 * Get MyPlugin status
 */
router.get('/myplugin/status', async (req, res) => {
    try {
        const status = await pluginGateway.call('myplugin', 'getStatus');
        
        res.json({
            success: true,
            plugin: 'myplugin',
            data: status,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[PluginIntegrations] MyPlugin status error:', error.message);
        
        res.status(error.message.includes('not ready') ? 503 : 500).json({
            success: false,
            error: error.message,
            plugin: 'myplugin'
        });
    }
});

/**
 * GET /api/plugins/myplugin/data
 * Get data from MyPlugin
 */
router.get('/myplugin/data', async (req, res) => {
    try {
        const data = await pluginGateway.call('myplugin', 'getSomeData');
        
        res.json({
            success: true,
            plugin: 'myplugin',
            data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[PluginIntegrations] MyPlugin data error:', error.message);
        
        res.status(error.message.includes('not ready') ? 503 : 500).json({
            success: false,
            error: error.message,
            plugin: 'myplugin'
        });
    }
});

/**
 * GET /api/plugins/myplugin/health
 * Check MyPlugin health
 */
router.get('/myplugin/health', async (req, res) => {
    try {
        const health = await pluginGateway.checkHealth('myplugin');
        
        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json({
            success: health.status === 'healthy',
            plugin: 'myplugin',
            health,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[PluginIntegrations] MyPlugin health error:', error.message);
        
        res.status(500).json({
            success: false,
            error: error.message,
            plugin: 'myplugin'
        });
    }
});
```

### Step 4: Update Environment Variables

Add to `.env.example` and `.env`:

```bash
# MyPlugin Integration
MYPLUGIN_ENABLED=false
# MYPLUGIN_BASE_URL=http://localhost:9000
# MYPLUGIN_API_TOKEN=
```

### Step 5: Document the Integration

Add documentation for your plugin to this guide, including:
- Plugin description
- Available endpoints
- Configuration requirements
- Example responses
- Setup instructions

## Error Handling

### Retry Mechanism

The base adapter implements automatic retries for failed requests:
- **Default retries**: 3 attempts
- **Retry delay**: Exponential backoff (1s, 2s, 3s)
- **No retry for 4xx errors**: Client errors are not retried

Configure per-request:
```javascript
await this.makeRequest('GET', '/endpoint', {}, {
    retries: 5,
    retryDelay: 2000
});
```

### Health Checks

Each adapter implements health checks:
```javascript
const health = await pluginGateway.checkHealth('dynmap');
// Returns: { status: 'healthy|unhealthy|disabled', message: '...', responseTime: 45 }
```

### Error Logging

All plugin errors are logged:
1. **Console logs**: For immediate visibility
2. **Audit logs**: For security-sensitive operations
3. **Response errors**: Formatted for API clients

### Graceful Degradation

- If a plugin is unavailable, other plugins continue to work
- Health checks clearly indicate plugin status
- Frontend can display appropriate messages based on status

## Best Practices

### For Adapter Development

1. **Extend BasePluginAdapter**: Don't reinvent common functionality
2. **Implement health checks**: Override `checkHealth()` with meaningful tests
3. **Use caching wisely**: Cache data that doesn't change frequently
4. **Handle errors gracefully**: Return meaningful error messages
5. **Log appropriately**: Use structured logging for debugging

### For API Usage

1. **Check health first**: Use health endpoints to verify plugin availability
2. **Handle errors**: Expect and handle 503 (service unavailable) responses
3. **Respect rate limits**: Don't exceed 60 requests/minute
4. **Use appropriate auth**: Bearer token for automated systems, session for users
5. **Cache responses**: Don't repeatedly fetch static data

### For Security

1. **Validate inputs**: Always validate user inputs in route handlers
2. **Use HTTPS**: Enable secure cookies in production
3. **Rotate tokens**: Periodically change API tokens
4. **Monitor logs**: Watch for suspicious patterns
5. **Principle of least privilege**: Only grant necessary permissions

### For Performance

1. **Cache when possible**: Reduce redundant API calls to plugins
2. **Use appropriate timeouts**: Don't wait forever for slow plugins
3. **Monitor response times**: Track health check response times
4. **Optimize queries**: Request only the data you need
5. **Use WebSockets**: For real-time updates (future enhancement)

## Future Enhancements

Potential improvements to the Plugin API Gateway:

1. **WebSocket Support**: Real-time updates from plugins
2. **Plugin Discovery**: Auto-detect available plugins
3. **Configuration UI**: Manage plugin settings from web console
4. **Metrics & Analytics**: Track plugin usage and performance
5. **Caching Layer**: Redis-based caching for frequently accessed data
6. **Plugin Marketplace**: Browse and install community adapters
7. **Batch Operations**: Perform multiple plugin operations in one request
8. **Webhooks**: Receive events from plugins
9. **GraphQL API**: Alternative to REST for complex queries
10. **Admin Dashboard**: Visual monitoring of plugin health and usage

## Troubleshooting

### Plugin Not Initializing

**Problem**: Plugin adapter fails to initialize

**Solutions**:
1. Check environment variables are set correctly
2. Verify plugin API is reachable (test with curl)
3. Check API token is valid
4. Review server startup logs for error messages
5. Verify plugin is running and configured properly

### Authentication Errors

**Problem**: 401 or 403 responses from plugin

**Solutions**:
1. Verify `PLUGIN_API_TOKEN` matches plugin configuration
2. Check token format (some plugins expect specific formats)
3. Ensure plugin API authentication is enabled
4. Review plugin documentation for auth requirements

### Timeout Errors

**Problem**: Requests to plugin timeout

**Solutions**:
1. Increase timeout in adapter configuration
2. Check network connectivity to plugin
3. Verify plugin is not overloaded
4. Consider increasing retry count and delay

### Rate Limiting

**Problem**: Receiving 429 Too Many Requests

**Solutions**:
1. Reduce request frequency
2. Implement client-side caching
3. Use batch endpoints if available
4. Consider requesting rate limit increase

## Support & Contributing

For questions, issues, or contributions:
1. Check existing documentation
2. Review console startup logs
3. Enable debug logging for detailed traces
4. Submit issues with reproduction steps
5. Contribute adapters for new plugins!

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Authors**: Console Development Team
