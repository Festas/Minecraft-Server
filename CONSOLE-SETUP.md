# Minecraft Console Setup Guide

## Overview
The web console provides a browser-based interface to manage your Minecraft server at `https://mc.festas-builds.com/console`.

## Prerequisites
- Minecraft Server repository set up and deploying
- Link-in-Bio repository managing Caddy (for reverse proxy)
- Access to GitHub repository secrets

## Setup Steps

### Step 1: Add Repository Secrets

Go to your repository → Settings → Secrets and variables → Actions → New repository secret

Add these 4 secrets:

| Secret Name | Description | Maps to Env Var |
|-------------|-------------|-----------------|
| `CONSOLE_ADMIN_USER` | Your console login username | `ADMIN_USERNAME` |
| `CONSOLE_ADMIN_PASSWORD` | Your console login password | `ADMIN_PASSWORD` |
| `RCON_PASSWORD` | Password for RCON connection | `RCON_PASSWORD` |
| `SESSION_SECRET` | Random string for session encryption (32+ chars) | `SESSION_SECRET` |

**Note:** The GitHub secrets are automatically mapped to the correct environment variable names during deployment.

**To generate a secure session secret:**
```bash
openssl rand -hex 32
```

### Step 2: Enable RCON on Minecraft Server

SSH into your server and edit the Minecraft server.properties:

```bash
ssh deploy@your-server-ip
cd /home/deploy/minecraft-server
nano server.properties
```

Add/update these lines:
```properties
enable-rcon=true
rcon.port=25575
rcon.password=YOUR_RCON_PASSWORD_HERE
```

**Important:** Use the same password you set in the `RCON_PASSWORD` secret.

Restart the Minecraft server:
```bash
sudo systemctl restart minecraft.service
```

### Step 3: Update Caddyfile (One-Time)

In your **Link-in-Bio** repository, update the Caddyfile to add console routing:

```caddyfile
mc.festas-builds.com {
    tls eric@festas-builds.com
    encode gzip zstd
    
    # Console routes (WebSocket support for real-time logs)
    handle /console* {
        reverse_proxy minecraft-console:3001
    }
    handle /socket.io* {
        reverse_proxy minecraft-console:3001
    }
    
    # Static website (everything else)
    handle {
        reverse_proxy minecraft-web:80
    }
}
```

Commit and push the change. Caddy will auto-reload.

### Step 4: Deploy

Push any change to the `console/` directory, or manually trigger the workflow:

1. Go to Actions → Deploy Console
2. Click "Run workflow"
3. Wait for deployment to complete

### Step 5: Access Console

Open `https://mc.festas-builds.com/console` and login with your credentials.

## Troubleshooting

### Console not accessible
- Check if container is running: `docker ps | grep minecraft-console`
- Check logs: `docker logs minecraft-console`
- Verify Caddyfile has console routes

### RCON connection failed
- Verify RCON is enabled in server.properties
- Check password matches between secret and server.properties
- Ensure Minecraft server is running: `sudo systemctl status minecraft.service`

### WebSocket not connecting
- Ensure Caddyfile has `/socket.io*` route
- Check browser console for errors

## Architecture

```
Browser → Caddy (443) → minecraft-console:3001
                      → minecraft-web:80

Console Container:
  - Connects to RCON via host.docker.internal:25575
  - Mounts /home/deploy/minecraft-server for file access
  - Mounts Docker socket for container control
  - Stores data in console_data volume
```

## Security Notes

- All secrets are stored in GitHub and passed to the container at runtime
- The `.env` file on the server is created with 600 permissions (read/write for owner only)
- HTTPS is enforced via Caddy
- Session secrets should be strong random strings (32+ characters)

## Maintenance

### Viewing Logs
```bash
ssh deploy@your-server-ip
docker logs minecraft-console -f
```

### Restarting Console
The workflow automatically restarts the console on deployment. Manual restart:
```bash
ssh deploy@your-server-ip
cd /home/deploy/minecraft-console
docker compose restart
```

### Updating Secrets
1. Update the secret in GitHub repository settings
2. Trigger a new deployment (push to console/ or manual workflow trigger)

## Features Available in Console

- 🔐 **Secure Authentication** - Session-based auth with bcrypt password hashing
- 📊 **Real-time Dashboard** - Live server stats, player count, TPS, memory/CPU usage
- 💻 **Console Interface** - Execute commands via RCON with command history
- 👥 **Player Management** - Kick, ban, OP, teleport, and manage players
- 📝 **Live Log Viewer** - Real-time log streaming with WebSocket
- ⚡ **Quick Actions** - One-click buttons for common tasks
- 🔄 **Server Control** - Start, stop, restart, and manage the server
- 📦 **Backup Management** - Create and manage server backups
- 🎨 **Minecraft Theme** - Dark mode with Minecraft-inspired design

