#!/bin/bash

################################################################################
# Plugin Manager Diagnostics and Auto-Fix Script
################################################################################
#
# This script performs comprehensive diagnostics and auto-fixes for the
# Minecraft server plugin manager in the console application.
#
# USAGE:
#   ./diagnose-plugins.sh [diagnose|fix]
#
# MODES:
#   diagnose - Run diagnostics only (default)
#   fix      - Run diagnostics and auto-fix issues
#
# OUTPUT:
#   Creates timestamped directory: /tmp/plugin-diagnostics-YYYYMMDD-HHMMSS/
#   Contains detailed diagnostic logs and reports
#
# FEATURES:
#   - Checks plugins.json existence and validity
#   - Validates JSON syntax
#   - Checks plugins directory presence and permissions
#   - Validates plugin-history.json
#   - Tests API backend reachability
#   - Auto-fixes missing or corrupt files
#   - Fixes directory permission problems
#
################################################################################

set +e  # Disable exit on error - diagnostics must continue even when errors are found to provide complete reports

# Determine paths based on environment
if [ -d "/home/deploy/minecraft-server" ]; then
    # Production environment
    BASE_DIR="/home/deploy/minecraft-server"
    CONSOLE_DIR="/home/deploy/minecraft-console"
else
    # Development/CI environment
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    BASE_DIR="$(dirname "$SCRIPT_DIR")"
    CONSOLE_DIR="$BASE_DIR/console"
fi

# Define paths
PLUGINS_JSON="$BASE_DIR/plugins.json"
PLUGINS_DIR="$BASE_DIR/plugins"
BACKEND_DIR="$CONSOLE_DIR/backend"
HISTORY_FILE="$BACKEND_DIR/data/plugin-history.json"
DIAGNOSTICS_DIR="/tmp/plugin-diagnostics-$(date +%Y%m%d-%H%M%S)"

# API endpoint (default to localhost, can be overridden)
API_HOST="${API_HOST:-localhost}"
API_PORT="${API_PORT:-3001}"
API_BASE_URL="http://${API_HOST}:${API_PORT}/api/plugins"

# Create diagnostics directory
mkdir -p "$DIAGNOSTICS_DIR"

# Get action from command line argument (default: diagnose)
ACTION="${1:-diagnose}"

# Counters for reporting
ISSUES_FOUND=0
ISSUES_FIXED=0
ISSUES_MANUAL=0

echo "============================================================"
echo "PLUGIN MANAGER DIAGNOSTICS"
echo "============================================================"
echo "Timestamp: $(date)"
echo "Action: ${ACTION}"
echo "Base Directory: $BASE_DIR"
echo "Diagnostics Directory: $DIAGNOSTICS_DIR"
echo "============================================================"
echo ""

################################################################################
# UTILITY FUNCTIONS
################################################################################

# Function to log issues
log_issue() {
    local severity="$1"
    local message="$2"
    echo "[$severity] $message" | tee -a "$DIAGNOSTICS_DIR/issues.log"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
}

# Function to log fixes
log_fix() {
    local message="$1"
    echo "[FIXED] $message" | tee -a "$DIAGNOSTICS_DIR/fixes.log"
    ISSUES_FIXED=$((ISSUES_FIXED + 1))
}

# Function to log manual actions needed
log_manual() {
    local message="$1"
    echo "[MANUAL] $message" | tee -a "$DIAGNOSTICS_DIR/manual-actions.log"
    ISSUES_MANUAL=$((ISSUES_MANUAL + 1))
}

# Function to validate JSON
validate_json() {
    local file="$1"
    if command -v jq &> /dev/null; then
        jq empty "$file" 2>&1
        return $?
    elif command -v python3 &> /dev/null; then
        python3 -c "import json; json.load(open('$file'))" 2>&1
        return $?
    elif command -v node &> /dev/null; then
        node -e "require('fs').readFileSync('$file', 'utf8'); JSON.parse(require('fs').readFileSync('$file', 'utf8'))" 2>&1
        return $?
    else
        echo "Warning: No JSON validator available (jq, python3, or node)"
        return 0
    fi
}

################################################################################
# DIAGNOSTIC SECTIONS
################################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 1: plugins.json File Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

