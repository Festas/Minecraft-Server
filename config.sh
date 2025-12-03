#!/bin/bash
# Minecraft Paper Server Configuration
# This file contains deployment configuration for your Minecraft server

# Minecraft Version Configuration
# Update MINECRAFT_VERSION when you want to upgrade
# The latest Paper build for this version will be downloaded automatically
MINECRAFT_VERSION="1.20.4"

# Server Resource Configuration
MIN_RAM="2G"
MAX_RAM="4G"

# Server Directory (on Hetzner server)
SERVER_DIR="/home/deploy/minecraft-server"

# Paper Server Notes:
# - Paper is a high-performance fork of Spigot with better optimization and plugin support
# - The latest Paper build for the specified MINECRAFT_VERSION will be downloaded automatically
# - To update: Change MINECRAFT_VERSION above and redeploy
# - Check available versions at: https://papermc.io/downloads
