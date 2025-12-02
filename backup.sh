#!/bin/bash
# Minecraft Server Backup Script
# Run this script to create backups of your world data

BACKUP_DIR="/home/deploy/minecraft-backups"
SERVER_DIR="/home/deploy/minecraft-server"
DATE=$(date +%Y%m%d_%H%M%S)

echo "Creating Minecraft server backup..."

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Stop the server gracefully for consistent backup
echo "Stopping Minecraft server..."
sudo systemctl stop minecraft.service

# Create the backup
echo "Creating backup archive..."
# Build list of files/directories that exist
BACKUP_ITEMS=""
for item in world world_nether world_the_end server.properties ops.json whitelist.json banned-players.json banned-ips.json; do
    if [ -e "$SERVER_DIR/$item" ]; then
        BACKUP_ITEMS="$BACKUP_ITEMS $item"
    fi
done

if [ -z "$BACKUP_ITEMS" ]; then
    echo "Warning: No files found to backup!"
    sudo systemctl start minecraft.service
    exit 1
fi

tar -czf "$BACKUP_DIR/minecraft-backup-$DATE.tar.gz" \
    -C "$SERVER_DIR" \
    $BACKUP_ITEMS

# Start the server again
echo "Starting Minecraft server..."
sudo systemctl start minecraft.service

# Keep only the last 7 backups
echo "Cleaning up old backups..."
cd "$BACKUP_DIR"
ls -t minecraft-backup-*.tar.gz | tail -n +8 | xargs -r rm

echo "Backup complete: $BACKUP_DIR/minecraft-backup-$DATE.tar.gz"
echo "Available backups:"
ls -lh "$BACKUP_DIR"
