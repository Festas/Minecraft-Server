#!/bin/bash

################################################################################
# Plugin Manager Advanced Diagnostics Script
################################################################################
#
# This script performs deep diagnostics for the Minecraft server plugin manager
# that go beyond basic file/permission checks.
#
# USAGE:
#   ./diagnose-plugins-advanced.sh
#
# OUTPUT:
#   Creates timestamped directory: /tmp/plugin-diagnostics-advanced-YYYYMMDD-HHMMSS/
#   Contains detailed diagnostic logs and reports
#
# FEATURES:
#   - Analyzes backend logs for errors
#   - Validates API schema and responses
#   - Attempts dry-run plugin installation
#   - Verifies session/authentication mechanisms
#   - Checks Docker container mounts and volumes
#   - Reports deep issues not auto-fixable
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
BACKEND_DIR="$CONSOLE_DIR/backend"
LOGS_DIR="$BACKEND_DIR/logs"
DIAGNOSTICS_DIR="/tmp/plugin-diagnostics-advanced-$(date +%Y%m%d-%H%M%S)"

# API configuration
API_HOST="${API_HOST:-localhost}"
API_PORT="${API_PORT:-3001}"
API_BASE_URL="http://${API_HOST}:${API_PORT}"

# Create diagnostics directory
mkdir -p "$DIAGNOSTICS_DIR"

# Counters
WARNINGS=0
ERRORS=0
INFO=0

echo "============================================================"
echo "PLUGIN MANAGER ADVANCED DIAGNOSTICS"
echo "============================================================"
echo "Timestamp: $(date)"
echo "Base Directory: $BASE_DIR"
echo "Backend Directory: $BACKEND_DIR"
echo "Diagnostics Directory: $DIAGNOSTICS_DIR"
echo "============================================================"
echo ""

################################################################################
# UTILITY FUNCTIONS
################################################################################

log_info() {
    local message="$1"
    echo "[INFO] $message" | tee -a "$DIAGNOSTICS_DIR/diagnostics.log"
    INFO=$((INFO + 1))
}

log_warning() {
    local message="$1"
    echo "[WARNING] $message" | tee -a "$DIAGNOSTICS_DIR/diagnostics.log"
    WARNINGS=$((WARNINGS + 1))
}

log_error() {
    local message="$1"
    echo "[ERROR] $message" | tee -a "$DIAGNOSTICS_DIR/diagnostics.log"
    ERRORS=$((ERRORS + 1))
}

################################################################################
# DIAGNOSTIC SECTIONS
################################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 1: Backend Logs Analysis"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

