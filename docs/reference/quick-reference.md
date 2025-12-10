← [Back to Reference](./README.md) | [Documentation Home](../README.md)

---

# Quick Reference Guide

Quick command reference for managing your Minecraft server.

**Document Type:** ⭐ Easy (Reference)  
**Target Audience:** Server Administrators  
**Purpose:** Quick lookup for common commands and procedures

---

## 🚀 Essential Commands

### Server Control

```bash
# Start the server
sudo systemctl start minecraft.service

# Stop the server
sudo systemctl stop minecraft.service

# Restart the server
sudo systemctl restart minecraft.service

# Check server status
sudo systemctl status minecraft.service

# Enable autostart on boot
sudo systemctl enable minecraft.service

# Disable autostart on boot
sudo systemctl disable minecraft.service
```

### Viewing Logs

```bash
# Live logs (Ctrl+C to exit)
sudo journalctl -u minecraft.service -f

# Last 100 lines
sudo journalctl -u minecraft.service -n 100

# Logs from today
sudo journalctl -u minecraft.service --since today

# Logs since last boot
sudo journalctl -u minecraft.service -b
```

### File Locations

```bash
# Server directory
/home/deploy/minecraft-server/

# Configuration file
/home/deploy/minecraft-server/server.properties

# World data
/home/deploy/minecraft-server/world/

# Server logs
/home/deploy/minecraft-server/logs/

# Systemd service
/etc/systemd/system/minecraft.service
```

## 🔧 Configuration

### Common server.properties Settings

```properties
# Change server description
motd=Your Server Name Here

# Change max players (default: 20)
max-players=50

# Change difficulty (peaceful, easy, normal, hard)
difficulty=hard

# Change game mode (survival, creative, adventure, spectator)
gamemode=creative

# Enable/disable PvP
pvp=false

# Change view distance (higher = more load)
view-distance=12

# Enable whitelist
white-list=true

# Change world seed
level-seed=12345678901234567890
```

### After Changing Configuration

```bash
# Restart server to apply changes
sudo systemctl restart minecraft.service
```

## 👥 Player Management

### Add Operator (Op)

```bash
# Method 1: Edit ops.json
nano /home/deploy/minecraft-server/ops.json

# Method 2: Via server console
screen -r minecraft
/op PlayerName
# Ctrl+A, D to detach
```

### Whitelist Players

```bash
# Enable whitelist in server.properties first
white-list=true

# Add player
nano /home/deploy/minecraft-server/whitelist.json
# Add: {"uuid":"player-uuid","name":"PlayerName"}

# Or via console
screen -r minecraft
/whitelist add PlayerName
```

### Ban/Unban Players

```bash
# Via console
screen -r minecraft
/ban PlayerName Reason
/unban PlayerName
/ban-ip 123.456.789.0
/pardon-ip 123.456.789.0
```

## 💾 Backup & Restore

### Create Backup

```bash
# Manual backup
/home/deploy/minecraft-server/backup.sh

# Manual backup (alternative)
cd /home/deploy
tar -czf minecraft-backup-$(date +%Y%m%d).tar.gz minecraft-server/world*
```

### Restore from Backup

```bash
# Stop server
sudo systemctl stop minecraft.service

# Restore world
cd /home/deploy/minecraft-server
rm -rf world world_nether world_the_end
tar -xzf /path/to/backup.tar.gz

# Start server
sudo systemctl start minecraft.service
```

### Automated Backups

```bash
# Add to crontab
crontab -e

# Daily at 3 AM
0 3 * * * /home/deploy/minecraft-server/backup.sh

# Every 6 hours
0 */6 * * * /home/deploy/minecraft-server/backup.sh
```

## 🔄 Updates

### Update Minecraft Version

```bash
# Use update script
/home/deploy/minecraft-server/update.sh

# Or manually
sudo systemctl stop minecraft.service
cd /home/deploy/minecraft-server
mv server.jar server.jar.old
curl -o server.jar [NEW_VERSION_URL]
sudo systemctl start minecraft.service
```

