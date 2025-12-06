#!/bin/bash

################################################################################
# Ultimate RCON Sync & Diagnostics Script
################################################################################
#
# This script performs comprehensive RCON diagnostics and fixes for the
# Minecraft server and console setup.
#
# USAGE:
#   ./diagnose.sh [diagnose|fix]
#
# ENVIRONMENT VARIABLES (required):
#   RCON_PASSWORD - The RCON password to use for diagnostics/sync
#
# MODES:
#   diagnose - Run comprehensive diagnostics only (default)
#   fix      - Synchronize passwords and restart containers, then verify
#
# OUTPUT:
#   Creates timestamped directory: /tmp/rcon-diagnostics-YYYYMMDD-HHMMSS/
#   Contains detailed diagnostic logs and reports
#
# EXTENDING THIS SCRIPT:
#   1. Add new diagnostic sections to the run_diagnostics() function
#   2. Follow the existing pattern: clear section headers, tee to files
#   3. Update the SECTION count in comments if adding new sections
#   4. For fixes, add logic to sync_passwords() function
#   5. Test in both 'diagnose' and 'fix' modes
#
# DEBUGGING:
#   - Run locally: RCON_PASSWORD='your-pass' ./diagnose.sh diagnose
#   - Check output in /tmp/rcon-diagnostics-* directory
#   - Review individual section files for detailed info
#   - Enable bash debugging: bash -x ./diagnose.sh diagnose
#
################################################################################

set -e

# Define deployment directories
DEPLOY_DIR="/home/deploy/minecraft-server"
CONSOLE_DIR="/home/deploy/minecraft-console"
DIAGNOSTICS_DIR="/tmp/rcon-diagnostics-$(date +%Y%m%d-%H%M%S)"

# Create diagnostics directory
mkdir -p "$DIAGNOSTICS_DIR"

# Get action from command line argument (default: diagnose)
ACTION="${1:-diagnose}"

echo "============================================================"
echo "ULTIMATE RCON SYNC & DIAGNOSTICS"
echo "============================================================"
echo "Timestamp: $(date)"
echo "Action: ${ACTION}"
echo "Diagnostics directory: $DIAGNOSTICS_DIR"
echo "============================================================"
echo ""

################################################################################
# UTILITY FUNCTIONS
################################################################################

# Function to safely hash passwords (no newlines, consistent)
hash_password() {
  echo -n "$1" | sha256sum | cut -d' ' -f1
}

# Function to get password length safely
get_password_length() {
  echo -n "$1" | wc -c
}

################################################################################
# DIAGNOSTICS FUNCTION
################################################################################

