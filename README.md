# festas_builds Community Minecraft Server

Welcome to the **festas_builds community server** - a scalable, well-moderated Minecraft community built on high-performance Paper server software.

This repository provides everything needed to deploy and manage the festas_builds Minecraft server on Hetzner (or any Linux server) with automated deployments via GitHub Actions.

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

- ✅ **Paper Server** - High-performance Spigot fork with plugin support
- ✅ **Optimized Performance** - Aikar's JVM flags for better garbage collection
- ✅ **Auto Plugin Installation** - Automated system to download and install plugins
- ✅ Automated deployment via GitHub Actions
- ✅ Systemd service for automatic server management
- ✅ Easy configuration management
- ✅ Backup scripts included
- ✅ Update scripts for version upgrades
- ✅ Comprehensive documentation

## 📚 Documentation

- **[CONSOLE-SETUP.md](CONSOLE-SETUP.md)** - Web console setup and management guide
- **[PLUGINS.md](PLUGINS.md)** - Comprehensive plugin guide with installation instructions
- **[BEDROCK-SETUP.md](BEDROCK-SETUP.md)** - Cross-platform play setup guide (Geyser + Floodgate)
- **[WEBSITE.md](WEBSITE.md)** - Website deployment and customization guide
- **[ROADMAP.md](ROADMAP.md)** - Server growth roadmap and future plans
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete deployment guide
- **[server-icon-instructions.md](server-icon-instructions.md)** - Custom server icon setup

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

## 🎮 Plugin Auto-Installation

The server includes an automated plugin installation system that downloads and installs all recommended plugins with a single command:

```bash
# Install all enabled plugins
./install-plugins.sh

# Auto-discover and add plugins from wishlist
./install-plugins.sh --discover

# Update plugins to latest versions
./update-plugins.sh
```

### Quick Start

1. SSH to your server: `ssh deploy@your-server-ip`
2. Navigate to server directory: `cd /home/deploy/minecraft-server`
3. Install plugins: `./install-plugins.sh`
4. Restart server: `sudo systemctl restart minecraft.service`

The system automatically:
- Downloads plugins from GitHub Releases and Modrinth
- Selects the correct JAR files (Bukkit/Paper versions)
- Tracks versions for smart updates
- Backs up old plugins before updating

### Plugin Discovery

Easily add new plugins without manually searching for repository paths or project IDs:

```bash
# Create a wishlist of plugin names
cat > plugins-wishlist.txt << 'EOF'
Vault
PlaceholderAPI
ChestShop
EOF

# Discover and add to plugins.json
./install-plugins.sh --discover

# Interactive mode (confirm each plugin)
./install-plugins.sh --discover --interactive

# Discover and install in one step
./install-plugins.sh --discover --install
```

The discovery feature searches Modrinth and GitHub, automatically extracting the correct source information and adding it to your `plugins.json`.

### Customization

Edit `plugins.json` to enable/disable specific plugins:

```json
{
  "name": "LuckPerms",
  "enabled": true,  // Change to false to disable
  "category": "essential",
  ...
}
```

**For complete documentation**, see [PLUGINS.md](PLUGINS.md) - includes:
- How to add new plugins
- Troubleshooting guide
- Advanced configuration
- Cron automation for updates

---

## 🛠️ What's Included

- **Server Configuration Files**
  - `config.sh` - Centralized configuration (Minecraft version, RAM settings)
  - `server.properties` - Minecraft server configuration with festas_builds branding
  - `eula.txt` - Minecraft EULA acceptance
  - `start.sh` - Paper server startup script with optimized JVM flags
  
- **Plugin Management**
  - `plugins.json` - Plugin configuration (enable/disable, sources)
  - `install-plugins.sh` - Automated plugin installation script
  - `update-plugins.sh` - Plugin update script with backup support
  
- **System Integration**
  - `minecraft.service` - Systemd service file with Aikar's flags
  