### Update Configuration via GitHub

```bash
# Edit files in repository
git add server.properties
git commit -m "Update server config"
git push

# GitHub Actions will automatically deploy
```

## 🐛 Troubleshooting

### Server Won't Start

```bash
# Check logs
sudo journalctl -u minecraft.service -n 50

# Check if EULA is accepted
cat /home/deploy/minecraft-server/eula.txt

# Check Java
java -version

# Check port availability
sudo lsof -i :25565
```

### High Memory Usage

```bash
# Check current memory usage
free -h
htop

# Adjust memory in /etc/systemd/system/minecraft.service
sudo nano /etc/systemd/system/minecraft.service
# Change: -Xms2G -Xmx4G to desired values

sudo systemctl daemon-reload
sudo systemctl restart minecraft.service
```

### Can't Connect

```bash
# Check if server is running
sudo systemctl status minecraft.service

# Check if port is open
sudo ufw status
sudo netstat -tulpn | grep 25565

# Test from server
telnet localhost 25565
```

### Lag Issues

```bash
# Check TPS (ticks per second) in-game
/tps

# Check server load
htop

# Reduce view distance in server.properties
view-distance=8
simulation-distance=8

# Add performance flags (see docs/getting-started/deployment.md)
```

## 📊 Monitoring

### Check Server Performance

```bash
# CPU and RAM usage
htop

# Disk usage
df -h

# Specific to Java/Minecraft
ps aux | grep java

# Network usage
sudo iftop
```

### Check Player Count

```bash
# Via logs
sudo journalctl -u minecraft.service | grep "players online"

# Via server console
screen -r minecraft
/list
```

## 🔐 Security

### Change RCON Password

```bash
# Edit server.properties
nano /home/deploy/minecraft-server/server.properties

# Set:
enable-rcon=true
rcon.password=YourSecurePassword
rcon.port=25575

# Restart server
sudo systemctl restart minecraft.service
```

### Firewall Configuration

```bash
# Allow Minecraft port
sudo ufw allow 25565/tcp
sudo ufw allow 25565/udp

# Check firewall status
sudo ufw status

# Enable firewall
sudo ufw enable
```

## 📱 Connect to Server

### From Minecraft Client

1. Open Minecraft Java Edition
2. Click "Multiplayer"
3. Click "Add Server"
4. Server Address: `your-server-ip:25565`
5. Click "Done" and join

### Default Port

- **Port**: 25565 (TCP/UDP)
- If you changed the port in server.properties, use that port

## 🆘 Emergency Commands

### Force Stop

```bash
# If graceful stop doesn't work
sudo systemctl kill minecraft.service

# Find and kill Java process
ps aux | grep java
sudo kill -9 [PID]
```

### Reset World

```bash
sudo systemctl stop minecraft.service
cd /home/deploy/minecraft-server
mv world world.backup
mv world_nether world_nether.backup
mv world_the_end world_the_end.backup
sudo systemctl start minecraft.service
# Server will generate new world
```

### Reinstall

```bash
# Backup first!
/home/deploy/minecraft-server/backup.sh

# Remove and redeploy via GitHub Actions
sudo systemctl stop minecraft.service
sudo systemctl disable minecraft.service
rm -rf /home/deploy/minecraft-server/*
# Trigger GitHub Actions deployment
# Then enable and start service again
```

---

## 🔗 Related Documents

- **[Server Management](../admin/server-management.md)** - Detailed server administration guide
- **[Docker Guide](../getting-started/docker.md)** - Docker-based deployment
- **[Deployment Guide](../getting-started/deployment.md)** - Full deployment instructions
- **[Admin Cheatsheet](../admin/cheatsheet.md)** - More quick reference commands
- **[Troubleshooting](../troubleshooting/common-issues.md)** - Common problems and solutions

---

[← Back to Reference](./README.md) | [Documentation Home](../README.md)
