# Minecraft Web Console - Setup Guide

## Overview

The Minecraft Web Console provides a comprehensive web-based interface for managing your Minecraft server. It features real-time log streaming, server control buttons, player management, RCON command execution, and more.

## Features

- 🔐 **Secure Authentication** - Session-based auth with bcrypt password hashing
- 📊 **Real-time Dashboard** - Live server stats, player count, TPS, memory/CPU usage
- 💻 **Console Interface** - Execute commands via RCON with command history
- 👥 **Player Management** - Kick, ban, OP, teleport, and manage players
- 📝 **Live Log Viewer** - Real-time log streaming with WebSocket
- ⚡ **Quick Actions** - One-click buttons for common tasks
- 🔄 **Server Control** - Start, stop, restart, and manage the server
- 📦 **Backup Management** - Create and manage server backups
- 🎨 **Minecraft Theme** - Dark mode with Minecraft-inspired design

## Prerequisites

Before setting up the console, ensure you have:

- Docker and Docker Compose installed
- Minecraft server running in Docker (via the main docker-compose.yml)
- Node.js 20+ (if running console outside Docker)
- Nginx (for production deployment with SSL)
- Domain name with DNS configured (for HTTPS)

## Quick Start

### 1. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and set secure values:

```env
# Generate secure session secret
SESSION_SECRET=$(openssl rand -hex 32)

# Set admin credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-very-secure-password

# Set RCON password (must match Minecraft server)
RCON_PASSWORD=your-secure-rcon-password
```

### 2. Update Minecraft Server Configuration

The main `docker-compose.yml` has been updated with RCON support. Make sure your `.env` file has the RCON_PASSWORD set, then restart your Minecraft server:

```bash
docker-compose down
docker-compose up -d
```

### 3. Start the Console

```bash
docker-compose -f docker-compose.console.yml up -d
```

### 4. Access the Console

Open your browser and navigate to:

```
http://your-server-ip:3001/console
```

Login with the credentials you set in the `.env` file.

## Production Setup with Nginx and SSL

### 1. Install Nginx

```bash
sudo apt update
sudo apt install nginx
```

### 2. Configure Nginx

Copy the console Nginx configuration:

```bash
sudo cp nginx/console.conf /etc/nginx/sites-available/console
sudo ln -s /etc/nginx/sites-available/console /etc/nginx/sites-enabled/
```

Edit the configuration and replace `mc.festas-builds.com` with your actual domain:

```bash
sudo nano /etc/nginx/sites-enabled/console
```

Test the configuration:

```bash
sudo nginx -t
```

Reload Nginx:

```bash
sudo systemctl reload nginx
```

### 3. Set Up SSL with Let's Encrypt

Install Certbot:

```bash
sudo apt install certbot python3-certbot-nginx
```

Obtain SSL certificate:

```bash
sudo certbot --nginx -d mc.festas-builds.com
```

Follow the prompts. Certbot will automatically:
- Obtain the SSL certificate
- Update your Nginx configuration
- Set up automatic renewal

### 4. Enable HTTPS in Nginx Config

After obtaining the SSL certificate, uncomment the HTTPS server block in `/etc/nginx/sites-enabled/console` and reload Nginx:

```bash
sudo systemctl reload nginx
```

### 5. Update Console Environment

For production with HTTPS, update your `.env`:

```env
NODE_ENV=production
```

Restart the console:

```bash
docker-compose -f docker-compose.console.yml restart
```

## First-Time Admin Setup

The console automatically creates an admin user on first run using the credentials from `.env`.

To change the admin password later:

1. Stop the console:
   ```bash
   docker-compose -f docker-compose.console.yml down
   ```

2. Edit `console/backend/config/users.json` or delete it to regenerate

3. Update `.env` with new password

4. Restart the console:
   ```bash
   docker-compose -f docker-compose.console.yml up -d
   ```

## Configuration Files

### Backend Configuration

Located in `console/backend/config/`:

- **users.json** - Admin user credentials (auto-generated)
- **settings.json** - Console UI settings
- **schedule.json** - Scheduled tasks (restarts, backups, messages)

### Environment Variables

All environment variables are documented in `.env.example`:

| Variable | Description | Default |
|----------|-------------|---------|
| `CONSOLE_PORT` | Port for console backend | 3001 |
| `SESSION_SECRET` | Secret for session encryption | (generate) |
| `ADMIN_USERNAME` | Admin username | admin |
| `ADMIN_PASSWORD` | Admin password | (change this!) |
| `RCON_HOST` | Minecraft server hostname | minecraft-server |
| `RCON_PORT` | RCON port | 25575 |
| `RCON_PASSWORD` | RCON password | (must match server) |
| `RATE_LIMIT_WINDOW_MS` | Login rate limit window | 900000 (15 min) |
| `RATE_LIMIT_MAX_ATTEMPTS` | Max login attempts | 5 |

