# Minecraft Console Setup Guide

## Overview
The web console provides a browser-based interface to manage your Minecraft server at `https://mc.festas-builds.com/console`.

## Prerequisites
- Minecraft Server repository set up and deploying
- Link-in-Bio repository managing Caddy (for reverse proxy)
- Access to GitHub repository secrets

## Setup Steps

### Step 1: Add Repository Secrets

Go to your repository → Settings → Secrets and variables → Actions → New repository secret

Add these required secrets:

| Secret Name | Description | Maps to Env Var |
|-------------|-------------|-----------------|
| `CONSOLE_ADMIN_USER` | Your console login username | `ADMIN_USERNAME` |
| `CONSOLE_ADMIN_PASSWORD` | Your console login password | `ADMIN_PASSWORD` |
| `RCON_PASSWORD` | Password for RCON connection | `RCON_PASSWORD` |
| `SESSION_SECRET` | Random string for session encryption (32+ chars) | `SESSION_SECRET` |
| `CSRF_SECRET` | Random string for CSRF token encryption (32+ chars) | `CSRF_SECRET` |
| `REDIS_HOST` | Redis server hostname (e.g., 'redis' for Docker) | `REDIS_HOST` |
| `REDIS_PORT` | Redis server port (typically 6379) | `REDIS_PORT` |

**Note:** The GitHub secrets are automatically mapped to the correct environment variable names during deployment.

**To generate secure secrets:**
```bash
# Generate session secret
openssl rand -hex 32

# Generate CSRF secret
openssl rand -base64 32

# Generate admin password
openssl rand -base64 24
```

**Redis Configuration:**
- For Docker Compose deployments, set `REDIS_HOST=redis` (the service name)
- For external Redis, use the hostname/IP of your Redis server
- `REDIS_PORT` is typically `6379` (the default Redis port)

### Step 2: Redis Session Store (Included)

The console uses **Redis** for persistent session storage. This ensures:
- Sessions survive server restarts
- CSRF tokens remain valid across deployments
- Plugin installations work reliably in CI/Docker

**Redis is automatically configured** when you use `docker-compose.console.yml`:
- Redis service starts automatically
- Console connects to Redis at `redis:6379`
- Sessions persist in a Docker volume (`redis-data`)

**No manual configuration needed** - Redis is included and configured by default.

**Optional Redis Configuration:**

If you need to customize Redis (e.g., for external Redis):

```bash
# In .env file (optional)
REDIS_HOST=redis        # Default: redis (Docker service name)
REDIS_PORT=6379         # Default: 6379
REDIS_PASSWORD=         # Default: none (optional)
# Or use a connection URL:
# REDIS_URL=redis://user:password@host:port/db
```

**Verify Redis is running:**
```bash
# Check Redis container
docker ps | grep redis

# Check Redis connection in console logs
docker logs minecraft-console | grep "Redis"

# Check health endpoint
curl http://localhost:3001/health
```

The health endpoint response includes session store status:
```json
{
  "status": "ok",
  "session": {
    "usingRedis": true,
    "redisConnected": true,
    "storeType": "redis",
    "warning": null
  }
}
```

### Step 3: Enable RCON on Minecraft Server

SSH into your server and edit the Minecraft server.properties:

```bash
ssh deploy@your-server-ip
cd /home/deploy/minecraft-server
nano server.properties
```

Add/update these lines:
```properties
enable-rcon=true
rcon.port=25575
rcon.password=YOUR_RCON_PASSWORD_HERE
```

**Important:** Use the same password you set in the `RCON_PASSWORD` secret.

Restart the Minecraft server:
```bash
sudo systemctl restart minecraft.service
```

### Step 4: Update Caddyfile (One-Time)

In your **Link-in-Bio** repository, update the Caddyfile to add console routing:

```caddyfile
mc.festas-builds.com {
    tls eric@festas-builds.com
    encode gzip zstd
    
    # Console routes (WebSocket support for real-time logs)
    handle /console* {
        reverse_proxy minecraft-console:3001
    }
    handle /socket.io* {
        reverse_proxy minecraft-console:3001
    }
    
    # Static website (everything else)
    handle {
        reverse_proxy minecraft-web:80
    }
}
```

Commit and push the change. Caddy will auto-reload.

### Step 5: Deploy

Push any change to the `console/` directory, or manually trigger the workflow:

1. Go to Actions → Deploy Console
2. Click "Run workflow"
3. Wait for deployment to complete

### Step 6: Access Console

