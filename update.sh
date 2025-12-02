#!/bin/bash
# Update Minecraft Server to Latest Version
# This script helps update the Minecraft server JAR to a new version

SERVER_DIR="/home/deploy/minecraft-server"
BACKUP_DIR="/home/deploy/minecraft-backups"
DATE=$(date +%Y%m%d_%H%M%S)

echo "Minecraft Server Update Script"
echo "==============================="
echo ""
echo "This script will:"
echo "1. Create a backup of current server"
echo "2. Download new server JAR"
echo "3. Restart the server"
echo ""
read -p "Enter the new Minecraft version (e.g., 1.20.4): " VERSION
read -p "Enter the download URL for the server JAR: " JAR_URL
echo ""
read -p "Continue with update? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Update cancelled."
    exit 0
fi

# Create backup
echo "Creating backup..."
mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_DIR/pre-update-backup-$DATE.tar.gz" \
    -C "$SERVER_DIR" \
    world world_nether world_the_end server.jar server.properties

# Stop server
echo "Stopping Minecraft server..."
sudo systemctl stop minecraft.service

# Backup old JAR
cd "$SERVER_DIR"
if [ -f "server.jar" ]; then
    mv server.jar "server.jar.old.$DATE"
fi

# Download new JAR
echo "Downloading new server JAR..."
curl -o server.jar "$JAR_URL"

# Start server
echo "Starting Minecraft server..."
sudo systemctl start minecraft.service

echo ""
echo "Update complete!"
echo "Backup saved to: $BACKUP_DIR/pre-update-backup-$DATE.tar.gz"
echo "Old JAR saved as: server.jar.old.$DATE"
echo ""
echo "Monitor the logs to ensure the server starts correctly:"
echo "sudo journalctl -u minecraft.service -f"
