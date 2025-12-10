← [Back to Getting Started](./README.md) | [Documentation Home](../README.md)

---

# Docker Setup Guide 🐳

<!-- Last Updated: 2025-12-10 -->

If you prefer to run the Minecraft server using Docker, follow this guide.

## Prerequisites

- Docker installed on your Hetzner server
- Docker Compose installed

## Installation

### 1. Install Docker

```bash
# Update package index
sudo apt update

# Install prerequisites
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -

# Add Docker repository
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add deploy user to docker group
sudo usermod -aG docker deploy

# Verify installation
docker --version
docker-compose --version
```

### 2. Create Docker Compose File

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  minecraft:
    image: itzg/minecraft-server
    container_name: minecraft-server
    restart: unless-stopped
    ports:
      - "25565:25565"
    environment:
      EULA: "TRUE"
      TYPE: "VANILLA"
      VERSION: "1.20.4"
      MEMORY: "4G"
      DIFFICULTY: "normal"
      MAX_PLAYERS: "20"
      MOTD: "A Minecraft Server on Hetzner"
      ENABLE_RCON: "true"
      RCON_PASSWORD: "your_rcon_password_here"
      RCON_PORT: 25575
    volumes:
      - ./data:/data
    tty: true
    stdin_open: true
```

### 3. Start the Server

```bash
# Create data directory
mkdir -p data

# Start the server
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the server
docker-compose down

# Restart the server
docker-compose restart
```

## Management Commands

```bash
# Start server
docker-compose up -d

# Stop server
docker-compose down

# Restart server
docker-compose restart

# View logs
docker-compose logs -f minecraft

# Execute commands
docker exec minecraft rcon-cli

# Backup
tar -czf backup-$(date +%Y%m%d).tar.gz data/

# Update server
docker-compose pull
docker-compose up -d
```

## GitHub Actions for Docker Deployment

Update `.github/workflows/deploy.yml` to use Docker:

```yaml
name: Deploy Minecraft Server (Docker)

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup SSH
      run: |
        mkdir -p ~/.ssh
        echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/id_rsa
        chmod 600 ~/.ssh/id_rsa
        ssh-keyscan -H ${{ secrets.SERVER_HOST }} >> ~/.ssh/known_hosts
        
    - name: Deploy with Docker
      env:
        SERVER_HOST: ${{ secrets.SERVER_HOST }}
        SERVER_USER: ${{ secrets.SERVER_USER }}
      run: |
        # Copy docker-compose.yml
        scp docker-compose.yml ${SERVER_USER}@${SERVER_HOST}:/home/deploy/minecraft-server/
        
        # Deploy
        ssh ${SERVER_USER}@${SERVER_HOST} << 'EOF'
          cd /home/deploy/minecraft-server
          docker-compose pull
          docker-compose up -d
        EOF
```

## Advantages of Docker

- **Easier Updates**: Simple `docker-compose pull` and restart
- **Isolation**: Server runs in isolated container
- **Portability**: Easy to move to different servers
- **Consistent Environment**: Same environment across different hosts

## Disadvantages of Docker

- **Resource Overhead**: Slightly more RAM usage
- **Complexity**: Additional layer to manage
- **Learning Curve**: Requires Docker knowledge

Choose the systemd approach for simplicity or Docker for flexibility!

---

## Next Steps

- 📖 [Full Deployment Guide](./deployment.md) - Complete deployment with GitHub Actions
- 🌐 [Bedrock Edition Setup](./bedrock-setup.md) - Enable cross-platform play
- ✅ [Launch Checklist](./launch-checklist.md) - Pre-launch validation
- 📊 [Server Management](../admin/) - Administration and monitoring

---

← [Back to Getting Started](./README.md) | [Documentation Home](../README.md)