## Security Best Practices

### 1. Strong Passwords

- Use strong, unique passwords for admin account and RCON
- Generate passwords with: `openssl rand -base64 32`

### 2. HTTPS Only

- Always use HTTPS in production
- Let's Encrypt provides free SSL certificates
- Never transmit credentials over HTTP

### 3. Firewall Configuration

Block direct access to port 3001 and only allow Nginx:

```bash
sudo ufw allow 'Nginx Full'
sudo ufw deny 3001
```

### 4. Rate Limiting

The console includes built-in rate limiting for login attempts (5 attempts per 15 minutes by default).

For additional protection, enable Nginx rate limiting (see `nginx/console.conf`).

### 5. IP Whitelisting (Optional)

To restrict access to specific IP addresses, set in `.env`:

```env
IP_WHITELIST=192.168.1.100,10.0.0.50
```

### 6. Regular Updates

Keep all components updated:

```bash
# Update Docker images
docker-compose -f docker-compose.console.yml pull
docker-compose -f docker-compose.console.yml up -d

# Update Nginx
sudo apt update && sudo apt upgrade nginx
```

### 7. Backup Configuration

Regularly backup your console configuration:

```bash
tar -czf console-backup-$(date +%Y%m%d).tar.gz \
  console/backend/config/ \
  .env
```

## Troubleshooting

### Console Won't Start

**Check logs:**
```bash
docker-compose -f docker-compose.console.yml logs -f console
```

**Common issues:**
- Docker socket not accessible (check volume mounts)
- Port 3001 already in use
- Missing environment variables

### Can't Connect to RCON

**Verify RCON is enabled on Minecraft server:**
```bash
docker exec minecraft-server rcon-cli
```

**Check RCON password matches:**
- `.env` RCON_PASSWORD must match Minecraft server
- Restart both containers if password changed

### WebSocket Connection Failed

**Check Nginx configuration:**
- Ensure WebSocket upgrade headers are set
- Verify proxy_pass points to correct backend

**Check firewall:**
- Ensure WebSocket ports aren't blocked

### Login Fails

**Reset admin password:**
1. Stop console
2. Delete `console/backend/config/users.json`
3. Update `.env` with new password
4. Restart console

### Logs Not Streaming

**Check Docker socket access:**
```bash
docker-compose -f docker-compose.console.yml exec console ls -la /var/run/docker.sock
```

**Verify Minecraft container name:**
- Ensure MC_CONTAINER_NAME in `.env` matches actual container name

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
│         (HTML/CSS/JavaScript + Socket.io Client)           │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS (Nginx Reverse Proxy)
┌────────────────────────▼────────────────────────────────────┐
│                  Console Backend (Node.js)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Express API  │  │  Socket.io   │  │ Auth/Session │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────┬──────────────────────┬──────────────────────────────┘
         │ Docker API           │ RCON Protocol
┌────────▼────────┐   ┌─────────▼────────────────────────────┐
│ Docker Engine   │   │   Minecraft Server Container         │
│                 │   │   (Paper/Spigot with RCON enabled)   │
└─────────────────┘   └──────────────────────────────────────┘
```

## API Endpoints

### Authentication
- `POST /api/login` - Login
- `POST /api/logout` - Logout
- `GET /api/session` - Check session

### Server Control
- `GET /api/server/status` - Get server status
- `POST /api/server/start` - Start server
- `POST /api/server/stop` - Stop server
- `POST /api/server/restart` - Restart server
- `POST /api/server/kill` - Force kill server
- `POST /api/server/save` - Save all worlds
- `POST /api/server/backup` - Create backup

### Commands
- `POST /api/commands/execute` - Execute RCON command
- `GET /api/commands/history` - Get command history
- `GET /api/commands/favorites` - Get favorite commands

### Players
- `GET /api/players/list` - List online players
- `POST /api/players/kick` - Kick player
- `POST /api/players/ban` - Ban player
- `POST /api/players/op` - Give OP status
- `POST /api/players/gamemode` - Change gamemode

### Files
- `GET /api/files/server-properties` - View server.properties
- `POST /api/files/server-properties` - Update server.properties
- `GET /api/files/logs` - List log files

### Backups
- `GET /api/backups/list` - List backups

## Development

To run the console in development mode:

```bash
cd console/backend
npm install
npm run dev
```

Frontend files are static HTML/CSS/JS in `console/frontend/`.

## Support

For issues or questions:
- Check this documentation
- Review logs: `docker-compose -f docker-compose.console.yml logs`
- Open an issue on GitHub

## License

MIT License - See LICENSE file for details