{
    echo "Checking plugins.json at: $PLUGINS_JSON"
    echo ""
    
    # Check if file exists
    if [ ! -f "$PLUGINS_JSON" ]; then
        log_issue "ERROR" "plugins.json does not exist at $PLUGINS_JSON"
        
        if [ "$ACTION" = "fix" ]; then
            echo "Creating plugins.json with empty structure..."
            cat > "$PLUGINS_JSON" << 'EOF'
{
  "plugins": []
}
EOF
            log_fix "Created plugins.json with empty plugin list"
        else
            log_manual "Run with 'fix' mode to create plugins.json"
        fi
    else
        echo "✓ plugins.json exists"
        
        # Check if file is empty
        if [ ! -s "$PLUGINS_JSON" ]; then
            log_issue "ERROR" "plugins.json is empty"
            
            if [ "$ACTION" = "fix" ]; then
                # Backup empty file
                cp "$PLUGINS_JSON" "$PLUGINS_JSON.empty-backup-$(date +%Y%m%d-%H%M%S)"
                echo "Creating plugins.json with proper structure..."
                cat > "$PLUGINS_JSON" << 'EOF'
{
  "plugins": []
}
EOF
                log_fix "Replaced empty plugins.json with valid structure"
            else
                log_manual "Run with 'fix' mode to create proper structure"
            fi
        else
            echo "✓ plugins.json is not empty"
            
            # Validate JSON syntax
            echo "Validating JSON syntax..."
            ERROR_OUTPUT=$(validate_json "$PLUGINS_JSON" 2>&1)
            VALIDATION_EXIT_CODE=$?
            if [ $VALIDATION_EXIT_CODE -ne 0 ]; then
                log_issue "ERROR" "plugins.json has invalid JSON syntax"
                echo "Parse error: $ERROR_OUTPUT"
                
                if [ "$ACTION" = "fix" ]; then
                    # Backup corrupt file
                    BACKUP_FILE="$PLUGINS_JSON.corrupt-backup-$(date +%Y%m%d-%H%M%S)"
                    cp "$PLUGINS_JSON" "$BACKUP_FILE"
                    echo "Backed up corrupt file to: $BACKUP_FILE"
                    
                    # Create fresh file
                    cat > "$PLUGINS_JSON" << 'EOF'
{
  "plugins": []
}
EOF
                    log_fix "Replaced corrupt plugins.json with valid structure (backup saved)"
                else
                    log_manual "Run with 'fix' mode to replace corrupt file (will be backed up)"
                fi
            else
                echo "✓ JSON syntax is valid"
                
                # Check structure
                if command -v jq &> /dev/null; then
                    if ! jq -e '.plugins' "$PLUGINS_JSON" > /dev/null 2>&1; then
                        log_issue "ERROR" "plugins.json missing 'plugins' array"
                        
                        if [ "$ACTION" = "fix" ]; then
                            BACKUP_FILE="$PLUGINS_JSON.invalid-structure-backup-$(date +%Y%m%d-%H%M%S)"
                            cp "$PLUGINS_JSON" "$BACKUP_FILE"
                            cat > "$PLUGINS_JSON" << 'EOF'
{
  "plugins": []
}
EOF
                            log_fix "Fixed plugins.json structure (backup saved)"
                        else
                            log_manual "Run with 'fix' mode to fix structure"
                        fi
                    else
                        echo "✓ plugins.json has correct structure"
                        PLUGIN_COUNT=$(jq '.plugins | length' "$PLUGINS_JSON")
                        echo "  Plugins defined: $PLUGIN_COUNT"
                    fi
                fi
            fi
        fi
        
        # Display file permissions
        echo ""
        echo "File permissions:"
        ls -lh "$PLUGINS_JSON"
    fi
} | tee "$DIAGNOSTICS_DIR/01-plugins-json.log"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 2: Plugins Directory Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

