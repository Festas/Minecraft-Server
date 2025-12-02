# Minecraft Server Deployment Guide

This guide will walk you through deploying a Minecraft server to your Hetzner server with automated GitHub Actions deployment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Server Setup](#initial-server-setup)
3. [GitHub Repository Setup](#github-repository-setup)
4. [First Deployment](#first-deployment)
5. [Server Management](#server-management)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Configuration](#advanced-configuration)

---

## Prerequisites

Before starting, ensure you have:

- A Hetzner server (or any Linux server) with:
  - Ubuntu 20.04+ or Debian 11+ (recommended)
  - At least 2GB RAM (4GB+ recommended)
  - At least 10GB free disk space
  - Root or sudo access
- A user named `deploy` on your server (already exists per your request)
- SSH access to your server
- A GitHub account with this repository

---

## Initial Server Setup

### 1. Install Java on Your Hetzner Server

SSH into your server and install Java:

```bash
# SSH into your server
ssh deploy@your-server-ip

# Update package list
sudo apt update

# Install Java 17 (required for Minecraft 1.20.4+)
sudo apt install -y openjdk-17-jre-headless

# Verify Java installation
java -version
```

You should see output showing Java version 17 or higher.

### 2. Configure Firewall

Open the Minecraft server port (default: 25565):

```bash
# If using UFW (Ubuntu Firewall)
sudo ufw allow 25565/tcp
sudo ufw allow 25565/udp

# If using iptables
sudo iptables -A INPUT -p tcp --dport 25565 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 25565 -j ACCEPT
```

### 3. Setup Deploy User Permissions

The `deploy` user needs sudo permissions for systemd management:

```bash
# Add deploy user to sudoers with limited permissions
sudo visudo
```

Add this line at the end of the file:

```
deploy ALL=(ALL) NOPASSWD: /bin/systemctl daemon-reload, /bin/systemctl restart minecraft.service, /bin/systemctl start minecraft.service, /bin/systemctl stop minecraft.service, /bin/systemctl enable minecraft.service, /bin/systemctl status minecraft.service, /bin/mv /tmp/minecraft.service /etc/systemd/system/
```

Save and exit (Ctrl+X, then Y, then Enter in nano).

### 4. Create Server Directory

```bash
# Create the Minecraft server directory
mkdir -p /home/deploy/minecraft-server
cd /home/deploy/minecraft-server
```

---

## GitHub Repository Setup

### 1. Generate SSH Key for GitHub Actions

On your **local machine**, generate an SSH key pair:

```bash
ssh-keygen -t rsa -b 4096 -f minecraft-deploy-key -N ""
```

This creates two files:
- `minecraft-deploy-key` (private key)
- `minecraft-deploy-key.pub` (public key)

### 2. Add Public Key to Hetzner Server

Copy the public key to your server:

```bash
# Copy the public key content
cat minecraft-deploy-key.pub

# SSH into your server
ssh deploy@your-server-ip

# Add the key to authorized_keys
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
# Paste the public key content, save and exit

# Set correct permissions
chmod 600 ~/.ssh/authorized_keys
```

### 3. Configure GitHub Secrets

In your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add these secrets:

| Secret Name | Value | Description |
|------------|--------|-------------|
| `SSH_PRIVATE_KEY` | Content of `minecraft-deploy-key` file | Private SSH key for deployment |
| `SERVER_HOST` | Your server IP or hostname | e.g., `123.456.789.012` |
| `SERVER_USER` | `deploy` | The deployment user |

To get the private key content:

```bash
cat minecraft-deploy-key
```

Copy the entire output (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`).

---

## First Deployment

### 1. Accept Minecraft EULA

Before the server can run, you must accept the Minecraft End User License Agreement:

1. Edit `eula.txt` in this repository
2. Change `eula=false` to `eula=true`
3. Commit and push:

```bash
git add eula.txt
git commit -m "Accept Minecraft EULA"
git push
```

### 2. Trigger Deployment

The deployment happens automatically when you push to the `main` branch, or you can trigger it manually:

1. Go to **Actions** tab in GitHub
2. Select **Deploy Minecraft Server** workflow
3. Click **Run workflow**
4. Select the `main` branch
5. Click **Run workflow**

### 3. Enable the Minecraft Service

After the first deployment, SSH into your server and enable the service:

```bash
ssh deploy@your-server-ip

# Enable and start the Minecraft service
sudo systemctl enable minecraft.service
sudo systemctl start minecraft.service

# Check status
sudo systemctl status minecraft.service
```

### 4. Verify Server is Running

Check the logs to ensure the server started correctly:

```bash
# View live logs
sudo journalctl -u minecraft.service -f

# View recent logs
sudo journalctl -u minecraft.service -n 100
```

You should see messages indicating the server is starting. Wait a few minutes for the world to generate on first run.

### 5. Test Connection

From your Minecraft client:

1. Open Minecraft (Java Edition)
2. Click **Multiplayer**
3. Click **Add Server**
4. Enter:
   - **Server Name**: Your server name
   - **Server Address**: `your-server-ip:25565`
5. Click **Done** and connect

---

## Server Management

### Starting the Server

```bash
sudo systemctl start minecraft.service
```

### Stopping the Server

```bash
sudo systemctl stop minecraft.service
```

### Restarting the Server

```bash
sudo systemctl restart minecraft.service
```

### Checking Server Status

```bash
sudo systemctl status minecraft.service
```

### Viewing Logs

```bash
# Live logs (Ctrl+C to exit)
sudo journalctl -u minecraft.service -f

# Recent logs
sudo journalctl -u minecraft.service -n 100

# Logs since boot
sudo journalctl -u minecraft.service -b
```

### Manual Server Start (Alternative)

If you prefer to run the server manually:

```bash
cd /home/deploy/minecraft-server
./start.sh
```

---

## Troubleshooting

### Server Won't Start

1. **Check Java installation:**
   ```bash
   java -version
   ```

2. **Check if port is already in use:**
   ```bash
   sudo lsof -i :25565
   ```

3. **Check EULA acceptance:**
   ```bash
   cat /home/deploy/minecraft-server/eula.txt
   ```
   Ensure it says `eula=true`

4. **Check permissions:**
   ```bash
   ls -la /home/deploy/minecraft-server/
   ```
   The `deploy` user should own all files.

5. **Check logs:**
   ```bash
   sudo journalctl -u minecraft.service -n 50
   ```

### Connection Issues

1. **Verify firewall:**
   ```bash
   sudo ufw status
   # or
   sudo iptables -L
   ```

2. **Check if server is listening:**
   ```bash
   sudo netstat -tulpn | grep 25565
   ```

3. **Test from server:**
   ```bash
   telnet localhost 25565
   ```

### Out of Memory

If the server crashes with OutOfMemoryError:

1. Edit `/etc/systemd/system/minecraft.service`
2. Increase memory in the `ExecStart` line:
   ```
   ExecStart=/usr/bin/java -Xms4G -Xmx6G -jar server.jar nogui
   ```
3. Reload and restart:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart minecraft.service
   ```

### Deployment Fails

1. **Check GitHub Actions logs** in the Actions tab
2. **Verify SSH key** is correctly added to server
3. **Test SSH connection** from your local machine:
   ```bash
   ssh -i minecraft-deploy-key deploy@your-server-ip
   ```

---

## Advanced Configuration

### Customizing Server Properties

Edit `server.properties` in the repository and push changes. Common settings:

```properties
# Server description
motd=Welcome to My Minecraft Server!

# Maximum players
max-players=20

# Difficulty (peaceful, easy, normal, hard)
difficulty=normal

# Game mode (survival, creative, adventure)
gamemode=survival

# Enable/disable PvP
pvp=true

# View distance (higher = more resource intensive)
view-distance=10

# Enable whitelist
white-list=false
```

After changing, commit and push to automatically deploy:

```bash
git add server.properties
git commit -m "Update server configuration"
git push
```

### Managing Operators

SSH into your server and run:

```bash
# Add an operator
screen -r minecraft  # If running in screen
# Or send command via RCON or console

# Alternative: Edit ops.json directly
nano /home/deploy/minecraft-server/ops.json
```

### Updating Minecraft Version

1. Find the download URL for the new version from [Minecraft Version Manifest](https://launchermeta.mojang.com/mc/game/version_manifest.json) or the [official download page](https://www.minecraft.net/en-us/download/server)
2. Update `config.sh` with the new version and JAR URL:
   ```bash
   MINECRAFT_VERSION="1.21.0"
   MINECRAFT_JAR_URL="https://piston-data.mojang.com/v1/objects/NEW_HASH_HERE/server.jar"
   ```
3. Commit and push the changes:
   ```bash
   git add config.sh
   git commit -m "Update Minecraft to version 1.21.0"
   git push
   ```
4. The GitHub Actions workflow will automatically deploy the new configuration
5. SSH into server and remove old JAR to trigger download:
   ```bash
   ssh deploy@your-server-ip
   rm /home/deploy/minecraft-server/server.jar
   sudo systemctl restart minecraft.service
   ```

Alternatively, use the update script for interactive updates:
```bash
ssh deploy@your-server-ip
/home/deploy/minecraft-server/update.sh
```

### Backups

Create a backup script:

```bash
nano /home/deploy/backup-minecraft.sh
```

Add:

```bash
#!/bin/bash
BACKUP_DIR="/home/deploy/minecraft-backups"
SERVER_DIR="/home/deploy/minecraft-server"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/minecraft-backup-$DATE.tar.gz -C $SERVER_DIR world world_nether world_the_end

# Keep only last 7 backups
cd $BACKUP_DIR
ls -t minecraft-backup-*.tar.gz | tail -n +8 | xargs -r rm
```

Make executable and add to cron:

```bash
chmod +x /home/deploy/backup-minecraft.sh
crontab -e
```

Add this line to run daily at 3 AM:

```
0 3 * * * /home/deploy/backup-minecraft.sh
```

### Performance Tuning

For better performance, adjust JVM flags in `minecraft.service`:

```
ExecStart=/usr/bin/java -Xms4G -Xmx4G -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1HeapRegionSize=8M -XX:G1ReservePercent=20 -XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 -XX:InitiatingHeapOccupancyPercent=15 -XX:G1MixedGCLiveThresholdPercent=90 -XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 -XX:+PerfDisableSharedMem -XX:MaxTenuringThreshold=1 -Dusing.aikars.flags=https://mcflags.emc.gs -Daikars.new.flags=true -jar server.jar nogui
```

### Monitoring

Install htop for system monitoring:

```bash
sudo apt install htop
htop
```

Check Minecraft-specific resource usage:

```bash
ps aux | grep java
```

---

## Security Best Practices

1. **Keep Java Updated:**
   ```bash
   sudo apt update && sudo apt upgrade openjdk-17-jre-headless
   ```

2. **Use Whitelist Mode:**
   In `server.properties`, set:
   ```properties
   white-list=true
   ```
   Then add players via console or ops.json

3. **Regular Backups:**
   Set up the backup cron job as described above

4. **Monitor Logs:**
   Regularly check logs for suspicious activity:
   ```bash
   sudo journalctl -u minecraft.service | grep -i "error\|warning"
   ```

5. **Limit SSH Access:**
   Use SSH keys only, disable password authentication:
   ```bash
   sudo nano /etc/ssh/sshd_config
   ```
   Set:
   ```
   PasswordAuthentication no
   ```

---

## Quick Reference

### Common Commands

| Task | Command |
|------|---------|
| Start server | `sudo systemctl start minecraft.service` |
| Stop server | `sudo systemctl stop minecraft.service` |
| Restart server | `sudo systemctl restart minecraft.service` |
| View status | `sudo systemctl status minecraft.service` |
| View logs | `sudo journalctl -u minecraft.service -f` |
| Manual start | `cd /home/deploy/minecraft-server && ./start.sh` |

### Important File Locations

| File/Directory | Purpose |
|---------------|---------|
| `/home/deploy/minecraft-server/` | Server directory |
| `/home/deploy/minecraft-server/server.properties` | Server configuration |
| `/home/deploy/minecraft-server/world/` | World data |
| `/etc/systemd/system/minecraft.service` | Systemd service file |
| `/home/deploy/minecraft-server/logs/` | Server logs |

---

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review GitHub Actions logs for deployment issues
3. Check server logs: `sudo journalctl -u minecraft.service -n 100`
4. Consult [Minecraft Server documentation](https://minecraft.fandom.com/wiki/Server)

---

## License

This deployment setup is provided as-is. Minecraft is owned by Mojang Studios. Please review and accept the [Minecraft EULA](https://account.mojang.com/documents/minecraft_eula) before running a server.
