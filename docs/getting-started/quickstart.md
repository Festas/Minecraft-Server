← [Back to Getting Started](./README.md) | [Documentation Home](../README.md)

---

# Quick Start Guide 🚀

<!-- Last Updated: 2025-12-10 -->

Your Minecraft server deployment system is ready! Here's everything that was created:

## 📁 Files Created

### Core Configuration (5 files)
1. **config.sh** - Centralized configuration for Minecraft version and server settings
2. **server.properties** - Minecraft server game settings (difficulty, max players, etc.)
3. **eula.txt** - Minecraft EULA (⚠️ **YOU MUST CHANGE `eula=false` to `eula=true`**)
4. **minecraft.service** - Systemd service file for automatic server management
5. **.gitignore** - Prevents committing server files that shouldn't be in git

### Scripts (3 files)
6. **start.sh** - Starts the Minecraft server (auto-downloads server JAR)
7. **backup.sh** - Creates backups of your world and configuration
8. **update.sh** - Interactive script to update Minecraft versions

### Automation (1 file)
9. **.github/workflows/deploy.yml** - Automated deployment via GitHub Actions

### Documentation (4 files)
10. **README.md** - Project overview and quick start guide
11. **DEPLOYMENT.md** - **Complete 300+ line deployment guide** ⭐
12. **DOCKER.md** - Alternative Docker-based deployment guide
13. **QUICK-REFERENCE.md** - Quick command reference card

## 🚀 Next Steps

### 1️⃣ Accept the Minecraft EULA (REQUIRED)

Edit `eula.txt` and change:
```
eula=false
```
to:
```
eula=true
```

Then commit:
```bash
git add eula.txt
git commit -m "Accept Minecraft EULA"
git push
```

### 2️⃣ Setup Your Hetzner Server

Follow the **Initial Server Setup** section in [deployment.md](./deployment.md):

- Install Java 17 on your server
- Configure firewall to allow port 25565
- Setup sudo permissions for the `deploy` user
- Create the server directory

### 3️⃣ Configure GitHub Secrets

You need to add 3 secrets to your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:

| Secret Name | What to Put | How to Get It |
|------------|-------------|---------------|
| `SSH_PRIVATE_KEY` | Your SSH private key | Generate with `ssh-keygen -t rsa -b 4096` |
| `SERVER_HOST` | Your Hetzner server IP | e.g., `123.456.789.012` |
| `SERVER_USER` | `deploy` | The deployment user on your server |

### 4️⃣ Deploy!

Once EULA is accepted and secrets are configured:

**Option A - Automatic:** Just push to the `main` branch
```bash
git push
```

**Option B - Manual:** Go to **Actions** tab → **Deploy Minecraft Server** → **Run workflow**

### 5️⃣ Enable the Service (First Time Only)

After first deployment, SSH into your server:
```bash
ssh deploy@your-server-ip
sudo systemctl enable minecraft.service
sudo systemctl start minecraft.service
```

### 6️⃣ Play Minecraft!

Connect from your Minecraft client:
- **Server Address:** `your-server-ip:25565`

## 📖 Documentation Guide

### For Step-by-Step Instructions
👉 **Read [deployment.md](./deployment.md)** - This is your main guide!

It covers:
- ✅ Prerequisites (Java, firewall, etc.)
- ✅ Complete server setup process
- ✅ SSH key generation and setup
- ✅ First deployment walkthrough
- ✅ Server management commands
- ✅ Troubleshooting common issues
- ✅ Advanced configuration
- ✅ Backup and update procedures
- ✅ Performance tuning
- ✅ Security best practices

### For Quick Commands
👉 **Use [Quick Reference](../../QUICK-REFERENCE.md)** - Fast lookup for common tasks

### For Docker Alternative
👉 **See [docker.md](./docker.md)** - If you prefer containerized deployment

## 🎮 How It Works

### Automated Deployment
Every time you push to `main`, GitHub Actions will:

1. ✅ Connect to your Hetzner server via SSH
2. ✅ Copy all configuration files
3. ✅ Update the systemd service
4. ✅ Download Minecraft server JAR (if missing)
5. ✅ Restart the server

