#!/bin/bash
# Minecraft Server Start Script
# This script downloads the latest server version and starts the Minecraft server

# Configuration
SERVER_DIR="/home/deploy/minecraft-server"
MINECRAFT_VERSION="1.20.4"  # Update this to the desired version
SERVER_JAR="server.jar"
MIN_RAM="2G"
MAX_RAM="4G"
JAR_URL="https://piston-data.mojang.com/v1/objects/8dd1a28015f51b1803213892b50b7b4fc76e594d/server.jar"

# Create server directory if it doesn't exist
mkdir -p "$SERVER_DIR"
cd "$SERVER_DIR"

# Download server jar if it doesn't exist
if [ ! -f "$SERVER_JAR" ]; then
    echo "Downloading Minecraft server version $MINECRAFT_VERSION..."
    curl -o "$SERVER_JAR" "$JAR_URL"
fi

# Copy configuration files if they don't exist
if [ ! -f "server.properties" ]; then
    echo "Creating default server.properties..."
    # The server will generate this on first run
fi

if [ ! -f "eula.txt" ]; then
    echo "Creating eula.txt..."
    echo "#By changing the setting below to TRUE you are indicating your agreement to our EULA (https://aka.ms/MinecraftEULA)." > eula.txt
    echo "eula=false" >> eula.txt
    echo ""
    echo "========================================="
    echo "IMPORTANT: You must accept the EULA!"
    echo "Edit eula.txt and change eula=false to eula=true"
    echo "========================================="
fi

# Start the server
echo "Starting Minecraft server..."
java -Xms${MIN_RAM} -Xmx${MAX_RAM} -jar ${SERVER_JAR} nogui
