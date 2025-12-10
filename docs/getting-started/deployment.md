← [Back to Getting Started](./README.md) | [Documentation Home](../README.md)

---

# Deployment Guide (Docker) 📦

<!-- Last Updated: 2025-12-10 -->

This guide will walk you through deploying a containerized Minecraft server using Docker with automated GitHub Actions deployment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Server Setup](#initial-server-setup)
3. [GitHub Repository Setup](#github-repository-setup)
4. [Docker Deployment](#docker-deployment)
5. [Server Management](#server-management)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Configuration](#advanced-configuration)

---

## Prerequisites

Before starting, ensure you have:

- A Linux server (Hetzner, DigitalOcean, AWS, or any VPS) with:
  - Ubuntu 20.04+ or Debian 11+ (recommended)
  - At least 4GB RAM (6GB+ recommended for plugins)
  - At least 10GB free disk space
  - Root or sudo access
- SSH access to your server
- A GitHub account with this repository forked/cloned

---

## Initial Server Setup

### 1. Install Docker on Your Server

SSH into your server and install Docker:

```bash
# SSH into your server
ssh your-user@your-server-ip

# Update package list
sudo apt update

# Install prerequisites
sudo apt install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify Docker installation
docker --version
docker compose version
```

### 2. Configure Docker Permissions

Add your user to the docker group:

```bash
# Add current user to docker group
sudo usermod -aG docker $USER

# Apply group changes (or logout/login)
newgrp docker

# Verify you can run docker without sudo
docker ps
```

### 3. Configure Firewall

Open the required ports for Minecraft:

```bash
# If using UFW (Ubuntu Firewall)
# Java Edition port
sudo ufw allow 25565/tcp comment "Minecraft Java"
sudo ufw allow 25565/udp comment "Minecraft Java"

# Bedrock Edition port (for cross-platform play with Geyser)
sudo ufw allow 19132/udp comment "Minecraft Bedrock"

# Optional: Web console port (if not using reverse proxy)
sudo ufw allow 3001/tcp comment "Minecraft Console"

# Reload firewall
sudo ufw reload

# Verify
sudo ufw status
```

**For Bedrock Edition support**, port 19132 UDP is required. See [bedrock-setup.md](./bedrock-setup.md) for details.

**Alternative firewall configurations:**

```bash
# If using firewalld (CentOS/RHEL/Fedora)
sudo firewall-cmd --permanent --add-port=25565/tcp
sudo firewall-cmd --permanent --add-port=25565/udp
sudo firewall-cmd --permanent --add-port=19132/udp
sudo firewall-cmd --reload

# If using iptables
sudo iptables -A INPUT -p tcp --dport 25565 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 25565 -j ACCEPT
sudo iptables -A INPUT -p udp --dport 19132 -j ACCEPT
sudo iptables-save | sudo tee /etc/iptables/rules.v4
```

**Cloud Provider Firewalls:**

Don't forget to configure your cloud provider's firewall:
- **Hetzner Cloud**: Cloud Console → Firewalls → Add rules
- **AWS**: Security Groups → Inbound rules
- **DigitalOcean**: Networking → Firewalls → Add rules

Required rules:
- Port 25565 TCP (Java Edition)
- Port 25565 UDP (Java Edition)
- Port 19132 UDP (Bedrock Edition)

### 4. Create Docker Network

Create an external network for service communication:

```bash
# Create network for Caddy/reverse proxy integration
docker network create caddy-network
```

### 5. Create Server Directory

```bash
# Create the deployment directory
mkdir -p ~/minecraft-deployment
cd ~/minecraft-deployment
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

### 2. Add Public Key to Server

Copy the public key to your server:

```bash
# Copy the public key content
cat minecraft-deploy-key.pub

# SSH into your server
ssh your-user@your-server-ip

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
| `SERVER_USER` | Your server username | e.g., `deploy` or `ubuntu` |
| `GHCR_PAT` | GitHub Personal Access Token | For pulling container images (optional) |

To get the private key content:

```bash
cat minecraft-deploy-key
```

Copy the entire output (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`).

**Creating a GitHub PAT (optional):**
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token
3. Select scopes: `read:packages`
4. Copy the token and add as `GHCR_PAT` secret

---

## Docker Deployment

### 1. Local Testing (Optional)

Test the setup locally before deploying:

```bash
# Clone the repository
git clone https://github.com/Festas/Minecraft-Server.git
cd Minecraft-Server

# Configure environment
cp .env.example .env
nano .env  # Edit RCON password and other settings

# Create network
docker network create caddy-network

# Start the server
docker compose up -d

# View logs
docker compose logs -f minecraft-server

# Stop when done testing
docker compose down
```

### 2. Configure Environment Variables

Edit `docker-compose.yml` or create `.env` file with your settings:

```yaml
# In docker-compose.yml, edit environment variables:
environment:
  EULA: "TRUE"                    # Accept Minecraft EULA
  TYPE: "PAPER"                   # Server type (PAPER, SPIGOT, VANILLA)
  VERSION: "1.20.4"               # Minecraft version
  MEMORY: "4G"                    # RAM allocation
  USE_AIKAR_FLAGS: "true"         # Use optimized JVM flags
  ENABLE_RCON: "true"             # Enable RCON for console
  RCON_PASSWORD: "your-password"  # CHANGE THIS!
  MOTD: "Your Server Name"        # Server description
  MAX_PLAYERS: 20                 # Maximum players
```

Or use `.env` file:

```env
RCON_PASSWORD=your-secure-password-here
MINECRAFT_VERSION=1.20.4
MEMORY=4G
```

### 3. Deploy via GitHub Actions

#### Manual Deployment

1. Go to **Actions** tab in GitHub
2. Select **Deploy Minecraft Server** workflow
3. Click **Run workflow**
4. Select the `main` branch
5. Click **Run workflow**

#### Automatic Deployment

Push changes to trigger automatic deployment:

```bash
# Make changes to docker-compose.yml or other files
git add .
git commit -m "Update server configuration"
git push origin main
```

The `deploy-minecraft.yml` workflow will:
1. Connect to your server via SSH
2. Pull latest repository changes
3. Pull/update Docker images
4. Restart containers with new configuration
5. Verify deployment

### 4. Verify Deployment

SSH into your server and check the deployment:

```bash
ssh your-user@your-server-ip
cd ~/minecraft-deployment

# Check running containers
docker compose ps

# View logs
docker compose logs -f minecraft-server

# Check container health
docker ps
```

You should see the server starting up and generating the world (first run takes a few minutes).

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

### Using Docker Compose

```bash
# Start server
docker compose up -d

# Stop server
docker compose down

# Restart server
docker compose restart minecraft-server

# View logs (live)
docker compose logs -f minecraft-server

# View recent logs
docker compose logs --tail=100 minecraft-server

# Update to latest image
docker compose pull
docker compose up -d

# Execute console commands
docker exec -i minecraft-server rcon-cli
# Then type commands like: list, op username, etc.

# Access container shell
docker exec -it minecraft-server bash
```

### Using RCON (Remote Console)

```bash
# Install rcon-cli (if not already in container)
docker exec -i minecraft-server rcon-cli

# Execute single command
docker exec -i minecraft-server rcon-cli list

# Interactive mode
docker exec -it minecraft-server rcon-cli
> list
> op PlayerName
> save-all
> exit
```

### Using the Web Console

Access the web console at `http://your-server:3001/console` for:
- Real-time server monitoring
- Execute commands via GUI
- Player management
- Server start/stop/restart
- Backup management
- Log viewing with WebSocket

See [CONSOLE-SETUP.md](CONSOLE-SETUP.md) for setup instructions.

### Viewing Server Files

```bash
# Access the data volume
docker exec -it minecraft-server bash
cd /data

# Or view from host using volume mounts
docker volume inspect minecraft_data
# Note the Mountpoint path
sudo ls -la /var/lib/docker/volumes/minecraft_data/_data/
```

---

## Troubleshooting

### Server Won't Start

1. **Check container status:**
   ```bash
   docker compose ps
   docker compose logs minecraft-server
   ```

2. **Check if port is already in use:**
   ```bash
   sudo netstat -tulpn | grep 25565
   # or
   sudo ss -tulpn | grep 25565
   ```

3. **Verify Docker network:**
   ```bash
   docker network ls
   docker network inspect caddy-network
   ```

4. **Check resource usage:**
   ```bash
   docker stats minecraft-server
   ```

5. **Inspect container details:**
   ```bash
   docker inspect minecraft-server
   ```

### Connection Issues

1. **Verify firewall:**
   ```bash
   sudo ufw status
   # or
   sudo iptables -L -n
   ```

2. **Check if server is listening:**
   ```bash
   sudo netstat -tulpn | grep 25565
   ```

3. **Test from server locally:**
   ```bash
   telnet localhost 25565
   # or
   nc -zv localhost 25565
   ```

4. **Check container networking:**
   ```bash
   docker exec minecraft-server netstat -tulpn
   ```

### Out of Memory

If the server crashes with OutOfMemoryError:

1. Edit `docker-compose.yml` and increase MEMORY:
   ```yaml
   environment:
     MEMORY: "6G"  # Increase from 4G
   ```

2. Restart the container:
   ```bash
   docker compose up -d
   ```

3. Monitor memory usage:
   ```bash
   docker stats minecraft-server
   ```

### Deployment Fails

1. **Check GitHub Actions logs** in the Actions tab
2. **Verify SSH key** is correctly added to server:
   ```bash
   ssh -i minecraft-deploy-key your-user@your-server-ip
   ```
3. **Check server disk space:**
   ```bash
   df -h
   ```
4. **Verify Docker is running:**
   ```bash
   sudo systemctl status docker
   ```

### Container Keeps Restarting

1. **Check logs for errors:**
   ```bash
   docker compose logs minecraft-server
   ```

2. **Check health status:**
   ```bash
   docker inspect minecraft-server | grep -A 10 Health
   ```

3. **Disable health check temporarily:**
   ```yaml
   # In docker-compose.yml, comment out healthcheck section
   # healthcheck:
   #   test: mc-health
   ```

4. **Check EULA acceptance:**
   ```bash
   docker compose logs minecraft-server | grep -i eula
   ```
   Ensure `EULA: "TRUE"` is set in docker-compose.yml

---

## Advanced Configuration

### Customizing Server Properties

Most settings are controlled via environment variables in `docker-compose.yml`:

```yaml
environment:
  # Core Settings
  VERSION: "1.20.4"
  MEMORY: "4G"
  
  # Server Properties
  MOTD: "§6§lMy Server §r§7- Play now!"
  MAX_PLAYERS: 50
  DIFFICULTY: "hard"
  MODE: "survival"
  PVP: "true"
  VIEW_DISTANCE: 12
  SIMULATION_DISTANCE: 10
  
  # World Settings
  LEVEL: "world"
  SEED: ""
  LEVEL_TYPE: "minecraft:normal"
  GENERATE_STRUCTURES: "true"
  
  # Network Settings
  ENABLE_RCON: "true"
  RCON_PASSWORD: "your-password"
  RCON_PORT: 25575
  
  # Performance
  USE_AIKAR_FLAGS: "true"
  JVM_OPTS: "-XX:+UseG1GC -XX:MaxGCPauseMillis=200"
```

See the [itzg/minecraft-server documentation](https://github.com/itzg/docker-minecraft-server) for all available options.

### Installing Plugins

#### Method 1: Environment Variable (Auto-download)

```yaml
environment:
  PLUGINS: |
    https://github.com/LuckPerms/LuckPerms/releases/download/v5.4.102/LuckPerms-Bukkit-5.4.102.jar
    https://github.com/EssentialsX/Essentials/releases/download/2.20.1/EssentialsX-2.20.1.jar
```

#### Method 2: Modrinth/CurseForge

```yaml
environment:
  MODRINTH_PROJECTS: "luckperms,essentialsx,coreprotect,worldedit"
  MODRINTH_DOWNLOAD_DEPENDENCIES: "required"
  CURSEFORGE_FILES: "project1:fileId1,project2:fileId2"
```

#### Method 3: Volume Mount

```yaml
volumes:
  - minecraft_data:/data
  - ./plugins:/plugins:ro  # Mount local plugins folder
```

Then copy plugins:
```bash
cp MyPlugin.jar plugins/
docker compose restart minecraft-server
```

#### Method 4: Manual Copy

```bash
docker cp MyPlugin.jar minecraft-server:/data/plugins/
docker compose restart minecraft-server
```

### Updating Minecraft Version

1. Edit `docker-compose.yml`:
   ```yaml
   environment:
     VERSION: "1.21.0"  # Change version
   ```

2. Pull new image and restart:
   ```bash
   docker compose pull
   docker compose up -d
   ```

3. Monitor the update:
   ```bash
   docker compose logs -f minecraft-server
   ```

**Note:** The container automatically backs up the world before major updates!

### Backups

#### Manual Backup

```bash
# Create backup directory
mkdir -p ~/minecraft-backups

# Backup the volume
docker run --rm \
  -v minecraft_data:/data \
  -v ~/minecraft-backups:/backup \
  alpine tar czf /backup/minecraft-backup-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .
```

#### Automated Backups

Create a backup script:

```bash
cat > ~/backup-minecraft.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="$HOME/minecraft-backups"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"

# Create backup
docker run --rm \
  -v minecraft_data:/data \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf /backup/minecraft-backup-$DATE.tar.gz -C /data .

echo "Backup created: minecraft-backup-$DATE.tar.gz"

# Keep only last 7 backups
cd "$BACKUP_DIR"
ls -t minecraft-backup-*.tar.gz | tail -n +8 | xargs -r rm

echo "Old backups cleaned up"
EOF

chmod +x ~/backup-minecraft.sh
```

Add to crontab (daily at 3 AM):

```bash
crontab -e
# Add:
0 3 * * * $HOME/backup-minecraft.sh >> $HOME/backup.log 2>&1
```

#### Restore from Backup

```bash
# Stop the server
docker compose down

# Restore
docker run --rm \
  -v minecraft_data:/data \
  -v ~/minecraft-backups:/backup \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/minecraft-backup-YYYYMMDD-HHMMSS.tar.gz -C /data"

# Start the server
docker compose up -d
```

### Performance Tuning

#### Increase Memory

```yaml
environment:
  MEMORY: "8G"  # Increase RAM
  USE_AIKAR_FLAGS: "true"
```

#### Custom JVM Flags

```yaml
environment:
  JVM_OPTS: "-XX:+UseG1GC -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions"
```

#### CPU Limits

```yaml
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 8G
    reservations:
      cpus: '2'
      memory: 4G
```

### Monitoring

#### Resource Usage

```bash
# Real-time stats
docker stats minecraft-server

# Container processes
docker top minecraft-server

# Disk usage
docker system df
docker volume ls
```

#### Log Monitoring

```bash
# Follow logs
docker compose logs -f minecraft-server

# Search logs
docker compose logs minecraft-server | grep -i "error\|warn"

# Export logs
docker compose logs minecraft-server > server-logs.txt
```

---

## Manual Docker Commands (Reference)

If you prefer not to use docker-compose:

```bash
# Create network
docker network create caddy-network

# Create volume
docker volume create minecraft_data

# Run container
docker run -d \
  --name minecraft-server \
  --restart unless-stopped \
  -p 25565:25565 \
  -e EULA=TRUE \
  -e TYPE=PAPER \
  -e VERSION=1.20.4 \
  -e MEMORY=4G \
  -e ENABLE_RCON=true \
  -e RCON_PASSWORD=your-password \
  -v minecraft_data:/data \
  --network caddy-network \
  itzg/minecraft-server:java21

# Stop container
docker stop minecraft-server

# Start container
docker start minecraft-server

# Remove container
docker rm -f minecraft-server

# View logs
docker logs -f minecraft-server
```

---

## Security Best Practices

1. **Use Strong RCON Password:**
   ```yaml
   environment:
     RCON_PASSWORD: "use-a-strong-random-password-here"
   ```

2. **Keep Docker Updated:**
   ```bash
   sudo apt update && sudo apt upgrade docker-ce docker-ce-cli
   ```

3. **Use Whitelist Mode:**
   ```yaml
   environment:
     WHITELIST: "player1,player2,player3"
     ENFORCE_WHITELIST: "true"
   ```

4. **Regular Backups:**
   Set up automated backups as described above

5. **Monitor Logs:**
   ```bash
   docker compose logs minecraft-server | grep -i "warn\|error"
   ```

6. **Limit SSH Access:**
   ```bash
   # Use SSH keys only
   sudo nano /etc/ssh/sshd_config
   # Set: PasswordAuthentication no
   sudo systemctl restart sshd
   ```

7. **Use Firewall:**
   Only open necessary ports (25565, 19132)

---

## Quick Reference

### Common Commands

| Task | Command |
|------|---------|
| Start server | `docker compose up -d` |
| Stop server | `docker compose down` |
| Restart server | `docker compose restart minecraft-server` |
| View logs | `docker compose logs -f minecraft-server` |
| Execute command | `docker exec -i minecraft-server rcon-cli <command>` |
| Update server | `docker compose pull && docker compose up -d` |
| Backup | `docker run --rm -v minecraft_data:/data -v ~/backups:/backup alpine tar czf /backup/backup.tar.gz -C /data .` |

### Important Paths

| Location | Description |
|----------|-------------|
| `~/minecraft-deployment/` | Deployment directory |
| `docker-compose.yml` | Container configuration |
| `.env` | Environment variables |
| Volume: `minecraft_data` | Server data (worlds, plugins, configs) |
| `/data/` (in container) | Server root directory |

### GitHub Actions Workflows

| Workflow | Purpose | Trigger |
|----------|---------|---------|
| `deploy-minecraft.yml` | Deploy Minecraft server | Push to main, manual |
| `deploy-console.yml` | Deploy web console | Push to main, manual |
| `deploy-website.yml` | Deploy server website | Push to main, manual |
| `reset-console-password.yml` | Reset console password | Manual only |

---

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review container logs: `docker compose logs minecraft-server`
3. Check [itzg/minecraft-server documentation](https://github.com/itzg/docker-minecraft-server)
4. Review GitHub Actions logs for deployment issues
5. Consult [Docker documentation](https://docs.docker.com/)

---

## License

This deployment setup is provided as-is. Minecraft is owned by Mojang Studios. Please review and accept the [Minecraft EULA](https://account.mojang.com/documents/minecraft_eula) before running a server.

---

## Next Steps

- 🐳 [Docker Setup Alternative](./docker.md) - Simplified Docker deployment
- 🌐 [Bedrock Edition Setup](./bedrock-setup.md) - Enable cross-platform play
- ✅ [Launch Checklist](./launch-checklist.md) - Pre-launch validation
- 🎨 [Server Icon Setup](./server-icon.md) - Customize server branding

---

← [Back to Getting Started](./README.md) | [Documentation Home](../README.md)