Open `https://mc.festas-builds.com/console` and login with your credentials.

## Troubleshooting

### Console not accessible
- Check if container is running: `docker ps | grep minecraft-console`
- Check logs: `docker logs minecraft-console`
- Verify Caddyfile has console routes

### RCON connection failed
- Verify RCON is enabled in server.properties
- Check password matches between secret and server.properties
- Ensure Minecraft server is running: `sudo systemctl status minecraft.service`

### WebSocket not connecting
- Ensure Caddyfile has `/socket.io*` route
- Check browser console for errors

### Redis connection issues

**Symptoms:**
- Console logs show "WARNING: Falling back to memory store"
- Plugin installs fail with "invalid csrf token"
- Sessions don't persist after console restart
- Health endpoint shows `"usingRedis": false`

**Diagnosis:**
```bash
# Check if Redis container is running
docker ps | grep redis

# Check Redis logs
docker logs minecraft-console-redis

# Check console logs for Redis errors
docker logs minecraft-console | grep Redis

# Test Redis connectivity from console container
docker exec -it minecraft-console sh -c 'nc -zv redis 6379'

# Check health endpoint
curl http://localhost:3001/health
```

**Common solutions:**

1. **Redis container not running:**
   ```bash
   # Check docker-compose.console.yml includes Redis service
   # Restart the stack
   cd /home/deploy/minecraft-console
   docker compose down
   docker compose up -d
   ```

2. **Network connectivity issues:**
   ```bash
   # Verify both containers are on same network
   docker network inspect minecraft-network
   
   # Both minecraft-console and minecraft-console-redis should be listed
   ```

3. **Redis data corruption:**
   ```bash
   # Stop containers
   docker compose down
   
   # Remove Redis data volume (will clear all sessions)
   docker volume rm minecraft-console_redis-data
   
   # Start fresh
   docker compose up -d
   ```

4. **Check environment variables:**
   ```bash
   # Verify Redis configuration in .env
   cat .env | grep REDIS
   
   # Should show:
   # REDIS_HOST=redis
   # REDIS_PORT=6379
   ```

**Verification:**

After fixing, verify Redis is working:
```bash
# Console logs should show:
docker logs minecraft-console 2>&1 | grep "Redis"
# Expected output:
# [Session] Redis client connected
# [Session] Redis client ready
# [Session] ✓ Using Redis store for session persistence

# Health check should show:
curl http://localhost:3001/health | jq '.session'
# Expected output:
# {
#   "usingRedis": true,
#   "redisConnected": true,
#   "storeType": "redis",
#   "warning": null
# }
```

## Architecture

```
Browser → Caddy (443) → minecraft-console:3001 ←→ Redis (session storage)
                      → minecraft-web:80

Console Container:
  - Connects to RCON via host.docker.internal:25575
  - Mounts /home/deploy/minecraft-server for file access
  - Mounts Docker socket for container control
  - Stores sessions in Redis for persistence
  - Stores data in console_data volume

Redis Container:
  - Stores sessions with 24h TTL
  - Persists data in redis-data volume
  - Enables session recovery after restarts
```

## Security Notes

- All secrets are stored in GitHub and passed to the container at runtime
- The `.env` file on the server is created with 600 permissions (read/write for owner only)
- HTTPS is enforced via Caddy
- Session secrets should be strong random strings (32+ characters)

## Maintenance

### Viewing Logs
```bash
ssh deploy@your-server-ip
docker logs minecraft-console -f
```

### Restarting Console
The workflow automatically restarts the console on deployment. Manual restart:
```bash
ssh deploy@your-server-ip
cd /home/deploy/minecraft-console
docker compose restart
```

### Updating Secrets
1. Update the secret in GitHub repository settings
2. Trigger a new deployment (push to console/ or manual workflow trigger)

## Features Available in Console

- 🔐 **Secure Authentication** - Session-based auth with bcrypt password hashing
- 📊 **Real-time Dashboard** - Live server stats, player count, TPS, memory/CPU usage
- 💻 **Console Interface** - Execute commands via RCON with command history
- 👥 **Player Management** - Kick, ban, OP, teleport, and manage players
- 📝 **Live Log Viewer** - Real-time log streaming with WebSocket
- ⚡ **Quick Actions** - One-click buttons for common tasks
- 🔄 **Server Control** - Start, stop, restart, and manage the server
- 📦 **Backup Management** - Create and manage server backups
- 🎨 **Minecraft Theme** - Dark mode with Minecraft-inspired design