# Function to run comprehensive diagnostics
# Argument: STAGE name (e.g., "pre-fix" or "post-fix")
run_diagnostics() {
  local STAGE="$1"
  local OUTPUT_PREFIX="${DIAGNOSTICS_DIR}/${STAGE}"

  echo "╔════════════════════════════════════════════════════════╗"
  echo "║  STAGE: ${STAGE} - COMPREHENSIVE DIAGNOSTICS          ║"
  echo "╔════════════════════════════════════════════════════════╗"
  echo ""

  # ========== SECTION 1: DOCKER COMPOSE CONFIGURATION ==========
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "SECTION 1: Docker Compose Configuration"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  echo "[Minecraft Server docker-compose.yml]"
  if [ -f "$DEPLOY_DIR/docker-compose.yml" ]; then
    tee "${OUTPUT_PREFIX}-server-docker-compose.yml" < "$DEPLOY_DIR/docker-compose.yml"
    echo ""
  else
    echo "⚠ docker-compose.yml not found at $DEPLOY_DIR" | tee "${OUTPUT_PREFIX}-server-docker-compose.yml"
    echo ""
  fi

  echo "[Console docker-compose.yml]"
  if [ -f "$CONSOLE_DIR/docker-compose.yml" ]; then
    tee "${OUTPUT_PREFIX}-console-docker-compose.yml" < "$CONSOLE_DIR/docker-compose.yml"
    echo ""
  else
    echo "⚠ docker-compose.yml not found at $CONSOLE_DIR" | tee "${OUTPUT_PREFIX}-console-docker-compose.yml"
    echo ""
  fi

  # ========== SECTION 2: CONTAINER ENVIRONMENT VARIABLES ==========
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "SECTION 2: Container Environment Variables (RCON-related)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  echo "[Minecraft Server Container Environment]"
  if docker ps --format '{{.Names}}' | grep -q '^minecraft-server$'; then
    docker exec minecraft-server env | grep -E "RCON|ENABLE" | sort | tee "${OUTPUT_PREFIX}-server-env.txt"
    echo ""
    echo "Full environment (redacted):"
    docker exec minecraft-server env | grep -v PASSWORD | grep -v SECRET | sort | tee "${OUTPUT_PREFIX}-server-env-full.txt"
    echo ""
  else
    echo "✗ minecraft-server container not running" | tee "${OUTPUT_PREFIX}-server-env.txt"
    echo ""
  fi

  echo "[Console Container Environment]"
  if docker ps --format '{{.Names}}' | grep -q '^minecraft-console$'; then
    docker exec minecraft-console env | grep -E "RCON|ADMIN|SESSION" | grep -v PASSWORD | grep -v SECRET | sort | tee "${OUTPUT_PREFIX}-console-env.txt"
    echo ""
    echo "Full environment (redacted):"
    docker exec minecraft-console env | grep -v PASSWORD | grep -v SECRET | sort | tee "${OUTPUT_PREFIX}-console-env-full.txt"
    echo ""
  else
    echo "✗ minecraft-console container not running" | tee "${OUTPUT_PREFIX}-console-env.txt"
    echo ""
  fi

  # ========== SECTION 3: .ENV AND SERVER.PROPERTIES FILES ==========
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "SECTION 3: Configuration Files (.env and server.properties)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  echo "[Minecraft Server .env file]"
  if [ -f "$DEPLOY_DIR/.env" ]; then
    # Redact password value, show structure
    sed 's/\(RCON_PASSWORD=\).*/\1[REDACTED]/' "$DEPLOY_DIR/.env" | tee "${OUTPUT_PREFIX}-server-env-file.txt"
    echo ""
  else
    echo "✗ .env file not found at $DEPLOY_DIR" | tee "${OUTPUT_PREFIX}-server-env-file.txt"
    echo ""
  fi

  echo "[Console .env file]"
  if [ -f "$CONSOLE_DIR/.env" ]; then
    # Redact passwords and secrets
    sed -E 's/(PASSWORD|SECRET)=.*/\1=[REDACTED]/' "$CONSOLE_DIR/.env" | tee "${OUTPUT_PREFIX}-console-env-file.txt"
    echo ""
  else
    echo "✗ .env file not found at $CONSOLE_DIR" | tee "${OUTPUT_PREFIX}-console-env-file.txt"
    echo ""
  fi

  echo "[Minecraft server.properties]"
  if docker ps --format '{{.Names}}' | grep -q '^minecraft-server$'; then
    if docker exec minecraft-server test -f /data/server.properties; then
      docker exec minecraft-server cat /data/server.properties | grep -E "rcon\.|enable-rcon" | sed 's/\(rcon.password=\).*/\1[REDACTED]/' | tee "${OUTPUT_PREFIX}-server-properties.txt"
      echo ""
    else
      echo "✗ server.properties not found in container" | tee "${OUTPUT_PREFIX}-server-properties.txt"
      echo ""
    fi
  else
    echo "✗ Cannot access server.properties (container not running)" | tee "${OUTPUT_PREFIX}-server-properties.txt"
    echo ""
  fi

  # ========== SECTION 4: DOCKER VOLUME MOUNTS ==========
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "SECTION 4: Docker Volume Mounts"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  echo "[Minecraft Server Volumes]"
  if docker ps -a --format '{{.Names}}' | grep -q '^minecraft-server$'; then
    docker inspect minecraft-server --format '{{range .Mounts}}Type: {{.Type}}, Source: {{.Source}}, Destination: {{.Destination}}, Mode: {{.Mode}}, RW: {{.RW}}{{"\n"}}{{end}}' | tee "${OUTPUT_PREFIX}-server-volumes.txt"
    echo ""
  else
    echo "✗ minecraft-server container not found" | tee "${OUTPUT_PREFIX}-server-volumes.txt"
    echo ""
  fi

  echo "[Console Volumes]"
  if docker ps -a --format '{{.Names}}' | grep -q '^minecraft-console$'; then
    docker inspect minecraft-console --format '{{range .Mounts}}Type: {{.Type}}, Source: {{.Source}}, Destination: {{.Destination}}, Mode: {{.Mode}}, RW: {{.RW}}{{"\n"}}{{end}}' | tee "${OUTPUT_PREFIX}-console-volumes.txt"
    echo ""
  else
    echo "✗ minecraft-console container not found" | tee "${OUTPUT_PREFIX}-console-volumes.txt"
    echo ""
  fi

  # ========== SECTION 5: CONTAINER LOGS ==========
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "SECTION 5: Recent Container Logs (last 100 lines)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  echo "[Minecraft Server Logs]"
  if docker ps --format '{{.Names}}' | grep -q '^minecraft-server$'; then
    docker logs minecraft-server --tail=100 2>&1 | tee "${OUTPUT_PREFIX}-server-logs.txt"
    echo ""
  else
    echo "✗ minecraft-server container not running" | tee "${OUTPUT_PREFIX}-server-logs.txt"
    echo ""
  fi

  echo "[Console Logs]"
  if docker ps --format '{{.Names}}' | grep -q '^minecraft-console$'; then
    docker logs minecraft-console --tail=100 2>&1 | tee "${OUTPUT_PREFIX}-console-logs.txt"
    echo ""
  else
    echo "✗ minecraft-console container not running" | tee "${OUTPUT_PREFIX}-console-logs.txt"
    echo ""
  fi

  # ========== SECTION 6: NETWORK CONNECTIVITY ==========
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "SECTION 6: Network TCP Check (Console → Server:25575)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  if docker ps --format '{{.Names}}' | grep -q '^minecraft-server$' && docker ps --format '{{.Names}}' | grep -q '^minecraft-console$'; then
    echo "Testing TCP connectivity from console to minecraft-server:25575..."
    if docker exec minecraft-console nc -zv minecraft-server 25575 2>&1 | tee "${OUTPUT_PREFIX}-network-tcp-check.txt"; then
      echo "✓ TCP connection successful"
    else
      echo "✗ TCP connection failed"
    fi
    echo ""

    echo "Testing port listening inside server container..."
    if docker exec minecraft-server netstat -tlnp 2>/dev/null | grep 25575 | tee -a "${OUTPUT_PREFIX}-network-tcp-check.txt"; then
      echo "✓ Port 25575 is listening"
    else
      echo "⚠ Port 25575 may not be listening"
    fi
    echo ""
  else
    echo "⊘ Skipped (one or both containers not running)" | tee "${OUTPUT_PREFIX}-network-tcp-check.txt"
    echo ""
  fi

  # ========== SECTION 7: RCON COMMAND TESTS ==========
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "SECTION 7: RCON Command Tests"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  echo "[rcon-cli test from minecraft-server container]"
  if docker ps --format '{{.Names}}' | grep -q '^minecraft-server$'; then
    if docker exec minecraft-server rcon-cli list 2>&1 | tee "${OUTPUT_PREFIX}-rcon-cli-test.txt"; then
      echo "✓ rcon-cli command successful"
    else
      echo "✗ rcon-cli command failed (authentication or connectivity issue)"
    fi
    echo ""
  else
    echo "⊘ Skipped (minecraft-server not running)" | tee "${OUTPUT_PREFIX}-rcon-cli-test.txt"
    echo ""
  fi

  echo "[rcon-client Node test from console container]"
  if docker ps --format '{{.Names}}' | grep -q '^minecraft-console$'; then
    # Try to execute a simple rcon test via console's Node.js environment
    echo "Attempting Node.js RCON client test..."
    if docker exec minecraft-console sh -c "command -v node >/dev/null 2>&1" 2>&1; then
      echo "Node.js is available in console container"
      # Check if console has rcon functionality
      docker exec minecraft-console sh -c "ls -la /app/services/rcon.js 2>/dev/null || echo 'RCON service file not found'" | tee "${OUTPUT_PREFIX}-rcon-node-test.txt"
    else
      echo "Node.js not found in console container" | tee "${OUTPUT_PREFIX}-rcon-node-test.txt"
    fi
    echo ""
  else
    echo "⊘ Skipped (minecraft-console not running)" | tee "${OUTPUT_PREFIX}-rcon-node-test.txt"
    echo ""
  fi

  # ========== SECTION 8: RCON-RELATED LOG LINES ==========
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "SECTION 8: RCON-Related Log Entries"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  echo "[Minecraft Server RCON log entries]"
  if docker ps --format '{{.Names}}' | grep -q '^minecraft-server$'; then
    docker logs minecraft-server 2>&1 | grep -i rcon | tail -50 | tee "${OUTPUT_PREFIX}-server-rcon-logs.txt" || echo "No RCON entries found"
    echo ""
  else
    echo "⊘ Skipped (container not running)" | tee "${OUTPUT_PREFIX}-server-rcon-logs.txt"
    echo ""
  fi

  echo "[Console RCON/connection log entries]"
  if docker ps --format '{{.Names}}' | grep -q '^minecraft-console$'; then
    docker logs minecraft-console 2>&1 | grep -iE "rcon|connection|auth" | tail -50 | tee "${OUTPUT_PREFIX}-console-rcon-logs.txt" || echo "No RCON entries found"
    echo ""
  else
    echo "⊘ Skipped (container not running)" | tee "${OUTPUT_PREFIX}-console-rcon-logs.txt"
    echo ""
  fi

  # ========== SECTION 9: PASSWORD ANALYSIS ==========
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "SECTION 9: Password Hash & Length Analysis (No Secrets Exposed)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  {
    echo "Password Source Analysis:"
    echo "========================="
    echo ""

    # GitHub/Input Secret
    SECRET_HASH=$(hash_password "${RCON_PASSWORD}")
    SECRET_LENGTH=$(get_password_length "${RCON_PASSWORD}")
    SECRET_MD5=$(echo -n "${RCON_PASSWORD}" | md5sum | cut -d' ' -f1)
    echo "1. GitHub Secret / Input Password:"
    echo "   SHA256: $SECRET_HASH"
    echo "   MD5:    $SECRET_MD5"
    echo "   Length: $SECRET_LENGTH characters"
    echo ""

    # Server .env file
    if [ -f "$DEPLOY_DIR/.env" ]; then
      SERVER_ENV_VALUE=$(grep "^RCON_PASSWORD=" "$DEPLOY_DIR/.env" 2>/dev/null | cut -d'=' -f2- | sed 's/^"\(.*\)"$/\1/' | tr -d '\r\n')
      if [ -n "$SERVER_ENV_VALUE" ]; then
        SERVER_ENV_HASH=$(hash_password "$SERVER_ENV_VALUE")
        SERVER_ENV_LENGTH=$(get_password_length "$SERVER_ENV_VALUE")
        SERVER_ENV_MD5=$(echo -n "$SERVER_ENV_VALUE" | md5sum | cut -d' ' -f1)
        echo "2. Server .env File:"
        echo "   SHA256: $SERVER_ENV_HASH"
        echo "   MD5:    $SERVER_ENV_MD5"
        echo "   Length: $SERVER_ENV_LENGTH characters"
        echo "   Match with secret: $([ "$SERVER_ENV_HASH" = "$SECRET_HASH" ] && echo "✓ YES" || echo "✗ NO")"
      else
        echo "2. Server .env File: ✗ RCON_PASSWORD not found or empty"
      fi
    else
      echo "2. Server .env File: ✗ File not found"
    fi
    echo ""

    # Console .env file
    if [ -f "$CONSOLE_DIR/.env" ]; then
      CONSOLE_ENV_VALUE=$(grep "^RCON_PASSWORD=" "$CONSOLE_DIR/.env" 2>/dev/null | cut -d'=' -f2- | sed 's/^"\(.*\)"$/\1/' | tr -d '\r\n')
      if [ -n "$CONSOLE_ENV_VALUE" ]; then
        CONSOLE_ENV_HASH=$(hash_password "$CONSOLE_ENV_VALUE")
        CONSOLE_ENV_LENGTH=$(get_password_length "$CONSOLE_ENV_VALUE")
        CONSOLE_ENV_MD5=$(echo -n "$CONSOLE_ENV_VALUE" | md5sum | cut -d' ' -f1)
        echo "3. Console .env File:"
        echo "   SHA256: $CONSOLE_ENV_HASH"
        echo "   MD5:    $CONSOLE_ENV_MD5"
        echo "   Length: $CONSOLE_ENV_LENGTH characters"
        echo "   Match with secret: $([ "$CONSOLE_ENV_HASH" = "$SECRET_HASH" ] && echo "✓ YES" || echo "✗ NO")"
      else
        echo "3. Console .env File: ✗ RCON_PASSWORD not found or empty"
      fi
    else
      echo "3. Console .env File: ✗ File not found"
    fi
    echo ""

    # Server container environment
    if docker ps --format '{{.Names}}' | grep -q '^minecraft-server$'; then
      SERVER_CONTAINER_VALUE=$(docker exec minecraft-server printenv RCON_PASSWORD 2>/dev/null || echo "")
      if [ -n "$SERVER_CONTAINER_VALUE" ]; then
        SERVER_CONTAINER_HASH=$(hash_password "$SERVER_CONTAINER_VALUE")
        SERVER_CONTAINER_LENGTH=$(get_password_length "$SERVER_CONTAINER_VALUE")
        SERVER_CONTAINER_MD5=$(echo -n "$SERVER_CONTAINER_VALUE" | md5sum | cut -d' ' -f1)
        echo "4. Server Container Environment:"
        echo "   SHA256: $SERVER_CONTAINER_HASH"
        echo "   MD5:    $SERVER_CONTAINER_MD5"
        echo "   Length: $SERVER_CONTAINER_LENGTH characters"
        echo "   Match with secret: $([ "$SERVER_CONTAINER_HASH" = "$SECRET_HASH" ] && echo "✓ YES" || echo "✗ NO")"
      else
        echo "4. Server Container Environment: ✗ RCON_PASSWORD not found"
      fi
    else
      echo "4. Server Container Environment: ⊘ Container not running"
    fi
    echo ""

    # Console container environment
    if docker ps --format '{{.Names}}' | grep -q '^minecraft-console$'; then
      CONSOLE_CONTAINER_VALUE=$(docker exec minecraft-console printenv RCON_PASSWORD 2>/dev/null || echo "")
      if [ -n "$CONSOLE_CONTAINER_VALUE" ]; then
        CONSOLE_CONTAINER_HASH=$(hash_password "$CONSOLE_CONTAINER_VALUE")
        CONSOLE_CONTAINER_LENGTH=$(get_password_length "$CONSOLE_CONTAINER_VALUE")
        CONSOLE_CONTAINER_MD5=$(echo -n "$CONSOLE_CONTAINER_VALUE" | md5sum | cut -d' ' -f1)
        echo "5. Console Container Environment:"
        echo "   SHA256: $CONSOLE_CONTAINER_HASH"
        echo "   MD5:    $CONSOLE_CONTAINER_MD5"
        echo "   Length: $CONSOLE_CONTAINER_LENGTH characters"
        echo "   Match with secret: $([ "$CONSOLE_CONTAINER_HASH" = "$SECRET_HASH" ] && echo "✓ YES" || echo "✗ NO")"
      else
        echo "5. Console Container Environment: ✗ RCON_PASSWORD not found"
      fi
    else
      echo "5. Console Container Environment: ⊘ Container not running"
    fi
    echo ""

    # Server.properties file
    if docker ps --format '{{.Names}}' | grep -q '^minecraft-server$'; then
      if docker exec minecraft-server test -f /data/server.properties; then
        SERVER_PROPS_VALUE=$(docker exec minecraft-server grep "^rcon.password=" /data/server.properties 2>/dev/null | cut -d'=' -f2- | tr -d '\r\n' || echo "")
        if [ -n "$SERVER_PROPS_VALUE" ]; then
          SERVER_PROPS_HASH=$(hash_password "$SERVER_PROPS_VALUE")
          SERVER_PROPS_LENGTH=$(get_password_length "$SERVER_PROPS_VALUE")
          SERVER_PROPS_MD5=$(echo -n "$SERVER_PROPS_VALUE" | md5sum | cut -d' ' -f1)
          echo "6. server.properties File:"
          echo "   SHA256: $SERVER_PROPS_HASH"
          echo "   MD5:    $SERVER_PROPS_MD5"
          echo "   Length: $SERVER_PROPS_LENGTH characters"
          echo "   Match with secret: $([ "$SERVER_PROPS_HASH" = "$SECRET_HASH" ] && echo "✓ YES" || echo "✗ NO")"
        else
          echo "6. server.properties File: ✗ rcon.password not found or empty"
        fi
      else
        echo "6. server.properties File: ✗ File not found"
      fi
    else
      echo "6. server.properties File: ⊘ Container not running"
    fi
    echo ""

    echo "================================================"
    echo "CONSISTENCY CHECK"
    echo "================================================"
    # Check if all non-empty hashes match
    ALL_MATCH=true
    if [ -n "$SERVER_ENV_VALUE" ] && [ "$SERVER_ENV_HASH" != "$SECRET_HASH" ]; then
      ALL_MATCH=false
      echo "✗ Server .env does NOT match secret"
    fi
    if [ -n "$CONSOLE_ENV_VALUE" ] && [ "$CONSOLE_ENV_HASH" != "$SECRET_HASH" ]; then
      ALL_MATCH=false
      echo "✗ Console .env does NOT match secret"
    fi
    if [ -n "$SERVER_CONTAINER_VALUE" ] && [ "$SERVER_CONTAINER_HASH" != "$SECRET_HASH" ]; then
      ALL_MATCH=false
      echo "✗ Server container env does NOT match secret"
    fi
    if [ -n "$CONSOLE_CONTAINER_VALUE" ] && [ "$CONSOLE_CONTAINER_HASH" != "$SECRET_HASH" ]; then
      ALL_MATCH=false
      echo "✗ Console container env does NOT match secret"
    fi
    if [ -n "$SERVER_PROPS_VALUE" ] && [ "$SERVER_PROPS_HASH" != "$SECRET_HASH" ]; then
      ALL_MATCH=false
      echo "✗ server.properties does NOT match secret"
    fi

    if [ "$ALL_MATCH" = true ]; then
      echo "✓ ALL PASSWORDS MATCH!"
    else
      echo ""
      echo "⚠ PASSWORD MISMATCH DETECTED - Run 'fix' mode to synchronize"
    fi
  } | tee "${OUTPUT_PREFIX}-password-analysis.txt"
  echo ""

  # ========== SECTION 10: CONTAINER STATUS SUMMARY ==========
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "SECTION 10: Container Status Summary"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  {
    echo "Docker Containers:"
    docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" --filter "name=minecraft"
    echo ""
    echo "Docker Networks:"
    docker network ls | grep -E "NETWORK|caddy"
    echo ""
    echo "Caddy Network Details:"
    if docker network inspect caddy-network >/dev/null 2>&1; then
      docker network inspect caddy-network --format '{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{"\n"}}{{end}}'
    else
      echo "✗ caddy-network not found"
    fi
  } | tee "${OUTPUT_PREFIX}-container-status.txt"
  echo ""

  echo "╔════════════════════════════════════════════════════════╗"
  echo "║  DIAGNOSTICS COMPLETE - Stage: ${STAGE}               ║"
  echo "╔════════════════════════════════════════════════════════╗"
  echo ""
}