- **Automation**
  - `.github/workflows/deploy.yml` - GitHub Actions workflow for automated deployment
  
- **Utilities**
  - `backup.sh` - Automated backup script
  - `update.sh` - Server version update script
  
- **Documentation**
  - `DEPLOYMENT.md` - Complete step-by-step deployment guide
  - `PLUGINS.md` - Plugin recommendations and setup instructions
  - `ROADMAP.md` - Community server growth roadmap
  - `server-icon-instructions.md` - Custom branding guide

---

## 🎯 Quick Deployment Overview

1. **Prepare your server** - Install Java 17+, configure firewall
2. **Setup GitHub secrets** - Add SSH keys and server details
3. **Accept EULA** - Edit `eula.txt` and set `eula=true`
4. **Configure** - Update `config.sh` with your preferences
5. **Deploy** - Push to main branch or trigger workflow manually
6. **Enable service** - SSH to server and enable the systemd service
7. **Add branding** - Upload custom `server-icon.png` (see [guide](server-icon-instructions.md))
8. **Install plugins** - Follow [PLUGINS.md](PLUGINS.md) for recommended setup
9. **Play!** - Connect with your Minecraft client

---

## 📊 Server Requirements

- **OS**: Ubuntu 20.04+, Debian 11+, or similar Linux distribution
- **RAM**: Minimum 2GB (4GB+ recommended, 6GB+ for Bedrock support)
- **Disk**: At least 10GB free space
- **Java**: OpenJDK 17 or higher
- **Network**: Port 25565 (TCP/UDP) open for Java Edition
- **Network (Bedrock)**: Port 19132 (UDP) open for Bedrock Edition cross-play

## 🔧 Configuration

### Server Properties
Edit `server.properties` to customize your server:

```properties
# Server branding (with Minecraft color codes)
motd=§6§l✦ §b§lfestas_builds §6§l✦ §r§f\\n§7Community Server §a§l[1.20.4]

# Maximum players
max-players=20

# Difficulty
difficulty=normal

# Game mode
gamemode=survival

# Enable PvP
pvp=true
```

### Server Configuration
Edit `config.sh` to change server version and resources:

```bash
# Minecraft version (Paper will auto-download latest build)
MINECRAFT_VERSION="1.20.4"

# Memory allocation
MIN_RAM="2G"
MAX_RAM="4G"
```

After editing, commit and push to automatically deploy changes.

---

## 📝 Server Management

```bash
# Start server
sudo systemctl start minecraft.service

# Stop server
sudo systemctl stop minecraft.service

# Restart server
sudo systemctl restart minecraft.service

# Check status
sudo systemctl status minecraft.service

# View logs
sudo journalctl -u minecraft.service -f
```

## 🔄 Automated Deployment

Every push to the `main` branch automatically:
1. Copies configuration files to your server
2. Updates the systemd service
3. Downloads the latest Paper server JAR for your Minecraft version (if missing)
4. Restarts the service

You can also manually trigger deployment from the GitHub Actions tab.

---

## 💾 Backups

Run the backup script on your server:

```bash
/home/deploy/minecraft-server/backup.sh
```

Or set up automated daily backups via cron:

```bash
crontab -e
# Add: 0 3 * * * /home/deploy/minecraft-server/backup.sh
```

## 🔄 Updating Minecraft Version

### Method 1: Using config.sh (Recommended)
1. Edit `config.sh` and change `MINECRAFT_VERSION`
2. Delete the old `server.jar` on your server
3. Commit and push - Paper will auto-download the new version

### Method 2: Using update script
```bash
/home/deploy/minecraft-server/update.sh
```

**Note:** Always backup your world before updating! See [DEPLOYMENT.md](DEPLOYMENT.md) for backup procedures.

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
- Ensure EULA is accepted (`eula=true` in `eula.txt`)
- Verify Java is installed: `java -version`
- Check firewall allows port 25565
- Review logs: `sudo journalctl -u minecraft.service -n 100`

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