### Updating Minecraft Version

Edit `config.sh`:
```bash
MINECRAFT_VERSION="1.21.0"
MINECRAFT_JAR_URL="https://piston-data.mojang.com/v1/objects/NEW_HASH/server.jar"
```

Commit and push - it will auto-deploy!

### Changing Server Settings

Edit `server.properties`:
```properties
motd=My Awesome Server!
max-players=50
difficulty=hard
```

Commit and push - it will auto-deploy!

## 🛠️ Common Commands

```bash
# Start server
sudo systemctl start minecraft.service

# Stop server
sudo systemctl stop minecraft.service

# View logs
sudo journalctl -u minecraft.service -f

# Create backup
/home/deploy/minecraft-server/backup.sh

# Update Minecraft version
/home/deploy/minecraft-server/update.sh
```

## 🔐 Security Features

✅ **SSH key authentication** - No passwords in GitHub Actions  
✅ **Limited sudo permissions** - Deploy user can only manage minecraft service  
✅ **Systemd security** - NoNewPrivileges, PrivateTmp, ProtectSystem  
✅ **GitHub Actions permissions** - Minimal token permissions (read-only)  
✅ **No secrets in code** - All sensitive data via GitHub Secrets  

## ⚠️ Important Notes

### MUST DO Before Deployment
- [ ] Change `eula=true` in eula.txt
- [ ] Add GitHub Secrets (SSH_PRIVATE_KEY, SERVER_HOST, SERVER_USER)
- [ ] Install Java on your Hetzner server
- [ ] Configure firewall to allow port 25565

### Server Directory
All files will be deployed to: `/home/deploy/minecraft-server/`

### Default Settings
- **Minecraft Version:** 1.20.4 (change in config.sh)
- **Memory:** 2GB min, 4GB max (change in config.sh)
- **Port:** 25565 (change in server.properties)
- **Max Players:** 20 (change in server.properties)
- **Difficulty:** Normal (change in server.properties)
- **Game Mode:** Survival (change in server.properties)

## 📞 Need Help?

1. **Check [deployment.md](./deployment.md)** - Detailed troubleshooting section
2. **Check [Quick Reference](../../QUICK-REFERENCE.md)** - Common commands
3. **View GitHub Actions logs** - See what went wrong in deployment
4. **Check server logs** - `sudo journalctl -u minecraft.service -n 100`

## 🎯 Quick Start Checklist

- [ ] Accept EULA (`eula=true` in eula.txt)
- [ ] Install Java 17 on Hetzner server
- [ ] Configure firewall (allow port 25565)
- [ ] Setup deploy user sudo permissions
- [ ] Generate SSH keys
- [ ] Add SSH public key to server
- [ ] Configure GitHub Secrets
- [ ] Push code to trigger deployment
- [ ] Enable and start systemd service
- [ ] Connect from Minecraft client
- [ ] Have fun! 🎮

---

**Ready to deploy?** Start with [deployment.md](./deployment.md) for the complete guide!

## 📊 What You Get

✨ **Automated Deployment** - Push to deploy  
✨ **Easy Updates** - Change config.sh and push  
✨ **Automatic Backups** - Built-in backup script  
✨ **Systemd Integration** - Auto-start on boot, auto-restart on crash  
✨ **Complete Documentation** - 400+ lines of guides  
✨ **Security Hardened** - Following best practices  
✨ **Docker Alternative** - If you prefer containers  
✨ **Version Control** - All configuration in Git  

Enjoy your Minecraft server! 🎮⛏️

---

## Next Steps

- 📖 [Full Deployment Guide](./deployment.md) - Complete step-by-step deployment instructions
- 🐳 [Docker Setup](./docker.md) - Alternative containerized deployment
- 🌐 [Bedrock Edition Setup](./bedrock-setup.md) - Enable cross-platform play
- ✅ [Launch Checklist](./launch-checklist.md) - Pre-launch validation

---

← [Back to Getting Started](./README.md) | [Documentation Home](../README.md)