################################################################################
# PASSWORD SYNCHRONIZATION FUNCTION
################################################################################

# Function to synchronize passwords across all components
sync_passwords() {
  echo "╔════════════════════════════════════════════════════════╗"
  echo "║  SYNCHRONIZING RCON PASSWORDS                          ║"
  echo "╔════════════════════════════════════════════════════════╗"
  echo ""

  echo "This will update RCON_PASSWORD in all locations to match the provided secret/input."
  echo ""

  # Step 1: Update Minecraft server .env
  echo "Step 1: Updating Minecraft server .env..."
  cd "$DEPLOY_DIR"
  printf 'RCON_PASSWORD=%s\n' "${RCON_PASSWORD}" > .env
  chmod 600 .env
  echo "✓ Minecraft server .env updated"
  echo ""

  # Step 2: Update Console .env
  echo "Step 2: Updating Console .env..."
  cd "$CONSOLE_DIR"
  if [ -f .env ]; then
    # Preserve other variables, update only RCON_PASSWORD
    grep -v "^RCON_PASSWORD=" .env > .env.tmp || true
    printf 'RCON_PASSWORD=%s\n' "${RCON_PASSWORD}" >> .env.tmp
    mv .env.tmp .env
    chmod 600 .env
    echo "✓ Console .env updated"
  else
    echo "✗ Console .env not found - creating with RCON_PASSWORD only"
    printf 'RCON_PASSWORD=%s\n' "${RCON_PASSWORD}" > .env
    chmod 600 .env
  fi
  echo ""

  # Step 3: Update docker-compose.yml with escaped password
  echo "Step 3: Updating docker-compose.yml with escaped password..."
  cd "$DEPLOY_DIR"
  if [ -f docker-compose.yml ]; then
    # Escape $ as $$ for Docker Compose
    ESCAPED_RCON_PASSWORD=$(printf '%s' "${RCON_PASSWORD}" | sed 's/\$/\$\$/g')

    # Update RCON_PASSWORD line in docker-compose.yml using awk for safer handling
    awk -v pwd="${ESCAPED_RCON_PASSWORD}" '
      /RCON_PASSWORD:/ { print "                  RCON_PASSWORD: \"" pwd "\""; next }
      { print }
    ' docker-compose.yml > docker-compose.yml.tmp && mv docker-compose.yml.tmp docker-compose.yml
    echo "✓ docker-compose.yml updated with escaped password"
  else
    echo "⚠ docker-compose.yml not found at $DEPLOY_DIR"
  fi
  echo ""

  # Step 4: Force recreate Minecraft server container
  echo "Step 4: Recreating Minecraft server container to apply new password..."
  cd "$DEPLOY_DIR"
  docker compose up -d --force-recreate minecraft-server

  echo "Waiting for Minecraft server to become healthy..."
  for i in $(seq 1 60); do
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' minecraft-server 2>/dev/null || echo "starting")
    if [ "$HEALTH" = "healthy" ]; then
      echo "✓ Minecraft server is healthy"
      break
    fi
    echo "  Status: $HEALTH (attempt $i/60)"
    sleep 2
  done
  echo ""

  # Step 5: Force recreate Console container
  echo "Step 5: Recreating Console container to apply new password..."
  cd "$CONSOLE_DIR"
  docker compose up -d --force-recreate minecraft-console

  echo "Waiting for console to become healthy..."
  for i in $(seq 1 30); do
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' minecraft-console 2>/dev/null || echo "starting")
    if [ "$HEALTH" = "healthy" ]; then
      echo "✓ Console is healthy"
      break
    fi
    echo "  Status: $HEALTH (attempt $i/30)"
    sleep 2
  done
  echo ""

  echo "╔════════════════════════════════════════════════════════╗"
  echo "║  PASSWORD SYNCHRONIZATION COMPLETE                     ║"
  echo "╔════════════════════════════════════════════════════════╗"
  echo ""
}

