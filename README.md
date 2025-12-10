# 🎮 festas_builds Minecraft Server

[![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Paper](https://img.shields.io/badge/Server-Paper-00A7E1?logo=minecraft&logoColor=white)](https://papermc.io/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Docs](https://img.shields.io/badge/Docs-Available-blue)](docs/)

> A feature-rich, cross-platform Minecraft community server with automated deployment, web management console, and professional moderation tools.

---

## ✨ Highlights

- 🌍 **Cross-Platform** - Java & Bedrock Edition support (Geyser)
- 🐳 **Docker-Based** - Containerized deployment with zero-downtime updates
- 💻 **Web Console** - Full-featured management interface with RCON
- 🌐 **Live Map** - Explore the world in your browser (BlueMap)
- 🏆 **Build Competitions** - Weekly themed building contests
- 🔐 **Secure** - RBAC, session management, CSRF protection
- 🤖 **Automated** - GitHub Actions for CI/CD and scheduled backups
- 📱 **Responsive** - Mobile-friendly admin console

---

## 🚀 Quick Start

```bash
# 1. Clone repository
git clone https://github.com/Festas/Minecraft-Server.git
cd Minecraft-Server

# 2. Configure environment
cp .env.example .env
# Edit .env with your RCON password

# 3. Create network for services
docker network create caddy-network

# 4. Start server
docker compose up -d

# 5. Connect at your-server-ip:25565
```

**First time deploying?** → **[Complete Deployment Guide](docs/getting-started/deployment.md)**

---

## 📚 Documentation

### Quick Links

| Section | Description |
|---------|-------------|
| **[🚀 Getting Started](docs/getting-started/)** | Deployment, quick start, Docker setup, Bedrock Edition |
| **[🔧 Administration](docs/admin/)** | Server management, security, backups, plugin management |
| **[✨ Features](docs/features/)** | BlueMap, competitions, cosmetics, creator tools, roadmap |
| **[💻 Development](docs/development/)** | API docs, contributing guide, architecture, changelog |
| **[🔍 Troubleshooting](docs/troubleshooting/)** | Common issues, diagnostics, debugging guides |
| **[📖 Reference](docs/reference/)** | Quick reference, commands, UI screenshots |

### Essential Guides

- **[Quick Start Guide](docs/getting-started/quickstart.md)** - Get running in 5 minutes
- **[Docker Guide](docs/getting-started/docker.md)** - Container setup and management
- **[Console Setup](docs/admin/console-setup.md)** - Web management interface
- **[Plugin Manager](docs/admin/plugin-manager.md)** - Install and manage plugins
- **[Admin Cheatsheet](docs/admin/cheatsheet.md)** - Quick command reference
- **[Common Issues](docs/troubleshooting/common-issues.md)** - Solutions to frequent problems

**📍 [Full Documentation Sitemap](docs/NAVIGATION.md)** - Browse all 70+ documentation files

---

## 🗂️ Repository Structure

```
.
├── config/                  # Server and plugin configurations
│   ├── plugins/            # Plugin configuration files
│   ├── server/             # Server configuration (plugins.json)
│   └── templates/          # Competition themes and templates
├── console/                # Web management console
│   ├── backend/           # Node.js API server
│   └── frontend/          # Web UI (HTML/CSS/JS)
├── docs/                   # Complete documentation hub
│   ├── getting-started/   # Deployment and setup guides
│   ├── admin/             # Administration guides
│   ├── features/          # Feature documentation
│   ├── development/       # API and contribution docs
│   ├── troubleshooting/   # Diagnostic guides
│   ├── reference/         # Quick reference materials
│   └── archive/           # Implementation history
├── scripts/               # Automation and diagnostic scripts
├── website/               # Static server website
├── docker-compose.yml     # Main server container
├── docker-compose.console.yml  # Web console container
└── docker-compose.web.yml      # Website container
```

---

## 🌐 Server Features

### Gameplay Features
- 🗺️ **Live 3D Map** - BlueMap web interface
- 🏗️ **Build Competitions** - Weekly themed contests
- 🎭 **Cosmetics** - Particles, hats, and rewards
- 📢 **Welcome System** - Interactive new player tutorial
- 🛡️ **Land Protection** - Claims, rollback, and anti-grief
- 🎬 **Creator Tools** - Filming and recording features

### Technical Features
- ⚡ **Paper Server** - High-performance Spigot fork
- 🐳 **Docker Deployment** - Isolated, reproducible containers
- 🤖 **GitHub Actions** - Automated deployment and backups
- 🔐 **RBAC Console** - Role-based access control
- 📊 **Real-time Monitoring** - TPS, memory, CPU, players
- 💬 **RCON Interface** - Execute commands via web console
- 🔄 **Auto-Updates** - Version management via environment vars

**See [Features Overview](docs/features/overview.md) for complete details.**

---

## 💻 Web Console

Manage your server through a powerful web interface:

**Access:** `http://your-server:3001/console`

**Features:**
- 📊 Real-time dashboard with live stats
- 💬 Live console with RCON command execution
- 👥 Player management (kick, ban, OP, teleport)
- ⚡ Quick actions (start, stop, restart, backup)
- 🎨 Modern UI with Minecraft theming
- 📱 Responsive design for mobile and desktop

**Setup:** [Console Setup Guide](docs/admin/console-setup.md)

---

## 🎯 Deployment Options

### Local Development
```bash
docker compose up -d
```

### Production (GitHub Actions)
1. Configure GitHub secrets (SERVER_HOST, SSH_PRIVATE_KEY, etc.)
2. Push to `main` branch
3. GitHub Actions automatically deploys to your server

**See [Deployment Guide](docs/getting-started/deployment.md) for step-by-step instructions.**

---

## 🌍 Cross-Platform Support

| Edition | Address | Port |
|---------|---------|------|
| **Java** | your-server-ip | 25565 |
| **Bedrock** | your-server-ip | 19132 |

Players on mobile, console, and Windows 10/11 can join via Bedrock Edition.

**Setup:** [Bedrock Edition Guide](docs/getting-started/bedrock-setup.md)

---

## 🛠️ Server Management

### Docker Commands
```bash
# View logs
docker compose logs -f minecraft-server

# Restart server
docker compose restart minecraft-server

# Execute console commands
docker exec -i minecraft-server rcon-cli

# Backup data
docker run --rm -v minecraft_data:/data -v ~/backups:/backup \
  alpine tar czf /backup/backup-$(date +%Y%m%d).tar.gz -C /data .
```

**More commands:** [Admin Cheatsheet](docs/admin/cheatsheet.md) | [Server Management Guide](docs/admin/server-management.md)

---

## 📋 Requirements

- **OS:** Linux with Docker support (Ubuntu 20.04+, Debian 11+)
- **RAM:** 4GB minimum (6GB+ recommended)
- **Disk:** 10GB free space minimum
- **Docker:** Docker Engine 20.10+ and Docker Compose v2+
- **Ports:** 25565 (TCP/UDP), 19132 (UDP for Bedrock)

---

## 🤝 Contributing

Contributions are welcome! Please see:

- **[Contributing Guide](docs/development/contributing.md)** - How to contribute
- **[Architecture](docs/development/architecture.md)** - System overview
- **[Issue Templates](.github/ISSUE_TEMPLATE/)** - Bug reports, features, docs

---

## 📜 License

This deployment configuration is released under the MIT License. See [LICENSE](LICENSE) for details.

Minecraft is owned by Mojang Studios. You must accept the [Minecraft EULA](https://account.mojang.com/documents/minecraft_eula) to run a server.

---

## 🔗 Useful Links

- **[Documentation Hub](docs/)** - Complete documentation
- **[Roadmap](docs/features/roadmap.md)** - Server growth plan
- **[Changelog](docs/development/changelog.md)** - Version history
- **[Paper Documentation](https://docs.papermc.io/)** - Paper server docs
- **[Minecraft Wiki](https://minecraft.fandom.com/wiki/Server)** - General server info

---

**Ready to deploy?** → **[Start Here: Quick Start Guide](docs/getting-started/quickstart.md)**

*Built with ❤️ for the festas_builds community*