{
    echo "Checking plugins directory at: $PLUGINS_DIR"
    echo ""
    
    # Check if directory exists
    if [ ! -d "$PLUGINS_DIR" ]; then
        log_issue "ERROR" "plugins directory does not exist at $PLUGINS_DIR"
        
        if [ "$ACTION" = "fix" ]; then
            echo "Creating plugins directory..."
            mkdir -p "$PLUGINS_DIR"
            chmod 755 "$PLUGINS_DIR"
            log_fix "Created plugins directory with permissions 755"
        else
            log_manual "Run with 'fix' mode to create plugins directory"
        fi
    else
        echo "✓ plugins directory exists"
        
        # Check permissions
        echo "Checking directory permissions..."
        
        # Check if readable
        if [ ! -r "$PLUGINS_DIR" ]; then
            log_issue "ERROR" "plugins directory is not readable"
            
            if [ "$ACTION" = "fix" ]; then
                chmod u+r "$PLUGINS_DIR"
                log_fix "Made plugins directory readable"
            else
                log_manual "Run with 'fix' mode to fix permissions"
            fi
        else
            echo "✓ Directory is readable"
        fi
        
        # Check if writable
        if [ ! -w "$PLUGINS_DIR" ]; then
            log_issue "ERROR" "plugins directory is not writable"
            
            if [ "$ACTION" = "fix" ]; then
                chmod u+w "$PLUGINS_DIR"
                log_fix "Made plugins directory writable"
            else
                log_manual "Run with 'fix' mode to fix permissions"
            fi
        else
            echo "✓ Directory is writable"
        fi
        
        # Check if executable (needed to list contents)
        if [ ! -x "$PLUGINS_DIR" ]; then
            log_issue "ERROR" "plugins directory is not executable"
            
            if [ "$ACTION" = "fix" ]; then
                chmod u+x "$PLUGINS_DIR"
                log_fix "Made plugins directory executable"
            else
                log_manual "Run with 'fix' mode to fix permissions"
            fi
        else
            echo "✓ Directory is executable"
        fi
        
        # Display directory info
        echo ""
        echo "Directory permissions:"
        ls -ldh "$PLUGINS_DIR"
        
        echo ""
        echo "Plugin files (.jar):"
        if ls "$PLUGINS_DIR"/*.jar &> /dev/null; then
            ls -lh "$PLUGINS_DIR"/*.jar | wc -l | xargs echo "  Total JAR files:"
            ls -lh "$PLUGINS_DIR"/*.jar | head -10
            JAR_COUNT=$(ls "$PLUGINS_DIR"/*.jar 2>/dev/null | wc -l)
            if [ "$JAR_COUNT" -gt 10 ]; then
                echo "  ... and $((JAR_COUNT - 10)) more"
            fi
        else
            echo "  No JAR files found"
        fi
        
        # Check for .jar.backup files
        echo ""
        echo "Backup files (.jar.backup):"
        if ls "$PLUGINS_DIR"/*.jar.backup &> /dev/null; then
            ls -lh "$PLUGINS_DIR"/*.jar.backup | wc -l | xargs echo "  Total backup files:"
        else
            echo "  No backup files found"
        fi
    fi
} | tee "$DIAGNOSTICS_DIR/02-plugins-directory.log"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 3: plugin-history.json Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

{
    echo "Checking plugin-history.json at: $HISTORY_FILE"
    echo ""
    
    # Check if backend data directory exists
    HISTORY_DIR="$(dirname "$HISTORY_FILE")"
    if [ ! -d "$HISTORY_DIR" ]; then
        log_issue "ERROR" "Backend data directory does not exist: $HISTORY_DIR"
        
        if [ "$ACTION" = "fix" ]; then
            echo "Creating backend data directory..."
            mkdir -p "$HISTORY_DIR"
            chmod 755 "$HISTORY_DIR"
            log_fix "Created backend data directory"
        else
            log_manual "Run with 'fix' mode to create backend data directory"
        fi
    fi
    
    # Check if file exists
    if [ ! -f "$HISTORY_FILE" ]; then
        log_issue "WARNING" "plugin-history.json does not exist"
        
        if [ "$ACTION" = "fix" ]; then
            echo "Creating plugin-history.json with empty array..."
            echo "[]" > "$HISTORY_FILE"
            chmod 644 "$HISTORY_FILE"
            log_fix "Created plugin-history.json with empty history"
        else
            log_manual "Run with 'fix' mode to create plugin-history.json"
        fi
    else
        echo "✓ plugin-history.json exists"
        
        # Check if file is empty
        if [ ! -s "$HISTORY_FILE" ]; then
            log_issue "WARNING" "plugin-history.json is empty"
            
            if [ "$ACTION" = "fix" ]; then
                echo "Initializing plugin-history.json..."
                echo "[]" > "$HISTORY_FILE"
                log_fix "Initialized empty plugin-history.json"
            else
                log_manual "Run with 'fix' mode to initialize file"
            fi
        else
            echo "✓ plugin-history.json is not empty"
            
            # Validate JSON syntax
            echo "Validating JSON syntax..."
            ERROR_OUTPUT=$(validate_json "$HISTORY_FILE" 2>&1)
            VALIDATION_EXIT_CODE=$?
            if [ $VALIDATION_EXIT_CODE -ne 0 ]; then
                log_issue "ERROR" "plugin-history.json has invalid JSON syntax"
                echo "Parse error: $ERROR_OUTPUT"
                
                if [ "$ACTION" = "fix" ]; then
                    # Backup corrupt file
                    BACKUP_FILE="$HISTORY_FILE.corrupt-backup-$(date +%Y%m%d-%H%M%S)"
                    cp "$HISTORY_FILE" "$BACKUP_FILE"
                    echo "Backed up corrupt file to: $BACKUP_FILE"
                    
                    # Create fresh file
                    echo "[]" > "$HISTORY_FILE"
                    log_fix "Replaced corrupt plugin-history.json (backup saved)"
                else
                    log_manual "Run with 'fix' mode to replace corrupt file"
                fi
            else
                echo "✓ JSON syntax is valid"
                
                # Check if it's an array
                if command -v jq &> /dev/null; then
                    if ! jq -e 'type == "array"' "$HISTORY_FILE" > /dev/null 2>&1; then
                        log_issue "ERROR" "plugin-history.json is not an array"
                        
                        if [ "$ACTION" = "fix" ]; then
                            BACKUP_FILE="$HISTORY_FILE.invalid-type-backup-$(date +%Y%m%d-%H%M%S)"
                            cp "$HISTORY_FILE" "$BACKUP_FILE"
                            echo "[]" > "$HISTORY_FILE"
                            log_fix "Fixed plugin-history.json type (backup saved)"
                        else
                            log_manual "Run with 'fix' mode to fix file type"
                        fi
                    else
                        echo "✓ plugin-history.json is an array"
                        HISTORY_COUNT=$(jq '. | length' "$HISTORY_FILE")
                        echo "  History entries: $HISTORY_COUNT"
                    fi
                fi
            fi
        fi
        
        # Display file permissions
        echo ""
        echo "File permissions:"
        ls -lh "$HISTORY_FILE"
    fi
} | tee "$DIAGNOSTICS_DIR/03-plugin-history.log"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 4: API Backend Reachability"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

{
    echo "Testing API backend at: $API_BASE_URL"
    echo ""
    
    # Test health endpoint
    echo "Testing /health endpoint..."
    HEALTH_URL="${API_BASE_URL}/health"
    
    if command -v curl &> /dev/null; then
        HTTP_CODE=$(curl -s -o "$DIAGNOSTICS_DIR/health-response.json" -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
        
        if [ "$HTTP_CODE" = "000" ] || [ "$HTTP_CODE" = "000000" ]; then
            log_issue "ERROR" "Cannot connect to API backend at $HEALTH_URL"
            echo "  This could mean:"
            echo "  - Backend is not running"
            echo "  - Wrong host/port (current: ${API_HOST}:${API_PORT})"
            echo "  - Network connectivity issue"
            log_manual "Start the backend or check API_HOST/API_PORT environment variables"
        elif [ "$HTTP_CODE" = "200" ]; then
            echo "✓ API backend is healthy (HTTP $HTTP_CODE)"
            if [ -f "$DIAGNOSTICS_DIR/health-response.json" ]; then
                echo ""
                echo "Health response:"
                cat "$DIAGNOSTICS_DIR/health-response.json"
                if command -v jq &> /dev/null; then
                    echo ""
                    jq '.' "$DIAGNOSTICS_DIR/health-response.json" || cat "$DIAGNOSTICS_DIR/health-response.json"
                fi
            fi
        elif [ "$HTTP_CODE" = "503" ]; then
            log_issue "WARNING" "API backend is unhealthy (HTTP $HTTP_CODE)"
            echo "Backend is running but reports unhealthy status"
            if [ -f "$DIAGNOSTICS_DIR/health-response.json" ]; then
                echo ""
                echo "Health response:"
                cat "$DIAGNOSTICS_DIR/health-response.json"
                if command -v jq &> /dev/null; then
                    echo ""
                    jq '.' "$DIAGNOSTICS_DIR/health-response.json" || cat "$DIAGNOSTICS_DIR/health-response.json"
                fi
            fi
            log_manual "Review health response and fix reported issues"
        else
            log_issue "WARNING" "Unexpected response from API backend (HTTP $HTTP_CODE)"
            if [ -f "$DIAGNOSTICS_DIR/health-response.json" ]; then
                cat "$DIAGNOSTICS_DIR/health-response.json"
            fi
        fi
    else
        log_issue "WARNING" "curl not available, cannot test API backend"
        log_manual "Install curl to enable API testing"
    fi
    
    echo ""
    echo "Testing /api/plugins endpoint..."
    PLUGINS_URL="http://${API_HOST}:${API_PORT}/api/plugins"
    
    if command -v curl &> /dev/null; then
        # Note: This will fail without auth, but we can check if the endpoint responds
        HTTP_CODE=$(curl -s -o "$DIAGNOSTICS_DIR/plugins-response.txt" -w "%{http_code}" "$PLUGINS_URL" 2>/dev/null || echo "000")
        
        if [ "$HTTP_CODE" = "000" ] || [ "$HTTP_CODE" = "000000" ]; then
            log_issue "ERROR" "Cannot connect to plugins endpoint at $PLUGINS_URL"
        elif [ "$HTTP_CODE" = "401" ]; then
            echo "✓ Plugins endpoint responds (HTTP $HTTP_CODE - auth required, as expected)"
        elif [ "$HTTP_CODE" = "200" ]; then
            echo "✓ Plugins endpoint is accessible (HTTP $HTTP_CODE)"
        else
            echo "  Plugins endpoint returned HTTP $HTTP_CODE"
        fi
    fi
} | tee "$DIAGNOSTICS_DIR/04-api-backend.log"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 5: Backend Process Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

{
    echo "Checking for running backend processes..."
    echo ""
    
    # Check for Node.js processes
    if command -v pgrep &> /dev/null; then
        NODE_PROCS=$(pgrep -f "node.*server.js" || echo "")
        if [ -n "$NODE_PROCS" ]; then
            echo "✓ Found Node.js backend process(es):"
            ps aux | grep -E "node.*server.js" | grep -v grep || echo "  (process details not available)"
        else
            log_issue "WARNING" "No Node.js backend process found"
            log_manual "Start the backend with: cd console/backend && npm start"
        fi
    fi
    
    # Check Docker containers if in production
    if command -v docker &> /dev/null; then
        echo ""
        echo "Checking Docker containers..."
        CONSOLE_CONTAINER=$(docker ps --filter "name=minecraft-console" --format "{{.Names}}" 2>/dev/null || echo "")
        if [ -n "$CONSOLE_CONTAINER" ]; then
            echo "✓ Found console container: $CONSOLE_CONTAINER"
            docker ps --filter "name=minecraft-console" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        else
            echo "  No minecraft-console container running"
        fi
    fi
} | tee "$DIAGNOSTICS_DIR/05-backend-process.log"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 6: Network Binding and Port Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

{
    echo "Verifying port binding and network configuration..."
    echo ""
    
    # Check if port 3001 is listening
    if command -v netstat &> /dev/null; then
        echo "Checking port ${API_PORT} with netstat..."
        NETSTAT_OUTPUT=$(netstat -tuln 2>/dev/null | grep ":${API_PORT}" || echo "")
        if [ -n "$NETSTAT_OUTPUT" ]; then
            echo "✓ Port ${API_PORT} is listening:"
            echo "$NETSTAT_OUTPUT"
            
            # Check if it's bound to 0.0.0.0 (all interfaces)
            if echo "$NETSTAT_OUTPUT" | grep -q "0.0.0.0:${API_PORT}"; then
                echo "✓ Port is correctly bound to 0.0.0.0 (all interfaces)"
            elif echo "$NETSTAT_OUTPUT" | grep -q ":::${API_PORT}"; then
                echo "✓ Port is bound to IPv6 all interfaces (:::)"
            elif echo "$NETSTAT_OUTPUT" | grep -q "127.0.0.1:${API_PORT}"; then
                log_issue "ERROR" "Port ${API_PORT} is bound to localhost only (127.0.0.1)"
                echo "  This prevents external connections to the API"
                log_manual "Update server.js to bind to 0.0.0.0 instead of localhost"
            else
                echo "  Port binding address: $(echo "$NETSTAT_OUTPUT" | awk '{print $4}')"
            fi
        else
            log_issue "WARNING" "Port ${API_PORT} is not listening"
            log_manual "Ensure the backend server is running and listening on port ${API_PORT}"
        fi
    elif command -v ss &> /dev/null; then
        echo "Checking port ${API_PORT} with ss..."
        SS_OUTPUT=$(ss -tuln 2>/dev/null | grep ":${API_PORT}" || echo "")
        if [ -n "$SS_OUTPUT" ]; then
            echo "✓ Port ${API_PORT} is listening:"
            echo "$SS_OUTPUT"
            
            # Check if it's bound to 0.0.0.0 (all interfaces)
            if echo "$SS_OUTPUT" | grep -q "0.0.0.0:${API_PORT}"; then
                echo "✓ Port is correctly bound to 0.0.0.0 (all interfaces)"
            elif echo "$SS_OUTPUT" | grep -q "\*:${API_PORT}"; then
                echo "✓ Port is bound to all interfaces (*)"
            elif echo "$SS_OUTPUT" | grep -q ":::${API_PORT}"; then
                echo "✓ Port is bound to IPv6 all interfaces (:::)"
            elif echo "$SS_OUTPUT" | grep -q "127.0.0.1:${API_PORT}"; then
                log_issue "ERROR" "Port ${API_PORT} is bound to localhost only (127.0.0.1)"
                echo "  This prevents external connections to the API"
                log_manual "Update server.js to bind to 0.0.0.0 instead of localhost"
            else
                echo "  Port binding: $(echo "$SS_OUTPUT" | awk '{print $5}')"
            fi
        else
            log_issue "WARNING" "Port ${API_PORT} is not listening"
            log_manual "Ensure the backend server is running and listening on port ${API_PORT}"
        fi
    else
        echo "  Neither netstat nor ss available, skipping port binding check"
    fi
    
    echo ""
    
    # Check Docker port mapping if applicable
    if command -v docker &> /dev/null; then
        CONSOLE_CONTAINER=$(docker ps --filter "name=minecraft-console" --format "{{.Names}}" 2>/dev/null || echo "")
        if [ -n "$CONSOLE_CONTAINER" ]; then
            echo "Checking Docker port mapping for $CONSOLE_CONTAINER..."
            PORT_MAPPING=$(docker port "$CONSOLE_CONTAINER" 2>/dev/null | grep "${API_PORT}" || echo "")
            if [ -n "$PORT_MAPPING" ]; then
                echo "✓ Docker port mapping configured:"
                echo "  $PORT_MAPPING"
                
                # Verify the mapping is to 0.0.0.0 or all interfaces
                if echo "$PORT_MAPPING" | grep -q "0.0.0.0:${API_PORT}"; then
                    echo "✓ Port is mapped to all host interfaces (0.0.0.0)"
                else
                    echo "  Port mapping: $PORT_MAPPING"
                fi
            else
                log_issue "WARNING" "No Docker port mapping found for port ${API_PORT}"
                log_manual "Check docker-compose.console.yml has ports: - '3001:3001' configured"
            fi
            
            echo ""
            echo "Checking container logs for binding messages..."
            BIND_LOGS=$(docker logs "$CONSOLE_CONTAINER" 2>&1 | grep -i "running on\|listening\|bind" | tail -5 || echo "")
            if [ -n "$BIND_LOGS" ]; then
                echo "$BIND_LOGS"
            else
                echo "  No binding-related log messages found"
            fi
        fi
    fi
} | tee "$DIAGNOSTICS_DIR/06-network-binding.log"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 7: Docker Port Mapping Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

{
    if command -v docker &> /dev/null; then
        CONSOLE_CONTAINER=$(docker ps --filter "name=minecraft-console" --format "{{.Names}}" 2>/dev/null || echo "")
        
        if [ -n "$CONSOLE_CONTAINER" ]; then
            echo "Inspecting Docker container: $CONSOLE_CONTAINER"
            echo ""
            
            # Use docker inspect to check port mappings
            echo "Checking port mappings with docker inspect..."
            INSPECT_PORTS=$(docker inspect "$CONSOLE_CONTAINER" --format='{{json .NetworkSettings.Ports}}' 2>/dev/null || echo "{}")
            
            if [ "$INSPECT_PORTS" != "{}" ] && [ "$INSPECT_PORTS" != "null" ]; then
                echo "Port mappings from docker inspect:"
                echo "$INSPECT_PORTS" | python3 -m json.tool 2>/dev/null || echo "$INSPECT_PORTS"
                
                # Check if port 3001 is mapped
                if echo "$INSPECT_PORTS" | grep -q "3001/tcp"; then
                    echo "✓ Port 3001/tcp mapping found"
                    
                    # Extract the host port
                    HOST_PORT=$(docker port "$CONSOLE_CONTAINER" 3001 2>/dev/null | head -1 | cut -d':' -f2)
                    if [ -n "$HOST_PORT" ]; then
                        echo "✓ Port 3001 is mapped to host port: $HOST_PORT"
                    fi
                else
                    log_issue "ERROR" "Port 3001/tcp is not mapped in container"
                    
                    if [ "$ACTION" = "fix" ]; then
                        echo "Generating docker-compose.console.yml patch..."
                        cat > "$DIAGNOSTICS_DIR/docker-compose-port-fix.patch" <<'PATCH_EOF'
# Add this to your docker-compose.console.yml under the console service:
    ports:
      - "3001:3001"
PATCH_EOF
                        log_manual "Apply the patch in $DIAGNOSTICS_DIR/docker-compose-port-fix.patch"
                        log_manual "Then run: docker compose -f docker-compose.console.yml up -d --force-recreate"
                    fi
                fi
            else
                echo "  No port mappings found"
                log_issue "ERROR" "Container has no port mappings configured"
            fi
            
            echo ""
            echo "Checking container network binding inside container..."
            # Run netstat inside the container
            CONTAINER_NETSTAT=$(docker exec "$CONSOLE_CONTAINER" sh -c "netstat -tuln 2>/dev/null | grep ':3001' || ss -tuln 2>/dev/null | grep ':3001' || echo 'netstat/ss not available'" 2>/dev/null || echo "Cannot execute in container")
            
            if [ "$CONTAINER_NETSTAT" != "Cannot execute in container" ] && [ "$CONTAINER_NETSTAT" != "netstat/ss not available" ]; then
                echo "Port binding inside container:"
                echo "$CONTAINER_NETSTAT"
                
                # Check if bound to 0.0.0.0
                if echo "$CONTAINER_NETSTAT" | grep -q "0.0.0.0:3001\|0.0.0.0:${API_PORT}\|\*:3001\|\*:${API_PORT}"; then
                    echo "✓ Container binds to all interfaces (0.0.0.0 or *)"
                elif echo "$CONTAINER_NETSTAT" | grep -q "127.0.0.1:3001\|127.0.0.1:${API_PORT}"; then
                    log_issue "ERROR" "Container binds to localhost only (127.0.0.1)"
                    log_manual "Update server.js to bind to '0.0.0.0' instead of 'localhost' or '127.0.0.1'"
                else
                    echo "  Port binding: $CONTAINER_NETSTAT"
                fi
            else
                echo "  $CONTAINER_NETSTAT"
            fi
            
        else
            echo "No minecraft-console container is currently running"
            echo "This is normal if the console is not deployed yet"
        fi
    else
        echo "Docker is not available, skipping container diagnostics"
    fi
} | tee "$DIAGNOSTICS_DIR/07-docker-port-mapping.log"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 8: Docker Compose Configuration Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

{
    COMPOSE_FILE="$BASE_DIR/docker-compose.console.yml"
    
    if [ -f "$COMPOSE_FILE" ]; then
        echo "Checking docker-compose.console.yml at: $COMPOSE_FILE"
        echo ""
        
        # Check if ports section exists
        if grep -q "ports:" "$COMPOSE_FILE"; then
            echo "✓ ports section found in compose file"
            
            # Check if 3001:3001 mapping exists
            if grep -A 5 "ports:" "$COMPOSE_FILE" | grep -q "3001:3001"; then
                echo "✓ Port mapping 3001:3001 configured"
            else
                log_issue "ERROR" "Port mapping 3001:3001 not found in compose file"
                
                if [ "$ACTION" = "fix" ]; then
                    echo "Creating backup of docker-compose.console.yml..."
                    cp "$COMPOSE_FILE" "$COMPOSE_FILE.backup-$(date +%Y%m%d-%H%M%S)"
                    
                    # This is a complex fix, we'll just report it
                    log_manual "Manually add 'ports: - \"3001:3001\"' to docker-compose.console.yml"
                    log_manual "See $DIAGNOSTICS_DIR/docker-compose-port-fix.patch for guidance"
                fi
            fi
        else
            log_issue "ERROR" "No ports section found in compose file"
            log_manual "Add ports section with 3001:3001 mapping to docker-compose.console.yml"
        fi
        
        echo ""
        echo "Checking healthcheck configuration..."
        if grep -q "healthcheck:" "$COMPOSE_FILE"; then
            echo "✓ healthcheck section found"
            
            # Check if it references /health endpoint
            if grep -A 10 "healthcheck:" "$COMPOSE_FILE" | grep -q "/health"; then
                echo "✓ healthcheck uses /health endpoint"
            else
                log_issue "WARNING" "healthcheck may not be using /health endpoint"
                log_manual "Update healthcheck to use: http://localhost:3001/health"
            fi
        else
            log_issue "WARNING" "No healthcheck configured in compose file"
            
            if [ "$ACTION" = "fix" ]; then
                log_manual "Add healthcheck section to docker-compose.console.yml"
                cat > "$DIAGNOSTICS_DIR/healthcheck-addition.yml" <<'HEALTHCHECK_EOF'
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
HEALTHCHECK_EOF
                echo "Healthcheck configuration saved to: $DIAGNOSTICS_DIR/healthcheck-addition.yml"
            fi
        fi
        
        echo ""
        echo "Checking environment variables..."
        if grep -q "API_PORT\|CONSOLE_PORT" "$COMPOSE_FILE"; then
            echo "✓ Port environment variables found"
            
            # Display the port configuration
            grep -E "API_PORT|CONSOLE_PORT" "$COMPOSE_FILE" | sed 's/^/  /'
        else
            log_issue "WARNING" "API_PORT or CONSOLE_PORT environment variable not set"
            log_manual "Add 'API_PORT=3001' to environment section in docker-compose.console.yml"
        fi
    else
        log_issue "WARNING" "docker-compose.console.yml not found at $COMPOSE_FILE"
        echo "This is normal for development environments"
    fi
} | tee "$DIAGNOSTICS_DIR/08-compose-config.log"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 9: Auto-Restart and Redeploy (if fixes applied)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

{
    # Check if we're in fix mode and if any fixes were applied
    if [ "$ACTION" = "fix" ] && [ $ISSUES_FIXED -gt 0 ]; then
        echo "Fixes were applied ($ISSUES_FIXED total)"
        echo ""
        
        # Check if auto-restart is requested (via environment variable)
        AUTO_RESTART="${AUTO_RESTART:-false}"
        
        if [ "$AUTO_RESTART" = "true" ] && command -v docker &> /dev/null; then
            CONSOLE_CONTAINER=$(docker ps --filter "name=minecraft-console" --format "{{.Names}}" 2>/dev/null || echo "")
            
            if [ -n "$CONSOLE_CONTAINER" ]; then
                echo "AUTO_RESTART is enabled, restarting container..."
                
                # Check if we have docker-compose
                COMPOSE_FILE="$BASE_DIR/docker-compose.console.yml"
                DEPLOY_COMPOSE_FILE="/home/deploy/minecraft-console/docker-compose.yml"
                
                if [ -f "$COMPOSE_FILE" ]; then
                    echo "Restarting with docker compose..."
                    docker compose -f "$COMPOSE_FILE" restart console 2>&1 | tee "$DIAGNOSTICS_DIR/restart.log" || {
                        echo "Failed to restart with compose, trying direct container restart..."
                        docker restart "$CONSOLE_CONTAINER" 2>&1 | tee -a "$DIAGNOSTICS_DIR/restart.log"
                    }
                    log_fix "Restarted console container"
                elif [ -f "$DEPLOY_COMPOSE_FILE" ]; then
                    echo "Restarting with deployment compose file..."
                    cd "$(dirname "$DEPLOY_COMPOSE_FILE")"
                    docker compose restart 2>&1 | tee "$DIAGNOSTICS_DIR/restart.log"
                    log_fix "Restarted console container with deployment compose"
                else
                    echo "No compose file found, restarting container directly..."
                    docker restart "$CONSOLE_CONTAINER" 2>&1 | tee "$DIAGNOSTICS_DIR/restart.log"
                    log_fix "Restarted console container directly"
                fi
                
                echo ""
                echo "Waiting for container to be healthy..."
                sleep 5
                
                # Check health
                for i in {1..12}; do
                    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' "$CONSOLE_CONTAINER" 2>/dev/null || echo "unknown")
                    echo "  Health check attempt $i/12: $HEALTH"
                    
                    if [ "$HEALTH" = "healthy" ]; then
                        echo "✓ Container is healthy after restart"
                        break
                    fi
                    
                    sleep 5
                done
                
                if [ "$HEALTH" != "healthy" ]; then
                    log_issue "WARNING" "Container did not become healthy after restart"
                    log_manual "Check container logs: docker logs $CONSOLE_CONTAINER"
                fi
            else
                echo "No console container running, skipping auto-restart"
                log_manual "Start the console container to apply fixes"
            fi
        else
            if [ "$AUTO_RESTART" != "true" ]; then
                echo "Auto-restart is disabled (set AUTO_RESTART=true to enable)"
            fi
            log_manual "Restart the backend to apply fixes: docker compose -f docker-compose.console.yml restart"
        fi
    else
        if [ "$ACTION" = "fix" ]; then
            echo "No fixes were applied, restart not needed"
        else
            echo "Running in diagnose-only mode, no restart performed"
        fi
    fi
} | tee "$DIAGNOSTICS_DIR/09-auto-restart.log"

echo ""
echo "============================================================"
echo "DIAGNOSTIC SUMMARY"
echo "============================================================"
echo ""

{
    echo "Timestamp: $(date)"
    echo "Mode: $ACTION"
    echo "Auto-restart: ${AUTO_RESTART:-false}"
    echo ""
    echo "Results:"
    echo "  Issues found: $ISSUES_FOUND"
    
    if [ "$ACTION" = "fix" ]; then
        echo "  Issues fixed: $ISSUES_FIXED"
    fi
    
    echo "  Manual actions required: $ISSUES_MANUAL"
    echo ""
    
    if [ $ISSUES_FOUND -eq 0 ]; then
        echo "✓ No issues found - plugin manager is healthy!"
    else
        echo "Issues detected. See detailed logs in: $DIAGNOSTICS_DIR"
        echo ""
        
        if [ -f "$DIAGNOSTICS_DIR/issues.log" ]; then
            echo "Issues found:"
            cat "$DIAGNOSTICS_DIR/issues.log"
            echo ""
        fi
        
        if [ "$ACTION" = "fix" ] && [ -f "$DIAGNOSTICS_DIR/fixes.log" ]; then
            echo "Auto-fixes applied:"
            cat "$DIAGNOSTICS_DIR/fixes.log"
            echo ""
        fi
        
        if [ -f "$DIAGNOSTICS_DIR/manual-actions.log" ]; then
            echo "Manual actions required:"
            cat "$DIAGNOSTICS_DIR/manual-actions.log"
            echo ""
        fi
    fi
    
    echo "Detailed logs saved to: $DIAGNOSTICS_DIR"
    echo ""
    
    if [ "$ACTION" = "diagnose" ] && [ $ISSUES_FOUND -gt 0 ]; then
        echo "To automatically fix issues, run:"
        echo "  $0 fix"
        echo ""
    fi
} | tee "$DIAGNOSTICS_DIR/summary.log"

# Create deployment summary artifact
{
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║           PLUGIN MANAGER DEPLOYMENT SUMMARY                   ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Diagnostic Run Information:"
    echo "  Date/Time:          $(date)"
    echo "  Mode:               $ACTION"
    echo "  Auto-restart:       ${AUTO_RESTART:-false}"
    echo "  Diagnostics Dir:    $DIAGNOSTICS_DIR"
    echo ""
    echo "System Information:"
    echo "  Base Directory:     $BASE_DIR"
    echo "  Console Directory:  $CONSOLE_DIR"
    echo "  API Endpoint:       http://${API_HOST}:${API_PORT}/api/plugins"
    echo ""
    echo "Results Summary:"
    echo "  Issues Found:       $ISSUES_FOUND"
    
    if [ "$ACTION" = "fix" ]; then
        echo "  Issues Fixed:       $ISSUES_FIXED"
    fi
    
    echo "  Manual Actions:     $ISSUES_MANUAL"
    echo ""
    
    # Container status
    if command -v docker &> /dev/null; then
        CONSOLE_CONTAINER=$(docker ps --filter "name=minecraft-console" --format "{{.Names}}" 2>/dev/null || echo "")
        if [ -n "$CONSOLE_CONTAINER" ]; then
            echo "Container Status:"
            docker ps --filter "name=minecraft-console" --format "  Name:    {{.Names}}\n  Status:  {{.Status}}\n  Health:  {{.State}}\n  Ports:   {{.Ports}}"
            echo ""
        fi
    fi
    
    # Health status
    echo "Component Health:"
    echo "  plugins.json:       $([ -f "$PLUGINS_JSON" ] && echo "✓ EXISTS" || echo "✗ MISSING")"
    echo "  plugins directory:  $([ -d "$PLUGINS_DIR" ] && echo "✓ EXISTS" || echo "✗ MISSING")"
    echo "  plugin-history:     $([ -f "$HISTORY_FILE" ] && echo "✓ EXISTS" || echo "○ NOT YET CREATED")"
    
    # API health check
    if command -v curl &> /dev/null; then
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${API_HOST}:${API_PORT}/health" 2>/dev/null || echo "000")
        if [ "$HTTP_CODE" = "200" ]; then
            echo "  API backend:        ✓ HEALTHY (HTTP $HTTP_CODE)"
        elif [ "$HTTP_CODE" = "000" ] || [ "$HTTP_CODE" = "000000" ]; then
            echo "  API backend:        ✗ NOT REACHABLE"
        else
            echo "  API backend:        ⚠ UNHEALTHY (HTTP $HTTP_CODE)"
        fi
    fi
    
    echo ""
    
    # List all log files created
    echo "Diagnostic Logs Created:"
    ls -1 "$DIAGNOSTICS_DIR"/*.log 2>/dev/null | while read -r logfile; do
        echo "  - $(basename "$logfile")"
    done
    echo ""
    
    # Recommendations
    if [ $ISSUES_FOUND -gt 0 ]; then
        echo "═══════════════════════════════════════════════════════════════"
        echo "RECOMMENDATIONS:"
        echo "═══════════════════════════════════════════════════════════════"
        
        if [ "$ACTION" = "diagnose" ]; then
            echo "1. Run '$0 fix' to automatically resolve fixable issues"
        fi
        
        if [ $ISSUES_MANUAL -gt 0 ]; then
            echo "2. Review manual actions in: $DIAGNOSTICS_DIR/manual-actions.log"
        fi
        
        if [ "$ACTION" = "fix" ] && [ $ISSUES_FIXED -gt 0 ]; then
            echo "3. Restart the backend to apply fixes (if not auto-restarted)"
        fi
        
        echo "4. Review detailed logs in: $DIAGNOSTICS_DIR/"
        echo ""
    else
        echo "═══════════════════════════════════════════════════════════════"
        echo "✓ ALL CHECKS PASSED - PLUGIN MANAGER IS HEALTHY!"
        echo "═══════════════════════════════════════════════════════════════"
        echo ""
    fi
    
    echo "End of deployment summary"
    echo "Generated: $(date)"
} | tee "$DIAGNOSTICS_DIR/deployment-summary.txt"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "Deployment summary saved to: $DIAGNOSTICS_DIR/deployment-summary.txt"
echo "═══════════════════════════════════════════════════════════════"

echo "============================================================"
echo "DIAGNOSTICS COMPLETE"
echo "============================================================"

# Exit with appropriate code
if [ $ISSUES_FOUND -gt 0 ] && [ $ISSUES_MANUAL -gt 0 ]; then
    exit 1
elif [ $ISSUES_FOUND -gt 0 ]; then
    exit 0  # Issues found but fixed
else
    exit 0  # No issues
fi
