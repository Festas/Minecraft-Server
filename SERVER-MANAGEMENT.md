# Server Management Guide

Complete guide for managing the festas_builds Minecraft server deployment, including configuration, backups, and operations.

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [GitHub Secrets Configuration](#github-secrets-configuration)
3. [Deployment Workflows](#deployment-workflows)
4. [Backup and Restore](#backup-and-restore)
5. [Plugin Management](#plugin-management)
6. [Player Management](#player-management)
7. [Troubleshooting](#troubleshooting)
8. [Architecture Overview](#architecture-overview)
9. [Data Locations](#data-locations)
10. [Useful Commands](#useful-commands)

---

## Quick Reference

| Item | Value |
|------|-------|
| **Server Address** | your-server-ip:25565 |
| **Bedrock Address** | your-server-ip:19132 |
| **Web Console URL** | http://your-server:3001/console |
| **Data Volume** | minecraft_data |
| **Container Name** | minecraft-server |
| **Backup Location** | /home/deploy/minecraft-backups/ |
| **Deploy Directory** | /home/deploy/minecraft-server/ |
| **RCON Port** | 25575 (internal) |

---

## GitHub Secrets Configuration

### Required Secrets

These secrets **must** be configured in your GitHub repository for deployments to work:

#### Core Server Secrets

| Secret | Description | Example |
|--------|-------------|---------|
| `SERVER_HOST` | Your server's IP address or hostname | `123.45.67.89` |
| `SERVER_USER` | SSH username for deployment | `deploy` |
| `SSH_PRIVATE_KEY` | Private SSH key for authentication | Full private key content |
| `RCON_PASSWORD` | Password for RCON console access | `SecurePassword123!` |

#### Console Secrets (Required for Web Console)

| Secret | Description | Example | How to Generate |
|--------|-------------|---------|-----------------|
| `CONSOLE_ADMIN_USER` | Console login username | `admin` | Choose any username |
| `CONSOLE_ADMIN_PASSWORD` | Console login password | `SecurePass123!` | `openssl rand -base64 24` |
| `SESSION_SECRET` | Session encryption key (32+ chars) | `abc123...` | `openssl rand -hex 32` |
| `CSRF_SECRET` | CSRF token encryption key (32+ chars) | `xyz789...` | `openssl rand -base64 32` |
| `REDIS_HOST` | Redis server hostname | `redis` | Use `redis` for Docker |
| `REDIS_PORT` | Redis server port | `6379` | Default is `6379` |

**To add secrets:**
1. Go to your GitHub repository
2. Navigate to: Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret with its name and value

### Optional Configuration Secrets

These secrets enable additional server features and customization:

| Secret | Description | Example | Default |
|--------|-------------|---------|---------|
| `MINECRAFT_VERSION` | Minecraft server version | `1.21.1` | `1.20.4` |
| `WORLD_SEED` | World generation seed | `1234567890` | Random |
| `OP_OWNER` | Primary server operator | `YourUsername` | None |
| `OP_ADDITIONAL` | Additional operators (comma-separated) | `Friend1,Friend2` | None |
| `WHITELIST_ENABLED` | Enable whitelist mode | `true` | Disabled |
| `WHITELIST_USERS` | Whitelisted players (comma-separated) | `Player1,Player2,Player3` | None |
| `PLUGINS_URLS` | Direct plugin download URLs (comma-separated) | `https://url1.jar,https://url2.jar` | None |
| `SPIGET_RESOURCES` | Spigot plugin resource IDs (comma-separated) | `28140,81534` | None |
| `SERVER_ICON_URL` | Custom server icon (64x64 PNG) | `https://example.com/icon.png` | Default icon |

### Configuration Examples

#### Basic Server with Operators

```
OP_OWNER=ServerOwner
OP_ADDITIONAL=Admin1,Admin2,Moderator1
```

This automatically grants operator status to:
- ServerOwner (primary)
- Admin1, Admin2, Moderator1 (additional)

#### Private Server with Whitelist

```
WHITELIST_ENABLED=true
WHITELIST_USERS=Friend1,Friend2,Friend3,Friend4
OP_OWNER=Friend1
```

Only whitelisted players can join, and Friend1 is an operator.

#### Custom Version with World Seed

```
MINECRAFT_VERSION=1.21.1
WORLD_SEED=8675309
```

Runs Minecraft 1.21.1 with a specific world seed.

#### Auto-Install Plugins

**From Direct URLs:**
```
PLUGINS_URLS=https://github.com/LuckPerms/LuckPerms/releases/download/v5.4.102/LuckPerms-Bukkit-5.4.102.jar,https://github.com/EssentialsX/Essentials/releases/download/2.20.1/EssentialsX-2.20.1.jar
```

**From Spigot Resources:**
```
SPIGET_RESOURCES=28140,81534
```

**Combined:**
```
PLUGINS_URLS=https://example.com/MyPlugin.jar
SPIGET_RESOURCES=28140,81534
```

---

## Deployment Workflows

### Deploy/Update Server

**Workflow:** `.github/workflows/deploy-minecraft.yml`

#### Available Actions

| Action | Description | When to Use |
|--------|-------------|-------------|
| **deploy** | Deploy or update server | Initial setup or configuration changes |
| **restart** | Restart the server | After plugin config changes |
| **stop** | Stop the server | Maintenance or troubleshooting |
| **start** | Start a stopped server | Resume after maintenance |
| **update** | Pull latest image and recreate | Update server software |
| **logs** | View recent logs | Troubleshooting issues |

#### How to Deploy

1. Go to **Actions** tab in your GitHub repository
2. Select **Deploy Minecraft Server Container**
3. Click **Run workflow**
4. Select the action from the dropdown
5. Click **Run workflow**

The workflow will:
- Connect to your server via SSH
- Create/update docker-compose.yml with your configured secrets
- Perform the selected action
- Verify server health (for deploy/start/update)
- Display status in workflow summary

#### Configuration Changes

To change server settings:

1. Update the corresponding GitHub secrets
2. Run the workflow with **deploy** action
3. The server will restart with new configuration

**Note:** The workflow generates `docker-compose.yml` on the server using your secrets, so you don't need to manually edit files.

### Backup Server

**Workflow:** `.github/workflows/backup-minecraft.yml`

#### Automated Backups

Backups run automatically **daily at 4 AM UTC** via GitHub Actions.

**What's Backed Up:**
- All worlds (Overworld, Nether, End)
- Plugins directory and all configurations
- Operator list (ops.json)
- Whitelist (whitelist.json)
- Banned players and IPs
- Server properties

**Backup Process:**
1. Disable world auto-save via RCON (`save-off`)
2. Force save current state (`save-all flush`)
3. Create compressed tar.gz archive
4. Re-enable auto-save (`save-on`)
5. Delete backups older than 7 days
6. Verify backup size and success

#### Manual Backup

To create a backup immediately:

1. Go to **Actions** tab
2. Select **Backup Minecraft Server**
3. Click **Run workflow**
4. (Optional) Enter a custom backup name
5. (Optional) Check "Skip RCON save commands" if server is stopped
6. Click **Run workflow**

**Custom Backup Names:**
If you provide a custom name (e.g., `before-update`), the backup will be named:
```
minecraft-backup-before-update-20250106-143022.tar.gz
```

#### Backup Retention

- Last **7 backups** are kept automatically
- Older backups are deleted
- Each backup is timestamped
- Backups stored at `/home/deploy/minecraft-backups/`

---

## Backup and Restore

### Viewing Backups

SSH into your server and list backups:

```bash
ssh user@your-server
ls -lh /home/deploy/minecraft-backups/
```

You'll see files like:
```
minecraft-backup-20250106-040001.tar.gz  (145M)
minecraft-backup-20250105-040001.tar.gz  (144M)
minecraft-backup-20250104-040001.tar.gz  (143M)
```

### Manual Backup (On Server)

If you need to create a backup directly on the server:

```bash
# Create backup directory
mkdir -p /home/deploy/minecraft-backups
cd /home/deploy/minecraft-backups

# Create backup
docker run --rm \
  -v minecraft_data:/data:ro \
  -v /home/deploy/minecraft-backups:/backup \
  alpine tar czf /backup/minecraft-backup-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .

# Verify
ls -lh minecraft-backup-*.tar.gz | tail -5
```

### Restore from Backup

**⚠️ Warning:** This will replace your current world and data!

```bash
# 1. Stop the server (via GitHub Actions or SSH)
# Using GitHub Actions: Run workflow → Deploy → stop
# OR via SSH:
cd /home/deploy/minecraft-server
docker compose stop

# 2. List available backups
ls -lh /home/deploy/minecraft-backups/

# 3. Restore the backup
docker run --rm \
  -v minecraft_data:/data \
  -v /home/deploy/minecraft-backups:/backup \
  alpine sh -c "cd /data && rm -rf ./* && tar xzf /backup/minecraft-backup-YYYYMMDD-HHMMSS.tar.gz"

# 4. Start the server (via GitHub Actions or SSH)
# Using GitHub Actions: Run workflow → Deploy → start
# OR via SSH:
docker compose start

# 5. Monitor logs
docker logs minecraft-server -f
```

### Download Backup to Local Machine

To download a backup for safekeeping:

```bash
# From your local machine
scp user@your-server:/home/deploy/minecraft-backups/minecraft-backup-YYYYMMDD-HHMMSS.tar.gz ~/Downloads/
```

---

## Plugin Management

### Method 1: Auto-Download During Deployment

**Best for:** Plugins you want to install automatically on every deployment.

Add GitHub secrets:

**Direct URLs:**
```
PLUGINS_URLS=https://github.com/LuckPerms/LuckPerms/releases/download/v5.4.102/LuckPerms-Bukkit-5.4.102.jar
```

**Spigot Resources (by ID):**
```
SPIGET_RESOURCES=28140
```

Then run the **deploy** workflow action. The container will download and install these plugins automatically.

### Method 2: Manual Installation via Docker

**Best for:** One-time plugin installation or testing.

```bash
# SSH to your server
ssh user@your-server

# Download plugin
wget -O /tmp/MyPlugin.jar https://example.com/MyPlugin.jar

# Copy to container
docker cp /tmp/MyPlugin.jar minecraft-server:/data/plugins/

# Restart server to load plugin
cd /home/deploy/minecraft-server
docker compose restart minecraft-server

# Verify plugin loaded
docker logs minecraft-server | grep -i "MyPlugin"
```

### Method 3: Console Command (PlugMan)

**Best for:** Installing plugins without restarting the server.

If you have PlugMan installed:

1. Access web console at http://your-server:3001/console
2. Execute command:
   ```
   /plugman load MyPlugin
   ```

Or via RCON:
```bash
docker exec minecraft-server rcon-cli plugman load MyPlugin
```

### Updating Plugins

1. Update the plugin URL in `PLUGINS_URLS` secret
2. Run **deploy** workflow action
3. The container will download the new version

Or manually:
```bash
# Remove old version
docker exec minecraft-server rm /data/plugins/OldPlugin.jar

# Add new version
docker cp NewPlugin.jar minecraft-server:/data/plugins/

# Restart
docker compose restart minecraft-server
```

### Plugin Configuration

Plugin configs are in the container at `/data/plugins/PluginName/`.

To edit:
```bash
# Copy config out of container
docker cp minecraft-server:/data/plugins/PluginName/config.yml /tmp/

# Edit locally
nano /tmp/config.yml

# Copy back
docker cp /tmp/config.yml minecraft-server:/data/plugins/PluginName/

# Reload plugin (if PlugMan available)
docker exec minecraft-server rcon-cli plugman reload PluginName
# OR restart server
docker compose restart minecraft-server
```

---

## Player Management

### Operators

Operators have full server permissions.

**Set via Secrets (Automatic):**
```
OP_OWNER=PrimaryAdmin
OP_ADDITIONAL=Admin2,Admin3
```

**Add via RCON:**
```bash
# Via web console or SSH
docker exec minecraft-server rcon-cli op PlayerName
```

**Remove OP:**
```bash
docker exec minecraft-server rcon-cli deop PlayerName
```

**List OPs:**
```bash
docker exec minecraft-server cat /data/ops.json
```

### Whitelist

**Enable via Secrets:**
```
WHITELIST_ENABLED=true
WHITELIST_USERS=Player1,Player2,Player3
```

Then run **deploy** workflow.

**Manual Management:**
```bash
# Add player
docker exec minecraft-server rcon-cli whitelist add PlayerName

# Remove player
docker exec minecraft-server rcon-cli whitelist remove PlayerName

# List whitelist
docker exec minecraft-server cat /data/whitelist.json

# Enable/disable whitelist
docker exec minecraft-server rcon-cli whitelist on
docker exec minecraft-server rcon-cli whitelist off
```

### Bans

**Ban player:**
```bash
docker exec minecraft-server rcon-cli ban PlayerName Reason here
```

**Temporary ban:**
```bash
# Note: Use a plugin like EssentialsX for tempban
docker exec minecraft-server rcon-cli tempban PlayerName 7d Griefing
```

**Unban player:**
```bash
docker exec minecraft-server rcon-cli pardon PlayerName
```

**Ban IP:**
```bash
docker exec minecraft-server rcon-cli ban-ip 123.45.67.89
```

**List bans:**
```bash
docker exec minecraft-server cat /data/banned-players.json
docker exec minecraft-server cat /data/banned-ips.json
```

### Player Actions

**Kick:**
```bash
docker exec minecraft-server rcon-cli kick PlayerName Reason
```

**Teleport:**
```bash
docker exec minecraft-server rcon-cli tp PlayerName TargetPlayer
docker exec minecraft-server rcon-cli tp PlayerName 100 64 200
```

**Change Gamemode:**
```bash
docker exec minecraft-server rcon-cli gamemode survival PlayerName
docker exec minecraft-server rcon-cli gamemode creative PlayerName
```

---

## Troubleshooting

### Server Won't Start

**Check container status:**
```bash
docker ps -a | grep minecraft-server
```

**View logs:**
```bash
docker logs minecraft-server --tail=100
```

**Common issues:**

1. **Port already in use:**
   ```bash
   # Check what's using port 25565
   sudo netstat -tulpn | grep 25565
   # Stop conflicting service or change port
   ```

2. **Out of memory:**
   ```bash
   # Check memory
   free -h
   # Reduce MEMORY setting in workflow or upgrade server
   ```

3. **EULA not accepted:**
   - The workflow sets `EULA: "TRUE"` automatically
   - If still failing, check logs for other errors

### Players Can't Connect

**Check firewall:**
```bash
sudo ufw status
sudo ufw allow 25565/tcp
sudo ufw allow 25565/udp
```

**Check server is listening:**
```bash
netstat -tulpn | grep 25565
```

**Check online mode:**
- If players have cracked accounts, you need `ONLINE_MODE: "false"` (not recommended for public servers)

### Backup Failed

**Check disk space:**
```bash
df -h /home/deploy
```

**Check backup directory:**
```bash
ls -lh /home/deploy/minecraft-backups/
```

**Check container:**
```bash
docker ps | grep minecraft-server
docker volume ls | grep minecraft_data
```

**Manually verify volume:**
```bash
docker run --rm -v minecraft_data:/data alpine ls -lh /data
```

### Lag/Performance Issues

**Check TPS (via console):**
```bash
docker exec minecraft-server rcon-cli tps
```

**Check resource usage:**
```bash
docker stats minecraft-server
```

**Common fixes:**
- Reduce `VIEW_DISTANCE` (currently 10, try 8)
- Increase `MEMORY` (currently 4G, try 6G or 8G)
- Optimize plugins (remove unused ones)
- Use Paper's performance optimizations (already enabled)

### RCON Connection Issues

**Test RCON:**
```bash
docker exec minecraft-server rcon-cli list
```

**Check RCON configuration:**
```bash
docker exec minecraft-server cat /data/server.properties | grep rcon
```

**Verify RCON password:**
```bash
# In /home/deploy/minecraft-server/.env
cat /home/deploy/minecraft-server/.env
```

### Container Health Check Failing

**Check health:**
```bash
docker inspect minecraft-server | grep -A 20 Health
```

**Common causes:**
- Server still starting (wait 2-3 minutes)
- Crash on startup (check logs)
- Resource exhaustion (check memory/CPU)

---

## Architecture Overview

### Container Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     GitHub Actions                       │
│  ┌────────────────┐              ┌──────────────────┐   │
│  │ Deploy Server  │              │ Backup Server    │   │
│  │   Workflow     │              │    Workflow      │   │
│  └────────┬───────┘              └─────────┬────────┘   │
│           │ SSH                             │ SSH        │
└───────────┼─────────────────────────────────┼───────────┘
            │                                 │
            ▼                                 ▼
┌─────────────────────────────────────────────────────────┐
│                    Your VPS Server                       │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │           docker-compose.yml                      │  │
│  │  ┌──────────────────────────────────────────┐    │  │
│  │  │     minecraft-server container           │    │  │
│  │  │  ┌─────────────────────────────────┐     │    │  │
│  │  │  │  itzg/minecraft-server:java21    │     │    │  │
│  │  │  │  - Paper Server                  │     │    │  │
│  │  │  │  - RCON enabled (25575)          │     │    │  │
│  │  │  │  - Port 25565 exposed            │     │    │  │
│  │  │  └──────────┬──────────────────────┘     │    │  │
│  │  │             │                             │    │  │
│  │  │             │ /data volume mount          │    │  │
│  │  │             ▼                             │    │  │
│  │  │  ┌─────────────────────────────────┐     │    │  │
│  │  │  │    minecraft_data volume         │     │    │  │
│  │  │  │  - worlds/                       │     │    │  │
│  │  │  │  - plugins/                      │     │    │  │
│  │  │  │  - ops.json, whitelist.json      │     │    │  │
│  │  │  │  - server.properties             │     │    │  │
│  │  │  └─────────────────────────────────┘     │    │  │
│  │  └──────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │         /home/deploy/minecraft-backups/           │  │
│  │  - minecraft-backup-YYYYMMDD-HHMMSS.tar.gz       │  │
│  │  - (keeps last 7 backups)                        │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
            │
            │ Port 25565 (Minecraft)
            ▼
      Players connect here
```

### Network Flow

1. **GitHub Actions** triggers deployment/backup via SSH
2. **SSH Action** executes commands on your VPS
3. **Docker Compose** manages the Minecraft container
4. **Container** runs Paper server with configured settings
5. **Docker Volume** persists all server data
6. **Backups** are created from the volume to local storage

### Data Flow

```
GitHub Secrets → GitHub Actions → SSH → docker-compose.yml → Container Environment → Minecraft Server
```

---

## Data Locations

### On Your Server

| Location | Contents | Persistent? |
|----------|----------|-------------|
| `/home/deploy/minecraft-server/` | Deployment directory (docker-compose.yml, .env) | Yes |
| `/home/deploy/minecraft-backups/` | Backup archives | Yes |
| Docker volume: `minecraft_data` | All server data (worlds, plugins, configs) | Yes |

### In the Container

| Path | Contents |
|------|----------|
| `/data/world/` | Overworld dimension |
| `/data/world_nether/` | Nether dimension |
| `/data/world_the_end/` | End dimension |
| `/data/plugins/` | Plugin JARs and configs |
| `/data/ops.json` | Operator list |
| `/data/whitelist.json` | Whitelist |
| `/data/banned-players.json` | Banned players |
| `/data/banned-ips.json` | Banned IPs |
| `/data/server.properties` | Server configuration |
| `/data/logs/` | Server logs |

### Accessing Container Files

**View files:**
```bash
docker exec minecraft-server ls -lh /data/
```

**Copy file out:**
```bash
docker cp minecraft-server:/data/server.properties /tmp/
```

**Copy file in:**
```bash
docker cp /tmp/server.properties minecraft-server:/data/
```

**Interactive shell:**
```bash
docker exec -it minecraft-server bash
```

---

## Useful Commands

### Server Control

```bash
# Start server
docker compose -f /home/deploy/minecraft-server/docker-compose.yml start

# Stop server  
docker compose -f /home/deploy/minecraft-server/docker-compose.yml stop

# Restart server
docker compose -f /home/deploy/minecraft-server/docker-compose.yml restart

# View status
docker ps | grep minecraft-server

# View resource usage
docker stats minecraft-server
```

### Logs

```bash
# Recent logs
docker logs minecraft-server --tail=100

# Follow logs (live)
docker logs minecraft-server -f

# Search logs
docker logs minecraft-server | grep ERROR
docker logs minecraft-server | grep "PlayerName"
```

### RCON Console

```bash
# Interactive RCON
docker exec -it minecraft-server rcon-cli

# Single command
docker exec minecraft-server rcon-cli <command>

# Examples
docker exec minecraft-server rcon-cli list
docker exec minecraft-server rcon-cli tps
docker exec minecraft-server rcon-cli say Server restarting in 5 minutes
docker exec minecraft-server rcon-cli save-all
```

### Backup Commands

```bash
# List backups
ls -lh /home/deploy/minecraft-backups/

# Disk usage of backups
du -sh /home/deploy/minecraft-backups/

# Remove specific backup
rm /home/deploy/minecraft-backups/minecraft-backup-YYYYMMDD-HHMMSS.tar.gz

# Remove backups older than 30 days
find /home/deploy/minecraft-backups/ -name "minecraft-backup-*.tar.gz" -mtime +30 -delete
```

### Volume Management

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect minecraft_data

# View volume size
docker system df -v | grep minecraft_data

# Backup volume (same as GitHub Actions)
docker run --rm \
  -v minecraft_data:/data:ro \
  -v /home/deploy/minecraft-backups:/backup \
  alpine tar czf /backup/manual-backup-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .
```

### Health Checks

```bash
# Container health
docker inspect minecraft-server --format='{{.State.Health.Status}}'

# Detailed health info
docker inspect minecraft-server | grep -A 20 Health

# Test port connectivity
nc -zv localhost 25565
```

---

## Additional Resources

- **[README.md](README.md)** - Main documentation
- **[docs/getting-started/deployment.md](docs/getting-started/deployment.md)** - Initial deployment guide
- **[PLUGINS.md](PLUGINS.md)** - Plugin recommendations and setup
- **[CONSOLE-SETUP.md](CONSOLE-SETUP.md)** - Web console setup
- **[Paper Documentation](https://docs.papermc.io/)** - Paper server docs
- **[itzg/minecraft-server](https://github.com/itzg/docker-minecraft-server)** - Container documentation

---

## Getting Help

If you encounter issues:

1. Check this troubleshooting section
2. Review workflow logs in GitHub Actions
3. Check container logs: `docker logs minecraft-server`
4. Verify secrets are configured correctly
5. Check server resources (disk, memory, CPU)
6. Review [docs/getting-started/deployment.md](docs/getting-started/deployment.md) for setup issues

For plugin-specific issues, see [PLUGINS.md](PLUGINS.md).

---

*Last updated: 2025-01-06*
