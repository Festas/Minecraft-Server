#!/bin/bash
# Minecraft Paper Server Start Script
# This script downloads the latest Paper server version and starts the Minecraft server

# Load configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/config.sh" ]; then
    source "$SCRIPT_DIR/config.sh"
else
    # Default configuration if config.sh is missing
    SERVER_DIR="/home/deploy/minecraft-server"
    MINECRAFT_VERSION="1.20.4"
    MIN_RAM="2G"
    MAX_RAM="4G"
fi

SERVER_JAR="server.jar"

# Create server directory if it doesn't exist
mkdir -p "$SERVER_DIR"
cd "$SERVER_DIR"

# Download Paper server jar if it doesn't exist
if [ ! -f "$SERVER_JAR" ]; then
    echo "Downloading Paper server for Minecraft version $MINECRAFT_VERSION..."
    
    # Get the latest Paper build for the specified Minecraft version
    echo "Fetching latest Paper build information..."
    
    # Use jq if available for better JSON parsing, otherwise use grep
    if command -v jq &> /dev/null; then
        PAPER_BUILD=$(curl -s "https://api.papermc.io/v2/projects/paper/versions/${MINECRAFT_VERSION}" | jq -r '.builds[-1]')
    else
        # Fallback to grep-based parsing
        PAPER_BUILD=$(curl -s "https://api.papermc.io/v2/projects/paper/versions/${MINECRAFT_VERSION}" | grep -oP '(?<="builds":\[)[0-9,]+(?=\])' | tr ',' '\n' | tail -1)
    fi
    
    if [ -z "$PAPER_BUILD" ] || [ "$PAPER_BUILD" = "null" ]; then
        echo "Error: Could not fetch Paper build information for version $MINECRAFT_VERSION"
        echo "Please check that version $MINECRAFT_VERSION is available at https://papermc.io/downloads"
        echo ""
        echo "You can manually download the Paper JAR and place it as server.jar in this directory."
        exit 1
    fi
    
    echo "Latest Paper build for $MINECRAFT_VERSION: $PAPER_BUILD"
    PAPER_JAR_URL="https://api.papermc.io/v2/projects/paper/versions/${MINECRAFT_VERSION}/builds/${PAPER_BUILD}/downloads/paper-${MINECRAFT_VERSION}-${PAPER_BUILD}.jar"
    
    if ! curl -f -o "$SERVER_JAR" "$PAPER_JAR_URL"; then
        echo "Error: Failed to download Paper server JAR"
        echo "URL attempted: $PAPER_JAR_URL"
        echo ""
        echo "You can manually download Paper from https://papermc.io/downloads"
        exit 1
    fi
    echo "Paper server download completed successfully"
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

# Start the server with Aikar's optimized flags
echo "Starting Paper Minecraft server..."

# Aikar's recommended JVM flags for better garbage collection
# See: https://docs.papermc.io/paper/aikars-flags
java -Xms${MIN_RAM} -Xmx${MAX_RAM} \
  -XX:+UseG1GC \
  -XX:+ParallelRefProcEnabled \
  -XX:MaxGCPauseMillis=200 \
  -XX:+UnlockExperimentalVMOptions \
  -XX:+DisableExplicitGC \
  -XX:+AlwaysPreTouch \
  -XX:G1NewSizePercent=30 \
  -XX:G1MaxNewSizePercent=40 \
  -XX:G1HeapRegionSize=8M \
  -XX:G1ReservePercent=20 \
  -XX:G1HeapWastePercent=5 \
  -XX:G1MixedGCCountTarget=4 \
  -XX:InitiatingHeapOccupancyPercent=15 \
  -XX:G1MixedGCLiveThresholdPercent=90 \
  -XX:G1RSetUpdatingPauseTimePercent=5 \
  -XX:SurvivorRatio=32 \
  -XX:+PerfDisableSharedMem \
  -XX:MaxTenuringThreshold=1 \
  -Dusing.aikars.flags=https://mcflags.emc.gs \
  -Daikars.new.flags=true \
  -jar ${SERVER_JAR} nogui
