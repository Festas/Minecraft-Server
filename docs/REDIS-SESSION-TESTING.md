# Redis Session Store Testing Guide

This document explains how to test the Redis session store implementation and verify that CSRF tokens persist across server restarts.

## Prerequisites

- Docker and Docker Compose installed
- curl and jq installed (for API testing)
- Access to the console environment

## Testing Scenarios

### 1. Test Redis Connection (Production/Development)

**Start the services:**
```bash
cd ~/Minecraft-Server
docker compose -f docker-compose.console.yml up -d
```

**Check Redis is running:**
```bash
docker ps | grep redis
# Should show minecraft-console-redis running
```

**Check console logs:**
```bash
docker logs minecraft-console 2>&1 | grep Redis
# Should show:
# [Session] Redis client connected
# [Session] Redis client ready
# [Session] ✓ Using Redis store for session persistence
```

**Check health endpoint:**
```bash
curl -s http://localhost:3001/health | jq '.session'
# Should show:
# {
#   "usingRedis": true,
#   "redisConnected": true,
#   "storeType": "redis",
#   "initialized": true,
#   "warning": null
# }
```

### 2. Test Session Persistence Across Restarts

**Step 1: Login and save session cookie**
```bash
curl -c cookies.txt -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

**Step 2: Get CSRF token**
```bash
curl -c cookies.txt -b cookies.txt http://localhost:3001/api/csrf-token | jq '.'
# Save the csrfToken value
```

**Step 3: Make an authenticated API call**
```bash
CSRF_TOKEN="<token-from-step-2>"
curl -b cookies.txt -H "CSRF-Token: $CSRF_TOKEN" \
  http://localhost:3001/api/plugins | jq '.'
# Should return plugin list, not an error
```

**Step 4: Restart the console container**
```bash
docker compose -f docker-compose.console.yml restart console
# Wait 5-10 seconds for startup
```

**Step 5: Verify session still works (NO re-login needed)**
```bash
# Same cookies.txt and CSRF token from before
curl -b cookies.txt -H "CSRF-Token: $CSRF_TOKEN" \
  http://localhost:3001/api/plugins | jq '.'
# Should STILL work without "invalid csrf token" error
```

**Expected Result:**
✅ With Redis: API call succeeds after restart
❌ Without Redis (memory store): "invalid csrf token" error after restart

### 3. Test Plugin Install Workflow

**Complete workflow test:**
```bash
#!/bin/bash
set -e

# 1. Login
LOGIN_RESP=$(curl -s -c cookies.txt -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}')
echo "Login: $(echo $LOGIN_RESP | jq -r '.message')"