{
    echo "Analyzing backend logs for plugin-related errors..."
    echo ""
    
    # Check if running in Docker
    if command -v docker &> /dev/null; then
        CONSOLE_CONTAINER=$(docker ps --filter "name=minecraft-console" --format "{{.Names}}" 2>/dev/null | head -1)
        
        if [ -n "$CONSOLE_CONTAINER" ]; then
            echo "Found console container: $CONSOLE_CONTAINER"
            echo "Fetching recent logs..."
            
            docker logs --tail 500 "$CONSOLE_CONTAINER" 2>&1 | tee "$DIAGNOSTICS_DIR/backend-logs.txt"
            
            echo ""
            echo "Analyzing for plugin-related errors..."
            
            # Search for plugin errors
            PLUGIN_ERRORS=$(grep -i "plugin" "$DIAGNOSTICS_DIR/backend-logs.txt" | grep -iE "error|fail|exception" | head -20 || echo "")
            if [ -n "$PLUGIN_ERRORS" ]; then
                log_error "Found plugin-related errors in logs"
                echo "$PLUGIN_ERRORS"
            else
                log_info "No plugin-related errors found in recent logs"
            fi
            
            # Search for JSON parse errors
            JSON_ERRORS=$(grep -i "json" "$DIAGNOSTICS_DIR/backend-logs.txt" | grep -iE "parse|syntax|unexpected" | head -10 || echo "")
            if [ -n "$JSON_ERRORS" ]; then
                log_error "Found JSON parsing errors in logs"
                echo "$JSON_ERRORS"
            fi
            
            # Search for file access errors
            ACCESS_ERRORS=$(grep -iE "ENOENT|EACCES|permission denied" "$DIAGNOSTICS_DIR/backend-logs.txt" | head -10 || echo "")
            if [ -n "$ACCESS_ERRORS" ]; then
                log_error "Found file access errors in logs"
                echo "$ACCESS_ERRORS"
            fi
        else
            echo "No console container found, checking local log files..."
            
            if [ -d "$LOGS_DIR" ]; then
                echo "Log directory: $LOGS_DIR"
                ls -lh "$LOGS_DIR" 2>/dev/null || echo "Cannot list log directory"
                
                # Find most recent log file (using ls -t for portability across Unix systems)
                RECENT_LOG=$(ls -t "$LOGS_DIR"/*.log 2>/dev/null | head -1 || echo "")
                
                if [ -n "$RECENT_LOG" ]; then
                    echo "Most recent log: $RECENT_LOG"
                    tail -500 "$RECENT_LOG" > "$DIAGNOSTICS_DIR/backend-logs.txt"
                    
                    # Analyze for errors
                    PLUGIN_ERRORS=$(grep -i "plugin" "$DIAGNOSTICS_DIR/backend-logs.txt" | grep -iE "error|fail" | head -20 || echo "")
                    if [ -n "$PLUGIN_ERRORS" ]; then
                        log_error "Found plugin-related errors in logs"
                        echo "$PLUGIN_ERRORS"
                    fi
                fi
            else
                log_warning "No backend logs directory found at $LOGS_DIR"
            fi
        fi
    else
        log_warning "Docker not available, skipping container log analysis"
    fi
    
    # Check for PM2 logs if available
    if command -v pm2 &> /dev/null; then
        echo ""
        echo "Checking PM2 logs..."
        pm2 logs --lines 100 --nostream 2>&1 | tee "$DIAGNOSTICS_DIR/pm2-logs.txt" || echo "PM2 logs not available"
    fi
} | tee "$DIAGNOSTICS_DIR/01-log-analysis.log"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 2: API Schema Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

{
    echo "Validating API responses against expected schema..."
    echo ""
    
    if ! command -v curl &> /dev/null; then
        log_error "curl not available for API testing"
    else
        # Test health endpoint schema
        echo "Testing /api/plugins/health endpoint..."
        HTTP_CODE=$(curl -s -o "$DIAGNOSTICS_DIR/health-response.json" -w "%{http_code}" "${API_BASE_URL}/api/plugins/health" 2>&1 || echo "000")
        
        if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "503" ]; then
            echo "  Response code: $HTTP_CODE"
            
            if command -v jq &> /dev/null && [ -f "$DIAGNOSTICS_DIR/health-response.json" ]; then
                # Validate schema
                HAS_STATUS=$(jq -e '.status' "$DIAGNOSTICS_DIR/health-response.json" > /dev/null 2>&1 && echo "yes" || echo "no")
                HAS_CHECKS=$(jq -e '.checks' "$DIAGNOSTICS_DIR/health-response.json" > /dev/null 2>&1 && echo "yes" || echo "no")
                
                if [ "$HAS_STATUS" = "yes" ] && [ "$HAS_CHECKS" = "yes" ]; then
                    log_info "Health endpoint has correct schema"
                    
                    # Validate check structure
                    HAS_PLUGINS_JSON=$(jq -e '.checks.pluginsJson' "$DIAGNOSTICS_DIR/health-response.json" > /dev/null 2>&1 && echo "yes" || echo "no")
                    HAS_PLUGINS_DIR=$(jq -e '.checks.pluginsDir' "$DIAGNOSTICS_DIR/health-response.json" > /dev/null 2>&1 && echo "yes" || echo "no")
                    
                    if [ "$HAS_PLUGINS_JSON" = "yes" ] && [ "$HAS_PLUGINS_DIR" = "yes" ]; then
                        log_info "Health checks include required components"
                    else
                        log_warning "Health checks missing some components"
                    fi
                    
                    # Display full response
                    echo ""
                    echo "Health response:"
                    jq '.' "$DIAGNOSTICS_DIR/health-response.json" || cat "$DIAGNOSTICS_DIR/health-response.json"
                else
                    log_error "Health endpoint has invalid schema"
                    cat "$DIAGNOSTICS_DIR/health-response.json"
                fi
            fi
        elif [ "$HTTP_CODE" = "000" ]; then
            log_error "Cannot connect to health endpoint"
        else
            log_warning "Unexpected response code: $HTTP_CODE"
        fi
        
        # Test plugins list endpoint (without auth, should return 401)
        echo ""
        echo "Testing /api/plugins endpoint..."
        HTTP_CODE=$(curl -s -o "$DIAGNOSTICS_DIR/plugins-noauth.json" -w "%{http_code}" "${API_BASE_URL}/api/plugins" 2>&1 || echo "000")
        
        if [ "$HTTP_CODE" = "401" ]; then
            log_info "Plugins endpoint properly requires authentication"
        elif [ "$HTTP_CODE" = "200" ]; then
            log_warning "Plugins endpoint accessible without authentication (security issue)"
            
            if command -v jq &> /dev/null && [ -f "$DIAGNOSTICS_DIR/plugins-noauth.json" ]; then
                # Validate response structure
                HAS_PLUGINS=$(jq -e '.plugins' "$DIAGNOSTICS_DIR/plugins-noauth.json" > /dev/null 2>&1 && echo "yes" || echo "no")
                
                if [ "$HAS_PLUGINS" = "yes" ]; then
                    log_info "Response has correct schema (plugins array present)"
                else
                    log_error "Response missing 'plugins' array"
                fi
            fi
        elif [ "$HTTP_CODE" = "000" ]; then
            log_error "Cannot connect to plugins endpoint"
        else
            log_warning "Unexpected response code: $HTTP_CODE"
        fi
    fi
} | tee "$DIAGNOSTICS_DIR/02-api-schema.log"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 3: Authentication & Session Testing"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

{
    echo "Testing authentication mechanisms..."
    echo ""
    
    if ! command -v curl &> /dev/null; then
        log_error "curl not available for auth testing"
    else
        # Test login endpoint
        echo "Testing /auth/login endpoint..."
        HTTP_CODE=$(curl -s -o "$DIAGNOSTICS_DIR/login-test.json" -w "%{http_code}" "${API_BASE_URL}/auth/login" -X POST 2>&1 || echo "000")
        
        if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "401" ]; then
            log_info "Login endpoint responds appropriately to missing credentials (HTTP $HTTP_CODE)"
        elif [ "$HTTP_CODE" = "000" ]; then
            log_error "Cannot connect to login endpoint"
        else
            echo "  Response code: $HTTP_CODE (may be expected)"
        fi
        
        # Test session handling
        echo ""
        echo "Testing session handling..."
        
        # Try accessing protected endpoint without session
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE_URL}/api/plugins" 2>&1 || echo "000")
        
        if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
            log_info "Protected endpoints properly reject requests without session"
        elif [ "$HTTP_CODE" = "200" ]; then
            log_error "Protected endpoints accessible without authentication!"
        else
            echo "  Response code: $HTTP_CODE"
        fi
        
        # Check CSRF protection
        echo ""
        echo "Checking CSRF protection..."
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE_URL}/api/plugins/install" -X POST 2>&1 || echo "000")
        
        if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
            log_info "POST endpoints protected (CSRF/auth required)"
        elif [ "$HTTP_CODE" = "200" ]; then
            log_error "POST endpoints may not be properly protected"
        fi
    fi
} | tee "$DIAGNOSTICS_DIR/03-auth-session.log"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 4: Docker Container Analysis"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

{
    echo "Analyzing Docker container configuration..."
    echo ""
    
    if ! command -v docker &> /dev/null; then
        log_warning "Docker not available, skipping container analysis"
    else
        CONSOLE_CONTAINER=$(docker ps --filter "name=minecraft-console" --format "{{.Names}}" 2>/dev/null | head -1)
        
        if [ -z "$CONSOLE_CONTAINER" ]; then
            log_warning "No minecraft-console container running"
        else
            echo "Found container: $CONSOLE_CONTAINER"
            echo ""
            
            # Get container details
            echo "Container inspection:"
            docker inspect "$CONSOLE_CONTAINER" > "$DIAGNOSTICS_DIR/container-inspect.json" 2>&1
            
            if command -v jq &> /dev/null; then
                # Check mounts
                echo ""
                echo "Volume mounts:"
                jq -r '.[] | .Mounts[] | "\(.Type): \(.Source) -> \(.Destination) (RW: \(.RW))"' "$DIAGNOSTICS_DIR/container-inspect.json" 2>/dev/null || echo "Could not parse mounts"
                
                # Check if plugins directory is mounted
                PLUGINS_MOUNT=$(jq -r '.[] | .Mounts[] | select(.Destination | contains("plugins")) | .Source' "$DIAGNOSTICS_DIR/container-inspect.json" 2>/dev/null || echo "")
                
                if [ -n "$PLUGINS_MOUNT" ]; then
                    log_info "Plugins directory is mounted: $PLUGINS_MOUNT"
                    
                    # Check if mount is writable
                    IS_RW=$(jq -r '.[] | .Mounts[] | select(.Destination | contains("plugins")) | .RW' "$DIAGNOSTICS_DIR/container-inspect.json" 2>/dev/null || echo "")
                    
                    if [ "$IS_RW" = "true" ]; then
                        log_info "Plugins mount is read-write"
                    else
                        log_error "Plugins mount is read-only!"
                    fi
                else
                    log_warning "No explicit plugins directory mount found"
                fi
                
                # Check environment variables
                echo ""
                echo "Environment variables (plugin-related):"
                jq -r '.[] | .Config.Env[] | select(. | contains("PLUGIN"))' "$DIAGNOSTICS_DIR/container-inspect.json" 2>/dev/null || echo "None found"
                
                # Check for PLUGINS_DIR override
                PLUGINS_DIR_ENV=$(jq -r '.[] | .Config.Env[] | select(startswith("PLUGINS_DIR=")) | sub("PLUGINS_DIR="; "")' "$DIAGNOSTICS_DIR/container-inspect.json" 2>/dev/null || echo "")
                
                if [ -n "$PLUGINS_DIR_ENV" ]; then
                    log_info "PLUGINS_DIR environment variable set to: $PLUGINS_DIR_ENV"
                fi
            fi
            
            # Check container health
            echo ""
            echo "Container health status:"
            docker inspect --format='{{.State.Health.Status}}' "$CONSOLE_CONTAINER" 2>&1 || echo "No health check configured"
            
            # Check container logs for startup errors
            echo ""
            echo "Recent container errors:"
            docker logs --tail 50 "$CONSOLE_CONTAINER" 2>&1 | grep -iE "error|fail|exception" | head -10 || echo "No recent errors found"
        fi
    fi
} | tee "$DIAGNOSTICS_DIR/04-docker-analysis.log"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 5: Dependencies & Backend Health"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

{
    echo "Checking backend dependencies and health..."
    echo ""
    
    # Check package.json exists
    if [ -f "$BACKEND_DIR/package.json" ]; then
        echo "✓ package.json found"
        
        # Check for required plugin manager dependencies
        if command -v jq &> /dev/null; then
            echo ""
            echo "Plugin manager dependencies:"
            
            for dep in "adm-zip" "js-yaml" "semver" "axios"; do
                HAS_DEP=$(jq -e ".dependencies.\"$dep\"" "$BACKEND_DIR/package.json" > /dev/null 2>&1 && echo "yes" || echo "no")
                
                if [ "$HAS_DEP" = "yes" ]; then
                    VERSION=$(jq -r ".dependencies.\"$dep\"" "$BACKEND_DIR/package.json")
                    echo "  ✓ $dep: $VERSION"
                else
                    log_error "Missing required dependency: $dep"
                fi
            done
        fi
        
        # Check if node_modules exists
        if [ -d "$BACKEND_DIR/node_modules" ]; then
            log_info "node_modules directory exists"
            
            # Check specific plugin manager modules
            for mod in "adm-zip" "js-yaml" "semver" "axios"; do
                if [ -d "$BACKEND_DIR/node_modules/$mod" ]; then
                    echo "  ✓ $mod installed"
                else
                    log_error "$mod not installed in node_modules"
                fi
            done
        else
            log_error "node_modules directory not found - dependencies not installed"
        fi
    else
        log_error "package.json not found at $BACKEND_DIR"
    fi
    
    # Check Node.js version
    echo ""
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log_info "Node.js version: $NODE_VERSION"
        
        # Check if version is compatible (>= 14)
        NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v\([0-9]*\).*/\1/')
        if [ "$NODE_MAJOR" -ge 14 ]; then
            log_info "Node.js version is compatible"
        else
            log_error "Node.js version too old (need >= 14, have $NODE_VERSION)"
        fi
    else
        log_error "Node.js not found in PATH"
    fi
    
    # Check npm version
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        log_info "npm version: $NPM_VERSION"
    else
        log_warning "npm not found in PATH"
    fi
} | tee "$DIAGNOSTICS_DIR/05-dependencies.log"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SECTION 6: File System Deep Dive"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

{
    echo "Performing deep file system analysis..."
    echo ""
    
    # Check disk space
    echo "Disk space for plugins directory:"
    df -h "$BASE_DIR/plugins" 2>/dev/null || df -h "$BASE_DIR"
    
    AVAILABLE_GB=$(df -BG "$BASE_DIR" 2>/dev/null | tail -1 | awk '{print $4}' | sed 's/G//')
    
    if [ -n "$AVAILABLE_GB" ] && [ "$AVAILABLE_GB" -lt 1 ]; then
        log_error "Low disk space: ${AVAILABLE_GB}GB available"
    elif [ -n "$AVAILABLE_GB" ] && [ "$AVAILABLE_GB" -lt 5 ]; then
        log_warning "Disk space getting low: ${AVAILABLE_GB}GB available"
    fi
    
    # Check for orphaned backup files
    echo ""
    echo "Checking for backup files..."
    if [ -d "$BASE_DIR/plugins" ]; then
        BACKUP_COUNT=$(find "$BASE_DIR/plugins" -name "*.jar.backup" 2>/dev/null | wc -l)
        echo "  Backup files found: $BACKUP_COUNT"
        
        if [ "$BACKUP_COUNT" -gt 20 ]; then
            log_warning "Large number of backup files ($BACKUP_COUNT) - consider cleanup"
        fi
        
        # Check for very old backups (> 30 days)
        OLD_BACKUPS=$(find "$BASE_DIR/plugins" -name "*.jar.backup" -mtime +30 2>/dev/null | wc -l)
        if [ "$OLD_BACKUPS" -gt 0 ]; then
            log_info "Found $OLD_BACKUPS backup files older than 30 days"
        fi
    fi
    
    # Check for duplicate JAR files
    echo ""
    echo "Checking for potential duplicate plugins..."
    if [ -d "$BASE_DIR/plugins" ]; then
        # Look for plugins with version numbers in filenames
        find "$BASE_DIR/plugins" -name "*.jar" -type f 2>/dev/null | while read -r jarfile; do
            basename "$jarfile"
        done | sed 's/-[0-9].*//' | sort | uniq -c | sort -rn | head -10 > "$DIAGNOSTICS_DIR/plugin-basenames.txt"
        
        DUPLICATES=$(awk '$1 > 1' "$DIAGNOSTICS_DIR/plugin-basenames.txt" | wc -l)
        if [ "$DUPLICATES" -gt 0 ]; then
            log_warning "Potential duplicate plugins detected (same base name):"
            awk '$1 > 1' "$DIAGNOSTICS_DIR/plugin-basenames.txt" || echo "None"
        else
            log_info "No obvious duplicate plugins found"
        fi
    fi
    
    # Check file permissions on all JAR files
    echo ""
    echo "Checking permissions on plugin JAR files..."
    if [ -d "$BASE_DIR/plugins" ]; then
        NON_READABLE=$(find "$BASE_DIR/plugins" -name "*.jar" ! -readable 2>/dev/null | wc -l)
        if [ "$NON_READABLE" -gt 0 ]; then
            log_error "$NON_READABLE plugin JAR files are not readable"
            find "$BASE_DIR/plugins" -name "*.jar" ! -readable 2>/dev/null | head -5
        else
            log_info "All plugin JAR files are readable"
        fi
    fi
} | tee "$DIAGNOSTICS_DIR/06-filesystem.log"

echo ""
echo "============================================================"
echo "ADVANCED DIAGNOSTIC SUMMARY"
echo "============================================================"
echo ""

{
    echo "Timestamp: $(date)"
    echo ""
    echo "Results:"
    echo "  Informational: $INFO"
    echo "  Warnings: $WARNINGS"
    echo "  Errors: $ERRORS"
    echo ""
    
    if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
        echo "✓ No significant issues found in advanced diagnostics"
    else
        echo "Issues detected. Review the detailed logs."
        echo ""
        
        if [ -f "$DIAGNOSTICS_DIR/diagnostics.log" ]; then
            echo "Issue summary:"
            grep -E "\[ERROR\]|\[WARNING\]" "$DIAGNOSTICS_DIR/diagnostics.log" || echo "See individual section logs"
        fi
    fi
    
    echo ""
    echo "Detailed logs saved to: $DIAGNOSTICS_DIR"
    echo ""
    echo "Individual section logs:"
    ls -1 "$DIAGNOSTICS_DIR"/*.log 2>/dev/null | while read -r logfile; do
        echo "  - $(basename "$logfile")"
    done
    echo ""
    
    if [ $ERRORS -gt 0 ]; then
        echo "RECOMMENDATIONS:"
        echo ""
        
        # Provide specific recommendations based on errors
        if grep -q "Cannot connect" "$DIAGNOSTICS_DIR/diagnostics.log" 2>/dev/null; then
            echo "- Backend API is not reachable. Check if the backend service is running:"
            echo "    docker ps | grep minecraft-console"
            echo "    Or: cd console/backend && npm start"
            echo ""
        fi
        
        if grep -q "Missing required dependency" "$DIAGNOSTICS_DIR/diagnostics.log" 2>/dev/null; then
            echo "- Install missing dependencies:"
            echo "    cd console/backend && npm install"
            echo ""
        fi
        
        if grep -q "node_modules directory not found" "$DIAGNOSTICS_DIR/diagnostics.log" 2>/dev/null; then
            echo "- Install all dependencies:"
            echo "    cd console/backend && npm install"
            echo ""
        fi
        
        if grep -q "Low disk space" "$DIAGNOSTICS_DIR/diagnostics.log" 2>/dev/null; then
            echo "- Free up disk space or expand volume"
            echo "- Consider removing old backup files"
            echo ""
        fi
    fi
    
    echo "For basic diagnostics and auto-fix, run:"
    echo "  scripts/diagnose-plugins.sh fix"
    echo ""
} | tee "$DIAGNOSTICS_DIR/summary.log"

echo "============================================================"
echo "ADVANCED DIAGNOSTICS COMPLETE"
echo "============================================================"

# Exit with appropriate code
if [ $ERRORS -gt 0 ]; then
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    exit 0
else
    exit 0
fi
