← [Back to Admin Guide](./README.md) | [Documentation Home](../README.md)

---

# 🎯 Admin Quick Reference Cheat Sheet

Essential commands and procedures for festas_builds server administration. Bookmark this page for quick access!

---

## 📋 Table of Contents

1. [Docker Commands](#docker-commands)
2. [RCON Commands](#rcon-commands)
3. [Backup Commands](#backup-commands)
4. [Player Management](#player-management)
5. [Plugin Commands](#plugin-commands)
6. [Server Maintenance](#server-maintenance)
7. [Emergency Procedures](#emergency-procedures)
8. [Common File Paths](#common-file-paths)

---

## 🐳 Docker Commands

### Server Control

```bash
# View running containers
docker ps

# View all containers (including stopped)
docker ps -a

# Start the server
docker start minecraft-server

# Stop the server (graceful shutdown)
docker stop minecraft-server

# Restart the server
docker restart minecraft-server

# Force stop (use only if graceful shutdown fails)
docker kill minecraft-server

# Remove stopped container
docker rm minecraft-server
```

### Logs and Monitoring

```bash
# View live server logs
docker logs -f minecraft-server

# View last 100 lines of logs
docker logs --tail 100 minecraft-server

# View logs since specific time
docker logs --since 1h minecraft-server

# Save logs to file
docker logs minecraft-server > server.log 2>&1
```

### Container Management

```bash
# Execute command in container
docker exec minecraft-server <command>

# Open shell in container
docker exec -it minecraft-server bash

# View container stats (CPU, memory, network)
docker stats minecraft-server

# View container details
docker inspect minecraft-server
```

### Docker Compose

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Restart all services
docker compose restart

# View logs for all services
docker compose logs -f

# Rebuild and restart services
docker compose up -d --build

# Start specific service
docker compose up -d minecraft-server

# View service status
docker compose ps
```

---

## 🎮 RCON Commands

### Server Information

```bash
# List online players
/list

# Check server TPS (ticks per second)
/tps

# Check server version
/version

# View plugin list
/plugins

# Check server uptime
/uptime
```

### Player Management

```bash
# Grant operator status
/op <player>

# Remove operator status
/deop <player>

# Kick player
/kick <player> [reason]

# Ban player
/ban <player> [reason]

# Ban player by IP
/ban-ip <ip> [reason]

# Unban player
/pardon <player>

# Unban IP address
/pardon-ip <ip>

# View ban list
/banlist
```

### World Management

```bash
# Save the world
/save-all

# Disable auto-save (for backups)
/save-off

# Enable auto-save
/save-on

# Set world spawn
/setworldspawn [x y z]

# Set time to day
/time set day

# Set time to night
/time set night

# Set weather to clear
/weather clear [duration]

# Set weather to rain
/weather rain [duration]

# Set weather to thunder
/weather thunder [duration]
```

### Teleportation

```bash
# Teleport to player
/tp <your_name> <target_player>

# Teleport player to coordinates
/tp <player> <x> <y> <z>

# Teleport to coordinates
/tp <x> <y> <z>

# Teleport to spawn
/spawn
```

### Server Control

```bash
# Broadcast message to all players
/say <message>

# Stop the server
/stop

# Reload server (use with caution)
/reload

# Give item to player
/give <player> <item> [amount]

# Change player gamemode
/gamemode survival|creative|adventure|spectator <player>

# Set difficulty
/difficulty peaceful|easy|normal|hard
```

---

## 💾 Backup Commands

### Manual Backups

```bash
# Run manual backup script
./scripts/backup.sh

# Create backup with custom name
./scripts/backup.sh custom-backup-name

# Backup specific world only
docker exec minecraft-server tar czf /backups/world-backup.tar.gz /data/world

# Backup plugins directory
docker exec minecraft-server tar czf /backups/plugins-backup.tar.gz /data/plugins
```

### List and View Backups

```bash
# List all backups
ls -lh /home/deploy/minecraft-backups/

# List backups sorted by date
ls -lt /home/deploy/minecraft-backups/

# View backup size
du -sh /home/deploy/minecraft-backups/*

# Count number of backups
ls /home/deploy/minecraft-backups/ | wc -l

# Find backups older than 7 days
find /home/deploy/minecraft-backups/ -name "*.tar.gz" -mtime +7
```

### Restore from Backup

```bash
# Restore using script
./scripts/restore.sh backup-filename.tar.gz

# Manual restore (stop server first!)
docker stop minecraft-server
cd /home/deploy/minecraft-server
tar xzf /home/deploy/minecraft-backups/backup-name.tar.gz
docker start minecraft-server

# Restore specific files only
tar xzf backup.tar.gz data/plugins/PluginName
```

### Automated Backups

```bash
# Check backup cron job
crontab -l

# Edit backup schedule
crontab -e

# View backup job logs
grep backup /var/log/syslog
```

---

## 👥 Player Management

### Whitelist Management

```bash
# Enable whitelist
/whitelist on

# Disable whitelist
/whitelist off

# Add player to whitelist
/whitelist add <player>

# Remove player from whitelist
/whitelist remove <player>

# View whitelist
/whitelist list

# Reload whitelist from file
/whitelist reload
```

### Permission Management (LuckPerms)

```bash
# Grant permission
/lp user <player> permission set <permission> true

# Remove permission
/lp user <player> permission unset <permission>

# Add user to group
/lp user <player> parent add <group>

# Remove user from group
/lp user <player> parent remove <group>

# View user permissions
/lp user <player> info

# Create group
/lp creategroup <group>

# Delete group
/lp deletegroup <group>
```

### CoreProtect (Grief Prevention)

```bash
# Inspect block history
/co inspect

# Lookup player actions
/co lookup u:<player> t:7d

# Rollback player actions
/co rollback u:<player> t:1h r:10

# Restore player actions
/co restore u:<player> t:1h r:10

# Purge old data
/co purge t:30d
```

---

## 🔌 Plugin Commands

### EssentialsX

```bash
# Heal player
/heal [player]

# Feed player
/feed [player]

# Fly mode
/fly [player]

# God mode
/god [player]

# Set home
/sethome [name]

# Teleport home
/home [name]

# Set warp
/setwarp <name>

# Warp to location
/warp <name>
```

### WorldEdit

```bash
# Select position 1
//pos1

# Select position 2
//pos2

# Copy selection
//copy

# Paste selection
//paste

# Set blocks in selection
//set <block>

# Replace blocks
//replace <from_block> <to_block>

# Undo last action
//undo

# Redo last undone action
//redo
```

### GriefPrevention

```bash
# Claim land
/claim

# Abandon claim
/abandonclaim

# Trust player in claim
/trust <player>

# Untrust player
/untrust <player>

# List claims
/claimlist

# Transfer claim
/transferclaim <player>
```

---

## 🔧 Server Maintenance

### Disk Space Management

```bash
# Check disk usage
df -h

# Check directory size
du -sh /home/deploy/minecraft-server

# Find large files
find /home/deploy/minecraft-server -type f -size +100M

# Clean old logs
find /home/deploy/minecraft-server/logs -name "*.log.gz" -mtime +30 -delete

# Clean old backups (older than 30 days)
find /home/deploy/minecraft-backups -name "*.tar.gz" -mtime +30 -delete
```

### Performance Monitoring

```bash
# Check server resource usage
docker stats minecraft-server --no-stream

# Monitor memory usage
docker exec minecraft-server free -h

# Check CPU usage
top -p $(docker inspect -f '{{.State.Pid}}' minecraft-server)

# View active connections
netstat -an | grep :25565
```

### Log Management

```bash
# View server log in real-time
tail -f /home/deploy/minecraft-server/logs/latest.log

# Search logs for errors
grep -i error /home/deploy/minecraft-server/logs/latest.log

# Count warnings in logs
grep -c WARN /home/deploy/minecraft-server/logs/latest.log

# View player join/leave events
grep -E "joined|left" /home/deploy/minecraft-server/logs/latest.log
```

---

## 🚨 Emergency Procedures

### Server Won't Start

```bash
# 1. Check container status
docker ps -a

# 2. View container logs
docker logs minecraft-server

# 3. Check disk space
df -h

# 4. Verify permissions
ls -la /home/deploy/minecraft-server

# 5. Try starting with fresh container
docker stop minecraft-server
docker rm minecraft-server
docker compose up -d
```

### Server Crash Recovery

```bash
# 1. Stop the server
docker stop minecraft-server

# 2. Create emergency backup
cd /home/deploy/minecraft-server
tar czf ../emergency-backup-$(date +%Y%m%d-%H%M%S).tar.gz data/

# 3. Check crash logs
tail -100 /home/deploy/minecraft-server/logs/latest.log

# 4. Remove problematic world (if corrupted)
# mv data/world data/world.backup

# 5. Restart server
docker start minecraft-server
```

### Rollback to Previous Backup

```bash
# 1. Stop server immediately
docker stop minecraft-server

# 2. Move current data
mv /home/deploy/minecraft-server/data /home/deploy/minecraft-server/data.old

# 3. Extract backup
cd /home/deploy/minecraft-server
tar xzf /home/deploy/minecraft-backups/backup-name.tar.gz

# 4. Restart server
docker start minecraft-server

# 5. Verify server is working
docker logs -f minecraft-server
```

### Security Incident Response

```bash
# 1. Stop the server immediately
docker stop minecraft-server

# 2. Create forensic backup
tar czf incident-backup-$(date +%Y%m%d-%H%M%S).tar.gz \
  /home/deploy/minecraft-server/data \
  /home/deploy/minecraft-server/logs

# 3. Review audit logs
grep -E "ban|kick|op|deop" /home/deploy/minecraft-server/logs/*.log

# 4. Check for unauthorized changes
git status
git diff

# 5. Reset admin credentials if needed
# See Security Policy for full incident response procedures
```

---

## 📁 Common File Paths

### Server Files

```
/home/deploy/minecraft-server/          # Main server directory
/home/deploy/minecraft-server/data/     # Minecraft data (worlds, plugins)
/home/deploy/minecraft-server/logs/     # Server logs
/home/deploy/minecraft-backups/         # Backup storage
```

### Configuration Files

```
data/server.properties                  # Main server config
data/bukkit.yml                        # Bukkit configuration
data/spigot.yml                        # Spigot configuration
data/paper-global.yml                  # Paper global config
data/paper-world-defaults.yml          # Paper world defaults
data/ops.json                          # Operator list
data/whitelist.json                    # Whitelist
data/banned-players.json               # Banned players
data/banned-ips.json                   # Banned IPs
```

### Plugin Directories

```
data/plugins/                          # Plugin JAR files
data/plugins/PluginName/config.yml     # Plugin configuration
data/plugins/LuckPerms/                # Permission system
data/plugins/CoreProtect/              # Block logging
data/plugins/GriefPrevention/          # Land claims
data/plugins/Essentials/               # Essential commands
```

### World Files

```
data/world/                            # Overworld
data/world_nether/                     # Nether dimension
data/world_the_end/                    # End dimension
data/world/playerdata/                 # Player data
data/world/region/                     # World chunks
```

---

## 🔗 Quick Links

- **[Full Admin Guide](./admin-guide.md)** - Comprehensive procedures
- **[Server Management](./server-management.md)** - Detailed operations guide
- **[Security Policy](./security.md)** - Security procedures
- **[Upgrade Guide](./upgrade-guide.md)** - Safe upgrade procedures
- **[Troubleshooting](../troubleshooting/)** - Problem resolution

---

## 📋 Quick Checklists

### Daily Admin Checklist

- [ ] Check server status: `docker ps`
- [ ] Review logs: `docker logs --tail 50 minecraft-server`
- [ ] Check disk space: `df -h`
- [ ] Check player count: `/list`
- [ ] Review recent player activity
- [ ] Respond to any `/helpop` requests
- [ ] Check for CoreProtect alerts

### Weekly Maintenance Checklist

- [ ] Review full week's logs for errors
- [ ] Verify automated backups are running
- [ ] Check backup storage space
- [ ] Test restore from recent backup
- [ ] Update plugins if needed
- [ ] Review player reports and bans
- [ ] Check server performance metrics
- [ ] Clean old log files

### Pre-Upgrade Checklist

- [ ] Announce upcoming maintenance to players
- [ ] Create full server backup
- [ ] Test upgrade on dev server first
- [ ] Review upgrade guide and changelog
- [ ] Verify rollback procedure
- [ ] Schedule during low-traffic period
- [ ] Have emergency contacts ready

---

## 💡 Pro Tips

### Performance Optimization

```bash
# Pregenerate world chunks (reduces lag)
/worldborder set 5000
/chunky radius 2500
/chunky start

# Clear dropped items
/clearlag

# View chunk loading
/timings report
```

### Useful Aliases

Add to your `.bashrc`:

```bash
alias mclog='docker logs -f minecraft-server'
alias mcstats='docker stats minecraft-server --no-stream'
alias mcbackup='./scripts/backup.sh'
alias mcstop='docker stop minecraft-server'
alias mcstart='docker start minecraft-server'
alias mcrestart='docker restart minecraft-server'
```

---

**Last Updated:** 2024-12-10  
**Print Version:** Use browser print function (Ctrl+P / Cmd+P) for printable reference

[← Back to Admin Guide](./README.md)