# 2. Get CSRF token
CSRF_TOKEN=$(curl -s -c cookies.txt -b cookies.txt http://localhost:3001/api/csrf-token | jq -r '.csrfToken')
echo "CSRF Token: ${CSRF_TOKEN:0:20}..."

# 3. Get current plugins
echo "Current plugins:"
curl -s -b cookies.txt -H "CSRF-Token: $CSRF_TOKEN" \
  http://localhost:3001/api/plugins | jq -r '.plugins[].name'

# 4. Install a test plugin
echo "Installing test plugin..."
curl -s -b cookies.txt -X POST http://localhost:3001/api/plugins/install \
  -H "Content-Type: application/json" \
  -H "CSRF-Token: $CSRF_TOKEN" \
  -d '{"url":"https://github.com/EssentialsX/Essentials/releases/download/2.20.1/EssentialsX-2.20.1.jar"}' \
  | jq '.'

# 5. Restart console
echo "Restarting console..."
docker compose -f docker-compose.console.yml restart console
sleep 10

# 6. Try another API call with same session
echo "Testing session persistence after restart..."
curl -s -b cookies.txt -H "CSRF-Token: $CSRF_TOKEN" \
  http://localhost:3001/api/plugins | jq -r '.plugins[].name'

echo "✓ Session persisted across restart!"
```

### 4. Test Memory Store Fallback

**Stop Redis service:**
```bash
docker stop minecraft-console-redis
```

**Restart console:**
```bash
docker compose -f docker-compose.console.yml restart console
sleep 10
```

**Check logs for fallback:**
```bash
docker logs minecraft-console 2>&1 | grep "WARNING"
# Should show:
# [Session] ⚠ WARNING: Falling back to memory store
# [Session] ⚠ WARNING: Sessions will NOT persist across process restarts
# [Session] ⚠ WARNING: CSRF tokens may fail in CI/Docker environments
```

**Check health endpoint:**
```bash
curl -s http://localhost:3001/health | jq '.session'
# Should show:
# {
#   "usingRedis": false,
#   "redisConnected": false,
#   "storeType": "memory",
#   "initialized": true,
#   "warning": "Sessions will not persist across restarts"
# }
```

**Verify basic auth still works:**
```bash
# Login should still work
curl -c cookies.txt -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' | jq '.'
  
# CSRF should still work
curl -c cookies.txt -b cookies.txt http://localhost:3001/api/csrf-token | jq '.'
```

**Restart Redis and console:**
```bash
docker start minecraft-console-redis
docker compose -f docker-compose.console.yml restart console
sleep 10
# Should reconnect to Redis
```

### 5. Test in CI/Test Environment

**Verify test environment skips Redis:**
```bash
cd console/backend
NODE_ENV=test npm test

# Check logs for:
# [Session] Test environment detected - using memory store
```

## Common Issues and Solutions

### Issue: "invalid csrf token" after restart

**Diagnosis:**
```bash
# Check Redis connection
docker logs minecraft-console | grep Redis

# Check health endpoint
curl -s http://localhost:3001/health | jq '.session'
```

**Solutions:**
1. Verify Redis container is running: `docker ps | grep redis`
2. Check network connectivity: Both containers on same network
3. Check environment variables: `docker exec minecraft-console env | grep REDIS`

### Issue: Sessions not persisting

**Check Redis data:**
```bash
# Connect to Redis CLI
docker exec -it minecraft-console-redis redis-cli

# List session keys
KEYS sess:*

# Check a session
GET sess:<session-id>
```

**Verify TTL:**
```bash
# Session TTL should be around 86400 (24 hours)
TTL sess:<session-id>
```

### Issue: DNS resolution fails (GitHub Actions)

This is a known limitation in some Docker environments. The code handles this gracefully by falling back to memory store. In production environments with proper Docker networking, Redis connection works correctly.

## Production Deployment Checklist

- [ ] Redis service defined in docker-compose.yml
- [ ] Redis data volume configured for persistence
- [ ] REDIS_HOST environment variable set (default: 'redis')
- [ ] REDIS_PORT environment variable set (default: 6379)
- [ ] Health checks enabled for Redis service
- [ ] Console depends_on Redis with health condition
- [ ] Backup strategy for redis-data volume
- [ ] Monitoring alerts for Redis connection status
- [ ] Test session persistence across deployments

## Monitoring

**Key metrics to monitor:**
- Redis connection status (check /health endpoint)
- Session count: `docker exec minecraft-console-redis redis-cli DBSIZE`
- Redis memory usage: `docker stats minecraft-console-redis`
- Session TTL distribution: Check Redis KEYS and TTL values

**Health check:**
```bash
# Automated health check
curl -f http://localhost:3001/health || echo "Health check failed"
```

## Rollback Plan

If Redis causes issues in production:

1. **Immediate rollback:**
   ```bash
   docker stop minecraft-console-redis
   docker compose -f docker-compose.console.yml restart console
   # Console will fall back to memory store
   ```

2. **Remove Redis from deployment:**
   - Comment out Redis service in docker-compose.yml
   - Remove REDIS_* environment variables
   - Deploy updated configuration
   - Code automatically falls back to memory store

3. **Clear Redis data if needed:**
   ```bash
   docker volume rm minecraft-console_redis-data
   ```

The fallback mechanism ensures zero downtime even if Redis fails.
