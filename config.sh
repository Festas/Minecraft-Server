# Minecraft Server Configuration
# This file contains deployment configuration for your Minecraft server

# Minecraft Version Configuration
# Update these values when you want to change the Minecraft version
MINECRAFT_VERSION="1.20.4"
MINECRAFT_JAR_URL="https://piston-data.mojang.com/v1/objects/8dd1a28015f51b1803213892b50b7b4fc76e594d/server.jar"

# Server Resource Configuration
MIN_RAM="2G"
MAX_RAM="4G"

# Server Directory (on Hetzner server)
SERVER_DIR="/home/deploy/minecraft-server"

# How to find the JAR URL for a new version:
# 1. Visit: https://www.minecraft.net/en-us/download/server
# 2. Right-click on the download link and copy the URL
# OR
# 3. Visit: https://launchermeta.mojang.com/mc/game/version_manifest.json
# 4. Find your desired version and get the server.jar URL from the version's JSON

# Example URLs for common versions:
# 1.20.4: https://piston-data.mojang.com/v1/objects/8dd1a28015f51b1803213892b50b7b4fc76e594d/server.jar
# 1.20.2: https://piston-data.mojang.com/v1/objects/5b868151bd02b41319f54c8d4061b8cae84e665c/server.jar
# 1.19.4: https://piston-data.mojang.com/v1/objects/8f3112a1049751cc472ec13e397eade5336ca7ae/server.jar