################################################################################
# MAIN EXECUTION
################################################################################

# Main execution based on action
case "${ACTION}" in
  diagnose)
    echo "═══════════════════════════════════════════════════════════"
    echo "RUNNING DIAGNOSTICS MODE"
    echo "═══════════════════════════════════════════════════════════"
    echo ""

    run_diagnostics "pre-fix"

    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "DIAGNOSTICS COMPLETE"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "All diagnostic files have been saved to: $DIAGNOSTICS_DIR"
    echo ""
    echo "Next steps:"
    echo "  - Review the output above for any ✗ or ⚠ indicators"
    echo "  - Check password hash mismatches in Section 9"
    echo "  - If passwords don't match, run this workflow with action='fix'"
    echo "  - Download diagnostics directory for offline analysis"
    ;;

  fix)
    echo "═══════════════════════════════════════════════════════════"
    echo "RUNNING FIX MODE"
    echo "═══════════════════════════════════════════════════════════"
    echo ""

    echo "Phase 1: Pre-fix diagnostics..."
    run_diagnostics "pre-fix"
    echo ""

    echo "Phase 2: Synchronizing passwords..."
    sync_passwords
    echo ""

    echo "Phase 3: Post-fix diagnostics and verification..."
    run_diagnostics "post-fix"
    echo ""

    echo "Phase 4: Verification test..."
    cd "$DEPLOY_DIR"
    echo "Testing RCON command execution..."
    if docker exec minecraft-server rcon-cli list 2>&1; then
      echo ""
      echo "✓✓✓ SUCCESS! RCON is working correctly! ✓✓✓"
    else
      echo ""
      echo "⚠⚠⚠ WARNING: RCON test failed after fix ⚠⚠⚠"
      echo "Check the logs above for errors."
    fi
    echo ""

    echo "═══════════════════════════════════════════════════════════"
    echo "FIX COMPLETE"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "All diagnostic files (pre and post fix) saved to: $DIAGNOSTICS_DIR"
    echo ""
    echo "What was changed:"
    echo "  ✓ Server .env updated with new RCON_PASSWORD"
    echo "  ✓ Console .env updated with new RCON_PASSWORD"
    echo "  ✓ Server docker-compose.yml updated (with escaped password)"
    echo "  ✓ Both containers recreated to apply changes"
    echo ""
    echo "Next steps:"
    echo "  - Review the post-fix diagnostics above"
    echo "  - Verify RCON connectivity from console UI"
    echo "  - Test console commands work correctly"
    echo "  - Download diagnostics for records"
    ;;

  *)
    echo "✗ Unknown action: ${ACTION}"
    echo "Valid actions: diagnose, fix"
    exit 1
    ;;
esac

################################################################################
# CREATE SUMMARY FILE
################################################################################

{
  echo "ULTIMATE RCON SYNC & DIAGNOSTICS - SUMMARY"
  echo "=========================================="
  echo ""
  echo "Timestamp: $(date)"
  echo "Action: ${ACTION}"
  echo "Diagnostics directory: $DIAGNOSTICS_DIR"
  echo ""
  echo "Files created:"
  # shellcheck disable=SC2012
  ls -lh "$DIAGNOSTICS_DIR" 2>/dev/null | tail -n +2 || echo "No files created"
  echo ""
  echo "Total size:"
  du -sh "$DIAGNOSTICS_DIR" 2>/dev/null || echo "N/A"
} | tee "${DIAGNOSTICS_DIR}/SUMMARY.txt"

echo ""
echo "============================================================"
echo "Diagnostics directory: $DIAGNOSTICS_DIR"
echo "============================================================"

# Exit with success
exit 0
