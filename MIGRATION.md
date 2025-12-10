# Migration Guide: Bare-Metal to Containerized Minecraft Server

This guide explains how to transition from running the Minecraft server as a bare-metal Java process to running it in a Docker container using the `itzg/minecraft-server` image.

## Overview

The containerized approach provides several benefits:
- **Better isolation**: Server runs in its own container with resource limits
- **Easier deployment**: Consistent environment across deployments
- **Improved console integration**: Direct network connectivity between console and server
- **Simplified management**: Docker handles process management and restart policies

## Prerequisites

- Docker and Docker Compose installed on the server
- SSH access to the server
- RCON_PASSWORD secret configured in GitHub repository

## Migration Steps

### 1. Backup Current Server Data

Before starting the migration, create a backup of your current server:

```bash
ssh user@server
cd /home/deploy/minecraft-server
./backup.sh
```

### 2. Stop Bare-Metal Server

Stop the systemd service running the bare-metal Minecraft server:

```bash
sudo systemctl stop minecraft.service
sudo systemctl disable minecraft.service
```

Verify the server is stopped:

```bash
sudo systemctl status minecraft.service
```

### 3. Deploy Containerized Server

Run the **Deploy Minecraft Server** GitHub Actions workflow:

1. Go to the repository on GitHub
2. Click on **Actions** tab
3. Select **Deploy Minecraft Server Container** workflow
4. Click **Run workflow**
5. Confirm and wait for deployment to complete

The workflow will:
- Create the deployment directory
- Generate docker-compose.yml with proper configuration
- Pull the `itzg/minecraft-server:java21` image
- Start the container
- Connect it to the `caddy-network` for console integration
- Wait for the server to become healthy

### 4. Verify Server is Running

Check the server status via SSH:

```bash
ssh user@server
docker ps | grep minecraft-server
docker logs minecraft-server --tail=50
```

The server should show as "healthy" in the status column.

### 5. Update Console Configuration

Run the **Deploy Console** workflow to update the console with the new RCON connection:

1. Go to the repository on GitHub
2. Click on **Actions** tab
3. Select **Deploy Console** workflow
4. Click **Run workflow**
5. Wait for deployment to complete

The console will now connect to the containerized server using the container name `minecraft-server` instead of `host.docker.internal`.

### 6. Verify Console Connectivity

1. Navigate to https://mc.festas-builds.com/console
2. Log in with your admin credentials
3. Verify the server status shows as "Online"
4. Test sending commands via the console
5. Check that start/stop/restart buttons work

## Data Persistence

The containerized server uses a Docker volume named `minecraft_data` to persist all server data:

- World files
- Configuration files
- Player data
- Plugins (if configured)

This volume is created automatically and persists across container restarts and updates.

## Configuration Changes

### Environment Variables

The containerized server uses environment variables for configuration instead of directly editing `server.properties`. Key settings:

- `VERSION`: Minecraft version (default: 1.20.4)
- `MEMORY`: Server memory allocation (default: 4G)
- `MOTD`: Server message of the day
- `MAX_PLAYERS`: Maximum player count (default: 20)
- `DIFFICULTY`: Game difficulty (default: normal)
- `RCON_PASSWORD`: RCON password from GitHub secret

### RCON Configuration

RCON is automatically enabled in the container with:
- Port: 25575 (internal to container network)
- Password: Set via `RCON_PASSWORD` environment variable
- Network: Connected to `caddy-network` for console access

## Troubleshooting

### Server shows as offline in console

1. Check if the container is running:
   ```bash
   docker ps | grep minecraft-server
   ```

2. Check container health:
   ```bash
   docker inspect minecraft-server | grep -A 10 Health
   ```

3. Check container logs:
   ```bash
   docker logs minecraft-server --tail=100
   ```

### Console can't connect to server

1. Verify both containers are on the same network:
   ```bash
   docker network inspect caddy-network
   ```
   Both `minecraft-server` and `minecraft-console` should be listed.

2. Test RCON connection from console container:
   ```bash
   docker exec -it minecraft-console sh -c "nc -zv minecraft-server 25575"
   ```

### Container won't start

1. Check Docker logs:
   ```bash
   docker logs minecraft-server
   ```

2. Verify the `minecraft_data` volume exists:
   ```bash
   docker volume ls | grep minecraft_data
   ```

3. Check available disk space:
   ```bash
   df -h
   ```

## Rollback Procedure

If you need to rollback to the bare-metal server:

1. Stop the container:
   ```bash
   docker compose -f /home/deploy/minecraft-server/docker-compose.yml down
   ```

2. Re-enable the systemd service:
   ```bash
   sudo systemctl enable minecraft.service
   sudo systemctl start minecraft.service
   ```

3. Update console to use `host.docker.internal`:
   - Edit `.env` file in `/home/deploy/minecraft-console`
   - Change `RCON_HOST=minecraft-server` to `RCON_HOST=host.docker.internal`
   - Restart console: `docker compose restart`

## Managing the Containerized Server

### Common Commands

```bash
# View logs
docker logs minecraft-server -f

# Restart server
docker restart minecraft-server

# Stop server
docker stop minecraft-server

# Start server
docker start minecraft-server

# Access RCON console
docker exec -i minecraft-server rcon-cli

# View server stats
docker stats minecraft-server

# Backup (manual)
docker exec minecraft-server mc-backup

# Update server
cd /home/deploy/minecraft-server
docker compose pull
docker compose up -d
```

### Updating Minecraft Version

To update the Minecraft version:

1. SSH to the server
2. Edit the docker-compose.yml file:
   ```bash
   cd /home/deploy/minecraft-server
   nano docker-compose.yml
   ```
3. Change the `VERSION` environment variable
4. Restart the container:
   ```bash
   docker compose down
   docker compose up -d
   ```

## Network Architecture

After migration, the architecture is:

```
Internet
    ↓
Caddy (Reverse Proxy)
    ↓
caddy-network (Docker Network)
    ├── minecraft-console (port 3001)
    └── minecraft-server (port 25565, RCON 25575)
```

The console and server communicate directly via the shared `caddy-network`, providing reliable RCON connectivity without relying on `host.docker.internal`.

## Additional Resources

- [itzg/minecraft-server Documentation](https://docker-minecraft-server.readthedocs.io/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [CONSOLE-SETUP.md](./CONSOLE-SETUP.md) - Console configuration guide
- [docs/getting-started/deployment.md](./docs/getting-started/deployment.md) - General deployment guide
