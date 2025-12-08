# festas_builds Community Minecraft Server

Welcome to the **festas_builds community server** - a scalable, well-moderated Minecraft community built on high-performance Paper server software.

This repository provides everything needed to deploy and manage the festas_builds Minecraft server using Docker containers with automated deployments via GitHub Actions.

---

## 🎯 About This Server

The festas_builds server is growing from a friends-only server to a **full community server** for the festas_builds audience. We're building a thriving Minecraft community with professional features, strong anti-grief protection, and engaging events.

**Current Phase:** Foundation → Community Features  
**Server Software:** Paper (high-performance Spigot fork)  
**Target:** 50-100 concurrent players

📋 **[View Full Roadmap →](ROADMAP.md)**

---

## 🎮 Cross-Platform Play

This server supports both **Java Edition** and **Bedrock Edition** players!

| Edition | Address | Port | Protocol |
|---------|---------|------|----------|
| Java | your-server-ip | 25565 | TCP |
| Bedrock | your-server-ip | 19132 | UDP |

Bedrock players on mobile, console, and Windows 10/11 can play together with Java players thanks to [Geyser](https://geysermc.org/).

See [BEDROCK-SETUP.md](BEDROCK-SETUP.md) for detailed setup instructions.

---

## ✨ Server Features

This is a fully-featured community server with:

- 🌐 **Live Web Map** - Explore the world in your browser with BlueMap
- 🏆 **Build Competitions** - Weekly themed building contests with PlotSquared
- 🎭 **Cosmetics** - Unlock particles, hats, and more through gameplay
- 📢 **Welcome System** - Interactive tutorial for new players
- 🎬 **Creator Tools** - Filming and recording capabilities for content creators
- 🛡️ **Land Protection** - GriefPrevention, WorldGuard, and CoreProtect
- 🌍 **Cross-Platform** - Bedrock Edition support via Geyser
- 💬 **Discord Integration** - Chat bridge and announcements

See [FEATURES.md](FEATURES.md) for complete details.

## 💻 Web Console

Manage your server with a powerful web-based console featuring:

- 🔐 **Secure Authentication** - Session-based login with bcrypt encryption
- 📊 **Real-time Dashboard** - Live stats, player count, TPS, memory/CPU
- 💬 **Live Console** - Execute commands with RCON, view logs via WebSocket
- 👥 **Player Management** - Kick, ban, OP, teleport, change gamemodes
- ⚡ **Quick Actions** - Start, stop, restart, save, backup with one click
- 📦 **Backup Management** - Create and manage server backups
- 🎨 **Minecraft Theme** - Dark mode with blocky Minecraft-inspired design
- 📱 **Responsive** - Works on desktop, tablet, and mobile

**Quick Setup:**
```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your settings

# 2. Start console
docker compose -f docker-compose.console.yml up -d

# 3. Access at http://your-server:3001/console
```

See **[CONSOLE-SETUP.md](CONSOLE-SETUP.md)** for detailed setup with SSL/HTTPS.

## 📋 Technical Features

- ✅ **Docker Containerization** - Runs in isolated containers using `itzg/minecraft-server:java21`
- ✅ **Paper Server** - High-performance Spigot fork with plugin support
- ✅ **Optimized Performance** - Aikar's JVM flags built into container
- ✅ **Automated Deployment** - GitHub Actions workflows for continuous deployment
- ✅ **Easy Configuration** - Environment variables in docker-compose.yml
- ✅ **Built-in Health Checks** - Container includes mc-health monitoring
- ✅ **Volume Management** - Persistent data with Docker volumes
- ✅ **Comprehensive Documentation** - Full guides for setup and management

## 📚 Documentation

### Server Management

- **[SERVER-MANAGEMENT.md](SERVER-MANAGEMENT.md)** - **Complete server management guide** ⭐
  - [Configuration via GitHub Secrets](SERVER-MANAGEMENT.md#github-secrets-configuration)
  - [Deployment Workflows](SERVER-MANAGEMENT.md#deployment-workflows)
  - [Automated Backups](SERVER-MANAGEMENT.md#backup-and-restore)
  - [Plugin Management](SERVER-MANAGEMENT.md#plugin-management)
  - [Player Management](SERVER-MANAGEMENT.md#player-management)
  - [Troubleshooting](SERVER-MANAGEMENT.md#troubleshooting)

### Setup Guides

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Initial deployment and server setup
- **[CONSOLE-SETUP.md](CONSOLE-SETUP.md)** - Web console setup and management guide
- **[PLUGINS.md](PLUGINS.md)** - Comprehensive plugin guide with installation instructions
- **[PLUGIN-MANAGER.md](PLUGIN-MANAGER.md)** - Web-based plugin manager with diagnostics ⭐
- **[BEDROCK-SETUP.md](BEDROCK-SETUP.md)** - Cross-platform play setup guide (Geyser + Floodgate)
- **[WEBSITE.md](WEBSITE.md)** - Website deployment and customization guide
- **[server-icon-instructions.md](server-icon-instructions.md)** - Custom server icon setup

### Troubleshooting & Diagnostics

- **[docs/DIAGNOSTICS-GUIDE.md](docs/DIAGNOSTICS-GUIDE.md)** - Comprehensive diagnostics overview ⭐
  - Decision tree for choosing the right diagnostic tool
  - Integration between different diagnostic systems
  - Common diagnostic patterns and solutions

- **⭐ NEW: [.github/workflows/comprehensive-plugin-manager-diagnostics.yml](.github/workflows/comprehensive-plugin-manager-diagnostics.yml)** - **All-in-one diagnostics**
  - Combines browser, backend, API, and resource monitoring
  - Toggleable components for targeted testing
  - Master summary with rapid triage guide
  - Complete production health checks
  - **Recommended starting point for troubleshooting**

- **[docs/BROWSER-DIAGNOSTICS.md](docs/BROWSER-DIAGNOSTICS.md)** - Frontend & API diagnostics
  - Browser automation with Puppeteer
  - JavaScript error and performance tracking
  - API profiling and timing analysis
  - Resource monitoring during page load
  - GitHub Actions workflow: `.github/workflows/browser-diagnostics.yml`

- **[docs/PLUGIN-INSTALL-DIAGNOSTICS.md](docs/PLUGIN-INSTALL-DIAGNOSTICS.md)** - Plugin installation testing
  - Comprehensive backend plugin install flow testing
  - CSRF, session, and permission validation
  - GitHub Actions workflow: `.github/workflows/plugin-install-diagnose.yml`

- **[PLUGIN-MANAGER.md#diagnostic-tools](PLUGIN-MANAGER.md#diagnostic-tools)** - Plugin manager diagnostics
  - Basic diagnostics: `./scripts/diagnose-plugins.sh diagnose`
  - Auto-fix mode: `./scripts/diagnose-plugins.sh fix`
  - Advanced diagnostics: `./scripts/diagnose-plugins-advanced.sh`
  - GitHub Actions workflow: `.github/workflows/plugins-manager-diagnose.yml`

- **[scripts/README.md](scripts/README.md)** - Diagnostic scripts reference
  - Browser diagnostics: `scripts/browser-diagnostics.js`
  - API profiling: `scripts/api-profiler.sh`
  - Resource monitoring: `scripts/resource-monitor.sh`

### Planning & Features

- **[ROADMAP.md](ROADMAP.md)** - Server growth roadmap and future plans

---

## 🌐 Server Website

The server has a modern website at **[mc.festas-builds.com](https://mc.festas-builds.com)** featuring:

- 🎮 Server information and connection details
- ✨ Feature highlights and plugin showcase
- 📖 How-to-join instructions for Java and Bedrock Edition
- 📜 Server rules
- 🗺️ Links to BlueMap and Discord

The website is automatically deployed via GitHub Actions when changes are pushed to the `website/` directory.

See **[WEBSITE.md](WEBSITE.md)** for deployment instructions and customization guide.

---

---

## 🐳 Quick Start with Docker

Get your server running in minutes:

```bash
# 1. Clone the repository
git clone https://github.com/Festas/Minecraft-Server.git
cd Minecraft-Server

# 2. Configure environment (optional - has defaults)
cp .env.example .env
# Edit .env with your RCON password and other settings

# 3. Create external network for services
docker network create caddy-network

# 4. Start the Minecraft server
docker compose up -d

# 5. View logs
docker compose logs -f minecraft-server
```

The server will be available at `your-server-ip:25565` once started.

For production deployment with automated GitHub Actions, see [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 🎮 Plugin Management

## 🎮 Plugin Management

The server uses the `itzg/minecraft-server` container which supports multiple plugin installation methods:

### Method 1: Auto-Download from URLs (Recommended)

Set environment variables in `docker-compose.yml`:

```yaml
environment:
  PLUGINS: |
    https://github.com/LuckPerms/LuckPerms/releases/download/v5.4.102/LuckPerms-Bukkit-5.4.102.jar
    https://github.com/EssentialsX/Essentials/releases/download/2.20.1/EssentialsX-2.20.1.jar
```

### Method 2: Manual Installation

Copy plugin JARs to the data volume:

```bash
# Copy a plugin to the server
docker cp MyPlugin.jar minecraft-server:/data/plugins/

# Restart to load the plugin
docker compose restart minecraft-server
```

### Method 3: Using Modrinth/CurseForge

```yaml
environment:
  MODRINTH_PROJECTS: "luckperms,essentialsx,coreprotect"
  MODRINTH_DOWNLOAD_DEPENDENCIES: "required"
```

**For complete plugin documentation**, see [PLUGINS.md](PLUGINS.md) - includes:
- Recommended plugins list
- Configuration guides
- Troubleshooting tips

---

## 🛠️ What's Included

- **Docker Configuration**
  - `docker-compose.yml` - Main Minecraft server container setup
  - `docker-compose.console.yml` - Web console container reference
  - `docker-compose.web.yml` - Website container reference
  - `.env.example` - Environment variable template
  
- **Plugin Management**
  - `plugins.json` - Plugin definitions (reference)
  - `plugins/` - Plugin configuration files
  - `config/` - Plugin configs
  
- **Web Console**
  - `console/` - Full-featured web management interface
  
- **Website**
  - `website/` - Static server website
  
- **Automation**
  - `.github/workflows/deploy-minecraft.yml` - Server deployment workflow
  - `.github/workflows/backup-minecraft.yml` - Automated backup workflow (daily at 4 AM UTC)
  - `.github/workflows/deploy-console.yml` - Console deployment workflow
  - `.github/workflows/deploy-website.yml` - Website deployment workflow
  
- **Documentation**
  - Complete guides for deployment, plugins, and features
  - Setup instructions for console, website, and Bedrock Edition

---

## 🎯 Quick Deployment Overview

### Required GitHub Secrets

Before deploying, configure these secrets in your GitHub repository (Settings → Secrets and variables → Actions):

#### Core Server Secrets (Required)

| Secret | Description |
|--------|-------------|
| `SERVER_HOST` | Your server's IP address |
| `SERVER_USER` | SSH username (e.g., `deploy`) |
| `SSH_PRIVATE_KEY` | Private SSH key for authentication |
| `RCON_PASSWORD` | Password for server console access |

#### Console Secrets (Required for Web Console)

| Secret | Description |
|--------|-------------|
| `CONSOLE_ADMIN_USER` | Console login username |
| `CONSOLE_ADMIN_PASSWORD` | Console login password |
| `SESSION_SECRET` | Random string for session encryption (32+ chars) |
| `CSRF_SECRET` | Random string for CSRF protection (32+ chars) |
| `REDIS_HOST` | Redis server hostname (e.g., 'redis' for Docker) |
| `REDIS_PORT` | Redis server port (typically 6379) |

**Optional secrets** for customization: `MINECRAFT_VERSION`, `WORLD_SEED`, `OP_OWNER`, `WHITELIST_ENABLED`, and more.  
See **[SERVER-MANAGEMENT.md](SERVER-MANAGEMENT.md#github-secrets-configuration)** for all options.

### Deployment Steps

1. **Prepare your server** - Install Docker and Docker Compose
2. **Setup GitHub secrets** - Add the 4 required secrets above
3. **Configure environment** - Set RCON password and other variables in docker-compose.yml
4. **Deploy** - Push to main branch or trigger `deploy-minecraft.yml` workflow manually
5. **Verify** - Check container health and logs
6. **Install plugins** - Use container's built-in plugin support or manual installation
7. **Play!** - Connect with your Minecraft client

See [DEPLOYMENT.md](DEPLOYMENT.md) for the complete step-by-step guide.

---

## 📊 Server Requirements

- **OS**: Any Linux distribution with Docker support (Ubuntu 20.04+, Debian 11+ recommended)
- **RAM**: Minimum 4GB (6GB+ recommended for plugins and Bedrock support)
- **Disk**: At least 10GB free space
- **Docker**: Docker Engine 20.10+ and Docker Compose v2+
- **Network**: Ports 25565 (TCP/UDP) for Java Edition
- **Network (Bedrock)**: Port 19132 (UDP) for Bedrock Edition cross-play

## 🔧 Configuration

### Server Properties

Edit environment variables in `docker-compose.yml`:

```yaml
environment:
  VERSION: "1.20.4"              # Minecraft version
  MEMORY: "4G"                   # RAM allocation
  MOTD: "My Server"              # Server description
  MAX_PLAYERS: 20                # Maximum players
  DIFFICULTY: "normal"           # Difficulty level
  MODE: "survival"               # Game mode
  PVP: "true"                    # Enable PvP
  VIEW_DISTANCE: 10              # Render distance
```

After editing, redeploy:

```bash
docker compose up -d
```

Or push changes to trigger GitHub Actions deployment.

---

## 📝 Server Management

### Using Docker Compose

```bash
# Start server
docker compose up -d

# Stop server
docker compose down

# Restart server
docker compose restart minecraft-server

# View logs
docker compose logs -f minecraft-server

# Execute console commands
docker exec -i minecraft-server rcon-cli

# Access container shell
docker exec -it minecraft-server bash
```

### Using the Web Console

Access the web console at `http://your-server:3001/console` for:
- Real-time server monitoring
- Execute commands via RCON
- Player management
- Server start/stop/restart
- Backup management

See [CONSOLE-SETUP.md](CONSOLE-SETUP.md) for setup instructions.

## 🔄 Automated Deployment

The repository includes GitHub Actions workflows for automated deployment:

- **deploy-minecraft.yml** - Deploys the Minecraft server container
- **deploy-console.yml** - Deploys the web console
- **deploy-website.yml** - Deploys the server website

Every push to the `main` branch or manual workflow trigger will:
1. Connect to your server via SSH
2. Pull the latest configuration
3. Update the Docker containers
4. Restart services with zero downtime

You can manually trigger deployments from the GitHub Actions tab.

---

## 💾 Backups

### Using Docker Volumes

Backup the Minecraft data volume:

```bash
# Create backup directory
mkdir -p ~/minecraft-backups

# Backup the volume
docker run --rm \
  -v minecraft_data:/data \
  -v ~/minecraft-backups:/backup \
  alpine tar czf /backup/minecraft-backup-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .

# List backups
ls -lh ~/minecraft-backups/
```

### Automated Backups with Cron

```bash
# Create backup script
cat > ~/backup-minecraft.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="$HOME/minecraft-backups"
mkdir -p "$BACKUP_DIR"
docker run --rm \
  -v minecraft_data:/data \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf /backup/minecraft-backup-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .
# Keep only last 7 backups
cd "$BACKUP_DIR" && ls -t minecraft-backup-*.tar.gz | tail -n +8 | xargs -r rm
EOF

chmod +x ~/backup-minecraft.sh

# Add to crontab (daily at 3 AM)
(crontab -l 2>/dev/null; echo "0 3 * * * $HOME/backup-minecraft.sh") | crontab -
```

### Restore from Backup

```bash
# Stop the server
docker compose down

# Restore the backup
docker run --rm \
  -v minecraft_data:/data \
  -v ~/minecraft-backups:/backup \
  alpine sh -c "cd /data && tar xzf /backup/minecraft-backup-YYYYMMDD-HHMMSS.tar.gz"

# Start the server
docker compose up -d
```

## 🔄 Updating Minecraft Version

Edit `docker-compose.yml` and change the VERSION:

```yaml
environment:
  VERSION: "1.21.0"  # Update to new version
```

Then redeploy:

```bash
# Pull new server version
docker compose pull

# Restart with new version (backs up old world automatically)
docker compose up -d

# Monitor startup
docker compose logs -f minecraft-server
```

**Note:** The container automatically backs up the world before major updates!

---

## 🎮 Why Paper?

This server uses **Paper** instead of Vanilla Minecraft for:

- ✅ **Better Performance** - Handles more players with less lag
- ✅ **Plugin Support** - Add features without modding clients
- ✅ **Exploit Protection** - Built-in protection against common exploits
- ✅ **Better Configuration** - More options to customize gameplay
- ✅ **Active Development** - Regular updates and improvements
- ✅ **Aikar's Flags** - Optimized JVM garbage collection

Paper is fully compatible with Vanilla clients - players don't need to install anything!

Learn more: https://papermc.io/

---

## 🎯 Community Server Goals

The festas_builds server is evolving in phases:

**Phase 1: Foundation** ✅
- Switch to Paper server
- Core plugins (LuckPerms, EssentialsX, CoreProtect, WorldGuard)
- Protected spawn area
- Permission system

**Phase 2: Community Features** 🚧
- Discord integration (DiscordSRV)
- Economy system
- Land claims for players
- Regular community events

**Phase 3: Scale & Polish** 📅
- Web-based live map (BlueMap)
- Server website
- Voting integration
- 50-100 concurrent players

See [ROADMAP.md](ROADMAP.md) for the complete growth plan.

---

## 🐛 Troubleshooting

See the [Troubleshooting section](DEPLOYMENT.md#troubleshooting) in DEPLOYMENT.md for common issues and solutions.

**Quick checks:**
- Verify Docker is running: `docker ps`
- Check container status: `docker compose ps`
- View container logs: `docker compose logs minecraft-server`
- Check port availability: `netstat -tulpn | grep 25565`
- Verify network connectivity: `docker network ls`

## 📚 Additional Resources

- [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment guide
- [PLUGINS.md](PLUGINS.md) - Recommended plugins and setup
- [ROADMAP.md](ROADMAP.md) - Server growth roadmap
- [server-icon-instructions.md](server-icon-instructions.md) - Custom branding
- [Paper Documentation](https://docs.papermc.io/)
- [Minecraft Server Wiki](https://minecraft.fandom.com/wiki/Server)
- [Minecraft EULA](https://account.mojang.com/documents/minecraft_eula)

---

## ⚖️ License

This deployment setup is provided as-is. Minecraft is owned by Mojang Studios. You must accept the [Minecraft EULA](https://account.mojang.com/documents/minecraft_eula) to run a Minecraft server.

## 🤝 Contributing

Feel free to submit issues or pull requests to improve the deployment setup!

---

**Ready to get started?** Head over to [DEPLOYMENT.md](DEPLOYMENT.md) for the complete step-by-step guide!

---

## 🎨 Branding

This server represents the **festas_builds** community. For branding consistency:
- Use the festas_builds logo for the server icon
- Keep the branded MOTD in `server.properties`
- Follow brand colors in spawn builds and announcements
- Link to festas_builds social media in Discord and website

---

*Built with ❤️ for the festas_builds community*