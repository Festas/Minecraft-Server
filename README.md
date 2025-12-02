# Minecraft Server on Hetzner

Automated Minecraft server deployment system with GitHub Actions for Hetzner servers.

## 🚀 Quick Start

This repository provides everything you need to deploy and manage a Minecraft server on your Hetzner server (or any Linux server) with automated deployments via GitHub Actions.

## 📋 Features

- ✅ Automated deployment via GitHub Actions
- ✅ Systemd service for automatic server management
- ✅ Easy configuration management
- ✅ Backup scripts included
- ✅ Update scripts for version upgrades
- ✅ Comprehensive deployment documentation

## 🛠️ What's Included

- **Server Configuration Files**
  - `server.properties` - Minecraft server configuration
  - `eula.txt` - Minecraft EULA acceptance
  - `start.sh` - Server startup script
  
- **System Integration**
  - `minecraft.service` - Systemd service file for automatic server management
  
- **Automation**
  - `.github/workflows/deploy.yml` - GitHub Actions workflow for automated deployment
  
- **Utilities**
  - `backup.sh` - Automated backup script
  - `update.sh` - Server version update script
  
- **Documentation**
  - `DEPLOYMENT.md` - Complete step-by-step deployment guide

## 📖 Documentation

For complete deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

The deployment guide covers:
- Server prerequisites and setup
- GitHub repository configuration
- SSH key setup for automated deployment
- First-time deployment steps
- Server management commands
- Troubleshooting common issues
- Advanced configuration options
- Backup and update procedures

## 🎯 Quick Deployment Overview

1. **Prepare your server** - Install Java, configure firewall
2. **Setup GitHub secrets** - Add SSH keys and server details
3. **Accept EULA** - Edit `eula.txt` and set `eula=true`
4. **Deploy** - Push to main branch or trigger workflow manually
5. **Enable service** - SSH to server and enable the systemd service
6. **Play!** - Connect with your Minecraft client

## 📊 Server Requirements

- **OS**: Ubuntu 20.04+, Debian 11+, or similar Linux distribution
- **RAM**: Minimum 2GB (4GB+ recommended)
- **Disk**: At least 10GB free space
- **Java**: OpenJDK 17 or higher
- **Network**: Port 25565 (TCP/UDP) open

## 🔧 Configuration

Edit `server.properties` to customize your server:

```properties
# Server description
motd=A Minecraft Server on Hetzner

# Maximum players
max-players=20

# Difficulty
difficulty=normal

# Game mode
gamemode=survival

# Enable PvP
pvp=true
```

After editing, commit and push to automatically deploy changes.

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
3. Downloads the Minecraft server JAR (if missing)
4. Restarts the service

You can also manually trigger deployment from the GitHub Actions tab.

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

Use the included update script:

```bash
/home/deploy/minecraft-server/update.sh
```

Or manually edit `start.sh` with the new version URL and redeploy.

## 🐛 Troubleshooting

See the [Troubleshooting section](DEPLOYMENT.md#troubleshooting) in DEPLOYMENT.md for common issues and solutions.

**Quick checks:**
- Ensure EULA is accepted (`eula=true` in `eula.txt`)
- Verify Java is installed: `java -version`
- Check firewall allows port 25565
- Review logs: `sudo journalctl -u minecraft.service -n 100`

## 📚 Additional Resources

- [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment guide
- [Minecraft Server Wiki](https://minecraft.fandom.com/wiki/Server)
- [Minecraft EULA](https://account.mojang.com/documents/minecraft_eula)

## ⚖️ License

This deployment setup is provided as-is. Minecraft is owned by Mojang Studios. You must accept the [Minecraft EULA](https://account.mojang.com/documents/minecraft_eula) to run a Minecraft server.

## 🤝 Contributing

Feel free to submit issues or pull requests to improve the deployment setup!

---

**Ready to get started?** Head over to [DEPLOYMENT.md](DEPLOYMENT.md) for the complete step-by-step guide!