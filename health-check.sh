#!/bin/bash
# Minecraft Server Health Check Script
# This script checks the health of the Minecraft server and can be used with monitoring systems

# Load configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/config.sh" ]; then
    source "$SCRIPT_DIR/config.sh"
else
    # Default configuration if config.sh is missing
    SERVER_DIR="/home/deploy/minecraft-server"
fi

# Default server port
SERVER_PORT="${SERVER_PORT:-25565}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall health status
HEALTH_STATUS=0
FAILED_CHECKS=()

echo "========================================="
echo "Minecraft Server Health Check"
echo "========================================="
echo ""

# Check 1: Systemd service status
echo -n "Checking systemd service status... "
if systemctl is-active --quiet minecraft.service; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${RED}✗ Not running${NC}"
    HEALTH_STATUS=1
    FAILED_CHECKS+=("Systemd service is not running")
fi

# Check 2: Server memory usage
echo -n "Checking server memory usage... "
if systemctl is-active --quiet minecraft.service; then
    # Get the PID of the Java process
    JAVA_PID=$(systemctl show -p MainPID --value minecraft.service)
    if [ -n "$JAVA_PID" ] && [ "$JAVA_PID" != "0" ]; then
        # Get memory usage in MB
        MEM_RSS=$(ps -p "$JAVA_PID" -o rss= 2>/dev/null | awk '{print int($1/1024)}')
        if [ -n "$MEM_RSS" ]; then
            echo -e "${GREEN}✓ Using ${MEM_RSS} MB${NC}"
            # Optional: warn if memory usage is very high (e.g., > 8GB)
            if [ "$MEM_RSS" -gt 8192 ]; then
                echo -e "  ${YELLOW}⚠ Warning: High memory usage${NC}"
            fi
        else
            echo -e "${YELLOW}⚠ Unable to determine${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Unable to get process ID${NC}"
    fi
else
    echo -e "${RED}✗ Service not running${NC}"
fi

# Check 3: Server port listening
echo -n "Checking if port $SERVER_PORT is listening... "
if command -v ss >/dev/null 2>&1; then
    if ss -ltn | grep -q ":$SERVER_PORT "; then
        echo -e "${GREEN}✓ Port $SERVER_PORT is listening${NC}"
    else
        echo -e "${RED}✗ Port $SERVER_PORT is not listening${NC}"
        HEALTH_STATUS=1
        FAILED_CHECKS+=("Server port $SERVER_PORT is not listening")
    fi
elif command -v netstat >/dev/null 2>&1; then
    if netstat -ltn | grep -q ":$SERVER_PORT "; then
        echo -e "${GREEN}✓ Port $SERVER_PORT is listening${NC}"
    else
        echo -e "${RED}✗ Port $SERVER_PORT is not listening${NC}"
        HEALTH_STATUS=1
        FAILED_CHECKS+=("Server port $SERVER_PORT is not listening")
    fi
else
    echo -e "${YELLOW}⚠ Unable to check (ss/netstat not found)${NC}"
fi

# Check 4: Plugins directory
echo -n "Checking plugins directory... "
PLUGINS_DIR="$SERVER_DIR/plugins"
if [ -d "$PLUGINS_DIR" ]; then
    JAR_COUNT=$(find "$PLUGINS_DIR" -maxdepth 1 -name "*.jar" -type f 2>/dev/null | wc -l)
    if [ "$JAR_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✓ Found $JAR_COUNT plugin(s)${NC}"
    else
        echo -e "${YELLOW}⚠ No JAR files found (server may run without plugins)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Plugins directory not found${NC}"
fi

# Summary
echo ""
echo "========================================="
if [ $HEALTH_STATUS -eq 0 ]; then
    echo -e "${GREEN}Overall Status: HEALTHY${NC}"
    echo "========================================="
    exit 0
else
    echo -e "${RED}Overall Status: UNHEALTHY${NC}"
    echo "========================================="
    echo ""
    echo "Failed checks:"
    for check in "${FAILED_CHECKS[@]}"; do
        echo "  - $check"
    done
    echo ""
    exit 1
fi
