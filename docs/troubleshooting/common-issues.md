[← Back to Troubleshooting](./README.md) | [Documentation Hub](../README.md)

---

# Common Issues & Solutions

This document provides a searchable FAQ with problem/solution pairs for common issues encountered with the festas_builds Minecraft Server.

---

## Table of Contents

- [Docker Issues](#docker-issues)
- [Plugin Issues](#plugin-issues)
- [Console Issues](#console-issues)
- [Network Issues](#network-issues)
- [Performance Issues](#performance-issues)
- [Authentication Issues](#authentication-issues)
- [Backup & Restore Issues](#backup--restore-issues)
- [RCON Issues](#rcon-issues)

---

## Docker Issues

### Container Won't Start

**Problem**: Docker container fails to start or exits immediately

**Common Error Messages**:
- `Error: Cannot find module`
- `Permission denied`
- `Port already in use`

**Solutions**:

1. **Check logs**:
   ```bash
   docker logs minecraft-server
   docker logs minecraft-console
   ```

2. **Port conflicts**:
   ```bash
   # Check if port is in use
   sudo lsof -i :25565
   sudo lsof -i :3001
   
   # Change port in .env or docker-compose.yml
   ```

3. **Permission issues**:
   ```bash
   # Fix volume permissions
   sudo chown -R 1000:1000 ./minecraft-data
   sudo chown -R 1000:1000 ./console/data
   ```

4. **Missing dependencies**:
   ```bash
   # Rebuild container
   docker compose down
   docker compose build --no-cache
   docker compose up -d
   ```

### Container Keeps Restarting

**Problem**: Container enters restart loop

**Solutions**:

1. **Check resource limits**:
   ```bash
   docker stats
   # Increase memory in docker-compose.yml if needed
   ```

2. **Review startup scripts**:
   ```bash
   # Check for errors in entrypoint
   docker logs minecraft-server --tail 100
   ```

3. **Verify configuration**:
   ```bash
   # Validate environment variables
   docker compose config
   ```

---

## Plugin Issues

### Plugin Not Loading

**Problem**: Plugin JAR present but not loading on server startup

**Error Messages**:
- `Could not load 'plugins/PluginName.jar'`
- `Unsupported API version`
- `Missing dependencies`

**Solutions**:

1. **Check plugin compatibility**:
   - Verify plugin supports Paper (not just Bukkit/Spigot)
   - Check Minecraft version compatibility
   - Review plugin.yml for required API version

2. **Dependency check**:
   ```bash
   # Check plugin.yml for dependencies
   unzip -p plugins/PluginName.jar plugin.yml | grep depend
   
   # Install missing dependencies
   ```

3. **Permission issues**:
   ```bash
   # Fix plugin directory permissions
   docker exec minecraft-server chown -R minecraft:minecraft /data/plugins
   ```

4. **Reload plugins**:
   ```bash
   # Via RCON
   /reload confirm
   
   # Or restart server
   docker restart minecraft-server
   ```

### Plugin Conflicts

**Problem**: Multiple plugins interfere with each other

**Symptoms**:
- Commands not working
- Unexpected behavior
- Errors in console

**Solutions**:

1. **Check for conflicts**:
   - Review plugins that modify same features
   - Check startup logs for warnings
   - Look for duplicate functionality

2. **Load order**:
   ```yaml
   # In plugin.yml, set load order
   loadbefore: [PluginB]
   depend: [PluginA]
   ```

3. **Disable conflicting plugin**:
   ```bash
   # Rename .jar to .jar.disabled
   docker exec minecraft-server mv /data/plugins/Plugin.jar /data/plugins/Plugin.jar.disabled
   docker restart minecraft-server
   ```

### Plugin Manager V2 Job Stuck

**Problem**: Plugin installation job stays in "running" state

**Solutions**:

1. **Check job queue**:
   ```bash
   # View plugin-jobs.json
   docker exec minecraft-console cat /app/data/plugin-jobs.json
   ```

2. **Cancel stuck job**:
   ```bash
   # Via API
   curl -X POST http://localhost:3001/api/v2/plugins/jobs/<job-id>/cancel \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Restart job worker**:
   ```bash
   docker restart minecraft-console
   ```

4. **Clear queue** (last resort):
   ```bash
   # Backup first
   docker exec minecraft-console cp /app/data/plugin-jobs.json /app/data/plugin-jobs.json.backup
   
   # Reset queue
   docker exec minecraft-console sh -c 'echo "[]" > /app/data/plugin-jobs.json'
   ```

---

## Console Issues

### Cannot Login to Web Console

**Problem**: Authentication fails with correct credentials

**Error Messages**:
- `Invalid username or password`
- `Session expired`
- `CSRF token mismatch`

**Solutions**:

1. **Clear browser data**:
   - Clear cookies and cache
   - Try incognito/private mode
   - Try different browser

2. **Check console logs**:
   ```bash
   docker logs minecraft-console --tail 50
   ```

3. **Reset password**:
   ```bash
   # Connect to database
   docker exec -it minecraft-console sqlite3 /app/data/console.db
   
   # View users
   SELECT username, role FROM users;
   
   # Reset password (requires manual hash generation)
   # Better: Create new admin via setup script
   ```

4. **CSRF issues**:
   - Ensure cookies enabled
   - Check Content Security Policy
   - Verify HTTPS configuration

### WebSocket Connection Failed

**Problem**: Live logs and real-time updates not working

**Error Messages**:
- `WebSocket connection failed`
- `Connection closed: 1006`

**Solutions**:

1. **Check reverse proxy**:
   ```nginx
   # Nginx needs WebSocket upgrade headers
   location / {
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
   }
   ```

2. **Firewall rules**:
   ```bash
   # Allow WebSocket port
   sudo ufw allow 3001/tcp
   ```

3. **Container networking**:
   ```bash
   # Verify container network
   docker network inspect mc-net
   ```

### Dashboard Shows Incorrect Stats

**Problem**: Server stats (TPS, memory, players) incorrect or stale

**Solutions**:

1. **Check RCON connection**:
   ```bash
   # Test RCON manually
   docker exec minecraft-console node -e "
   const Rcon = require('minecraft-rcon');
   const client = new Rcon.Client();
   client.connect('minecraft-server', 25575, 'YOUR_RCON_PASSWORD')
     .then(() => console.log('RCON OK'))
     .catch(err => console.error('RCON Failed:', err));
   "
   ```

2. **Verify RCON password**:
   ```bash
   # Check .env matches server.properties
   grep RCON_PASSWORD .env
   docker exec minecraft-server grep rcon.password /data/server.properties
   ```

3. **Restart console**:
   ```bash
   docker restart minecraft-console
   ```

---

## Network Issues

### Players Cannot Connect

**Problem**: Players get "Connection refused" or timeout

**Solutions**:

1. **Verify server is running**:
   ```bash
   docker ps | grep minecraft-server
   ```

2. **Check ports**:
   ```bash
   # Verify port forwarding
   sudo netstat -tulpn | grep 25565
   sudo netstat -tulpn | grep 19132
   ```

3. **Firewall rules**:
   ```bash
   # Allow Minecraft ports
   sudo ufw allow 25565/tcp
   sudo ufw allow 19132/udp
   ```

4. **Server address**:
   - Verify players using correct IP/domain
   - Check DNS records
   - Test with direct IP

5. **Bedrock Edition specific**:
   ```bash
   # Check Geyser logs
   docker exec minecraft-server cat /data/plugins/Geyser-Spigot/logs/latest.log
   ```

### High Latency / Lag

**Problem**: Players experiencing lag or high ping

**Solutions**:

1. **Check server TPS**:
   ```bash
   # Via RCON
   /tps
   
   # Should be 20.0 TPS
   ```

2. **Resource usage**:
   ```bash
   docker stats minecraft-server
   # Check CPU and memory usage
   ```

3. **Reduce view distance**:
   ```properties
   # In server.properties
   view-distance=8
   simulation-distance=6
   ```

4. **Optimize plugins**:
   - Disable unused plugins
   - Update to latest versions
   - Use performance monitoring plugins (Spark)

---

## Performance Issues

### Server Using Too Much Memory

**Problem**: Server memory usage constantly high or increasing

**Solutions**:

1. **Check current usage**:
   ```bash
   docker stats minecraft-server
   ```

2. **Adjust Java heap**:
   ```env
   # In .env
   MEMORY=4G  # Adjust based on available RAM
   ```

3. **Memory leak investigation**:
   ```bash
   # Use Spark profiler plugin
   /spark heapsummary
   /spark heapdump
   ```

4. **Reduce loaded chunks**:
   - Lower view distance
   - Unload unused worlds
   - Clear entity clutter

### Low TPS (Server Lag)

**Problem**: TPS below 20.0, server feels laggy

**Solutions**:

1. **Identify cause**:
   ```bash
   # Use Spark profiler
   /spark profiler
   # Wait 30 seconds
   /spark profiler --stop
   ```

2. **Common causes**:
   - Too many entities (use `/minecraft:kill @e[type=!player]`)
   - Redstone contraptions (disable or limit)
   - Chunk loading (reduce view distance)
   - Plugin overhead (profile and optimize)

3. **Optimization**:
   ```yaml
   # paper.yml
   entity-activation-range:
     animals: 16
     monsters: 24
     raiders: 32
     misc: 8
   ```

---

## Authentication Issues

### CSRF Token Mismatch

**Problem**: Forms fail with "Invalid CSRF token"

**Solutions**:

1. **Clear cookies**:
   - Delete all cookies for console domain
   - Refresh page to get new token

2. **Check session configuration**:
   ```javascript
   // Verify session secret is set
   // Check console logs for warnings
   ```

3. **Cookie settings**:
   - Ensure `SameSite=Strict` compatible with setup
   - Verify `Secure` flag if using HTTPS
   - Check domain configuration

### API Key Not Working

**Problem**: Bearer token authentication fails

**Error Messages**:
- `Invalid API key`
- `Unauthorized`

**Solutions**:

1. **Verify token format**:
   ```bash
   # API key should start with "mcs_"
   # Legacy token is just the raw string from .env
   ```

2. **Check header format**:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/v2/plugins
   ```

3. **View API key logs**:
   ```bash
   docker logs minecraft-console | grep "API key"
   ```

4. **Regenerate token**:
   ```bash
   # Generate new token
   openssl rand -base64 48
   
   # Update in .env
   PLUGIN_ADMIN_TOKEN=new_token_here
   
   # Restart console
   docker restart minecraft-console
   ```

---

## Backup & Restore Issues

### Backup Creation Fails

**Problem**: Backup creation returns error or incomplete

**Error Messages**:
- `Failed to create backup`
- `Permission denied`
- `Disk space`

**Solutions**:

1. **Check disk space**:
   ```bash
   df -h
   # Ensure sufficient space for backup
   ```

2. **Verify permissions**:
   ```bash
   docker exec minecraft-console ls -la /app/data/backups
   ```

3. **Manual backup**:
   ```bash
   # Stop server
   docker exec minecraft-server rcon-cli save-off
   docker exec minecraft-server rcon-cli save-all
   
   # Create backup
   docker exec minecraft-server tar -czf /data/backup.tar.gz /data/world*
   
   # Resume saves
   docker exec minecraft-server rcon-cli save-on
   ```

### Restore Fails

**Problem**: Backup restore returns error or doesn't work

**Solutions**:

1. **Verify backup file**:
   ```bash
   # Check backup integrity
   tar -tzf backup.tar.gz | head
   ```

2. **Manual restore**:
   ```bash
   # Stop server
   docker stop minecraft-server
   
   # Backup current world
   docker exec minecraft-server mv /data/world /data/world.old
   
   # Extract backup
   docker exec minecraft-server tar -xzf /data/backups/backup.tar.gz -C /data
   
   # Start server
   docker start minecraft-server
   ```

3. **Check logs**:
   ```bash
   docker logs minecraft-console | grep backup
   ```

---

## RCON Issues

### RCON Connection Refused

**Problem**: Console cannot connect to Minecraft server via RCON

**Error Messages**:
- `Connection refused`
- `Authentication failed`
- `Timeout`

**Solutions**:

1. **Verify RCON enabled**:
   ```properties
   # In server.properties
   enable-rcon=true
   rcon.port=25575
   rcon.password=YOUR_PASSWORD
   ```

2. **Check password match**:
   ```bash
   # Console .env should match server.properties
   grep RCON_PASSWORD console/.env
   docker exec minecraft-server grep rcon.password /data/server.properties
   ```

3. **Network connectivity**:
   ```bash
   # Test from console container
   docker exec minecraft-console nc -zv minecraft-server 25575
   ```

4. **Restart server**:
   ```bash
   # RCON changes require restart
   docker restart minecraft-server
   ```

### RCON Commands Not Working

**Problem**: Commands sent via RCON don't execute or return errors

**Solutions**:

1. **Check command syntax**:
   - Must use exact Minecraft command syntax
   - Include leading slash: `/say Hello`

2. **Permission issues**:
   - RCON runs as server console (has all permissions)
   - Should not have permission issues

3. **Plugin conflicts**:
   - Some plugins intercept commands
   - Try disabling command-intercepting plugins

4. **Test directly**:
   ```bash
   # Use rcon-cli
   docker exec minecraft-server rcon-cli list
   docker exec minecraft-server rcon-cli "say Test"
   ```

---

## Need More Help?

If your issue isn't covered here:

1. **Check diagnostic tools**:
   - [Diagnostics Guide](./diagnostics-guide.md)
   - [Browser Diagnostics](./browser-diagnostics.md)
   - [Plugin Diagnostics](./plugin-diagnostics.md)

2. **Review logs**:
   ```bash
   docker logs minecraft-server
   docker logs minecraft-console
   ```

3. **Search documentation**:
   - [Admin Guide](../admin/README.md)
   - [Development Docs](../development/README.md)

4. **Open an issue**:
   - Include error messages
   - Attach relevant logs
   - Describe steps to reproduce

---

## Related Documents

- [Diagnostics Guide](./diagnostics-guide.md) - Comprehensive diagnostic tools
- [Browser Diagnostics](./browser-diagnostics.md) - Frontend debugging
- [Plugin Diagnostics](./plugin-diagnostics.md) - Plugin troubleshooting
- [Admin Guide](../admin/admin-guide.md) - Server management

---

[← Back to Troubleshooting](./README.md) | [Documentation Hub](../README.md)
