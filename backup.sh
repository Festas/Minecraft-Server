#!/bin/bash
# Minecraft Server Backup Script
# Run this script to create backups of your world data

# Load configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/config.sh" ]; then
    source "$SCRIPT_DIR/config.sh"
else
    # Default configuration if config.sh is missing
    SERVER_DIR="/home/deploy/minecraft-server"
fi

BACKUP_DIR="/home/deploy/minecraft-backups"
DATE=$(date +%Y%m%d_%H%M%S)
LOCK_FILE="/tmp/minecraft-backup.lock"

# Cleanup function to be called on exit
cleanup() {
    # Remove lock file if it exists
    if [ -f "$LOCK_FILE" ]; then
        rm -f "$LOCK_FILE"
    fi
}

# Set trap to cleanup on exit, interrupt, or error
trap cleanup EXIT INT TERM

# Check if another backup is running
if [ -f "$LOCK_FILE" ]; then
    echo "Error: Another backup is already running (lock file exists: $LOCK_FILE)"
    echo "If you're sure no backup is running, remove the lock file manually:"
    echo "  rm $LOCK_FILE"
    exit 1
fi

# Create lock file
if ! echo $$ > "$LOCK_FILE"; then
    echo "Error: Failed to create lock file: $LOCK_FILE"
    exit 1
fi

echo "Creating Minecraft server backup..."

# Create backup directory if it doesn't exist
if ! mkdir -p "$BACKUP_DIR"; then
    echo "Error: Failed to create backup directory: $BACKUP_DIR"
    exit 1
fi

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

# Create the backup with error checking
if ! tar -czf "$BACKUP_DIR/minecraft-backup-$DATE.tar.gz" \
    -C "$SERVER_DIR" \
    $BACKUP_ITEMS; then
    echo "Error: Failed to create backup archive!"
    echo "Starting Minecraft server..."
    sudo systemctl start minecraft.service
    exit 1
fi

# Start the server again
echo "Starting Minecraft server..."
sudo systemctl start minecraft.service

# Keep only the last 7 backups
echo "Cleaning up old backups..."
cd "$BACKUP_DIR" || exit 1
ls -t minecraft-backup-*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm

echo "Backup complete: $BACKUP_DIR/minecraft-backup-$DATE.tar.gz"
echo "Available backups:"
ls -lh "$BACKUP_DIR"
