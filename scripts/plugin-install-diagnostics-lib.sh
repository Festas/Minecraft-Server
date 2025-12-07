#!/bin/bash
#
# Plugin Install Diagnostics Library
# Provides comprehensive diagnostic functions for plugin install testing
# 
# This library contains utilities for:
# - Cookie jar inspection and validation
# - CSRF token extraction and comparison
# - File permission testing
# - Docker/container diagnostics
# - API request/response logging
# - State capture and comparison
#

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $*"
}

log_success() {
    echo -e "${GREEN}✓${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $*"
}

log_error() {
    echo -e "${RED}✗${NC} $*"
}

log_section() {
    echo ""
    echo "=================================================="
    echo "$*"
    echo "=================================================="
}

log_subsection() {
    echo ""
    echo "--- $* ---"
}

# Cookie jar inspection
# Usage: inspect_cookie_jar <cookie_file> <output_file>
inspect_cookie_jar() {
    local cookie_file="$1"
    local output_file="$2"
    
    log_subsection "Cookie Jar Inspection: $cookie_file"
    
    {
        echo "Cookie Jar Contents:"
        echo "===================="
        echo ""
        
        if [ ! -f "$cookie_file" ]; then
            echo "ERROR: Cookie file does not exist: $cookie_file"
            return 1
        fi
        
        echo "Raw cookie file:"
        cat "$cookie_file"
        echo ""
        
        echo "Parsed cookies:"
        grep -v '^#' "$cookie_file" | grep -v '^$' | while IFS=$'\t' read -r domain flag path secure expiration name value; do
            echo "  Cookie: $name"
            echo "    Domain: $domain"
            echo "    Path: $path"
            echo "    Secure: $secure"
            echo "    Expiration: $expiration"
            echo "    Value length: ${#value} chars"
            echo "    Value (first 50 chars): ${value:0:50}..."
            echo ""
        done || echo "  No parseable cookies found"
        
        echo "Cookie summary:"
        echo "  Session cookie present: $(grep -c 'connect.sid' "$cookie_file" 2>/dev/null || echo '0')"
        echo "  CSRF cookie present: $(grep -c 'csrf-token' "$cookie_file" 2>/dev/null || echo '0')"
        echo "  Total cookies: $(grep -v '^#' "$cookie_file" | grep -v '^$' | wc -l)"
        
    } | tee "$output_file"
}

# Extract cookie value by name
# Usage: get_cookie_value <cookie_file> <cookie_name>
get_cookie_value() {
    local cookie_file="$1"
    local cookie_name="$2"
    
    if [ ! -f "$cookie_file" ]; then
        echo "MISSING_FILE"
        return 1
    fi
    
    local value=$(grep -v '^#' "$cookie_file" | grep "$cookie_name" | tail -1 | awk '{print $NF}')
    
    if [ -z "$value" ]; then
        echo "MISSING_COOKIE"
        return 1
    fi
    
    echo "$value"
}

# CSRF token validation and comparison
# Usage: validate_csrf_token <csrf_json_file> <cookie_file> <output_file>
validate_csrf_token() {
    local csrf_json_file="$1"
    local cookie_file="$2"
    local output_file="$3"
    
    log_subsection "CSRF Token Validation"
    
    {
        echo "CSRF Token Validation:"
        echo "======================"
        echo ""
        
        if [ ! -f "$csrf_json_file" ]; then
            echo "ERROR: CSRF JSON file does not exist: $csrf_json_file"
            return 1
        fi
        
        echo "Raw CSRF response:"
        cat "$csrf_json_file"
        echo ""
        
        local token_from_json=$(jq -r '.csrfToken // "MISSING"' "$csrf_json_file" 2>/dev/null || echo "PARSE_ERROR")
        echo "Token from JSON response: $token_from_json"
        echo "Token length: ${#token_from_json} chars"
        echo ""
        
        if [ -f "$cookie_file" ]; then
            local token_from_cookie=$(get_cookie_value "$cookie_file" "csrf-token" 2>/dev/null || echo "MISSING_COOKIE")
            echo "Token from cookie: $token_from_cookie"
            echo "Cookie token length: ${#token_from_cookie} chars"
            echo ""
            
            if [ "$token_from_json" = "$token_from_cookie" ]; then
                echo "✓ CSRF tokens MATCH (JSON == Cookie)"
            else
                echo "✗ CSRF tokens MISMATCH!"
                echo "  JSON:   $token_from_json"
                echo "  Cookie: $token_from_cookie"
            fi
        else
            echo "⚠ Cookie file not found, cannot compare"
        fi
        
        echo ""
        echo "CSRF token structure analysis:"
        if [ ${#token_from_json} -ge 64 ]; then
            echo "  ✓ Token length is adequate (${#token_from_json} chars >= 64)"
        else
            echo "  ✗ Token length is too short (${#token_from_json} chars < 64)"
        fi
        
        # Check if token looks like base64
        if [[ "$token_from_json" =~ ^[A-Za-z0-9+/=]+$ ]]; then
            echo "  ✓ Token appears to be valid base64"
        else
            echo "  ⚠ Token does not appear to be standard base64"
        fi
        
    } | tee "$output_file"
}

# Log API request details
# Usage: log_api_request <method> <url> <headers_file> <cookie_file> <body_file> <output_file>
log_api_request() {
    local method="$1"
    local url="$2"
    local headers_file="$3"
    local cookie_file="$4"
    local body_file="$5"
    local output_file="$6"
    
    {
        echo "API Request Details:"
        echo "===================="
        echo "Method: $method"
        echo "URL: $url"
        echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S.%3N UTC")"
        echo ""
        
        if [ -f "$headers_file" ]; then
            echo "Request Headers:"
            cat "$headers_file"
            echo ""
        fi
        
        if [ -f "$cookie_file" ]; then
            echo "Cookies Sent:"
            inspect_cookie_jar "$cookie_file" "/dev/stdout"
            echo ""
        fi
        
        if [ -f "$body_file" ] && [ -s "$body_file" ]; then
            echo "Request Body:"
            cat "$body_file" | jq '.' 2>/dev/null || cat "$body_file"
            echo ""
        fi
        
    } | tee -a "$output_file"
}

# Log API response details
# Usage: log_api_response <status_code> <response_headers_file> <response_body_file> <cookie_file> <output_file>
log_api_response() {
    local status_code="$1"
    local response_headers_file="$2"
    local response_body_file="$3"
    local cookie_file="$4"
    local output_file="$5"
    
    {
        echo "API Response Details:"
        echo "====================="
        echo "Status Code: $status_code"
        echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S.%3N UTC")"
        echo ""
        
        if [ -f "$response_headers_file" ]; then
            echo "Response Headers:"
            cat "$response_headers_file"
            echo ""
            
            # Extract and highlight Set-Cookie headers
            if grep -i "^set-cookie:" "$response_headers_file" > /dev/null; then
                echo "Set-Cookie Headers (parsed):"
                grep -i "^set-cookie:" "$response_headers_file" | while read -r line; do
                    echo "  $line"
                done
                echo ""
            fi
        fi
        
        if [ -f "$response_body_file" ]; then
            echo "Response Body (raw):"
            cat "$response_body_file"
            echo ""
            
            echo "Response Body (parsed JSON):"
            cat "$response_body_file" | jq '.' 2>/dev/null || echo "  (not valid JSON)"
            echo ""
        fi
        
        if [ -f "$cookie_file" ]; then
            echo "Cookies After Response:"
            inspect_cookie_jar "$cookie_file" "/dev/stdout"
            echo ""
        fi
        
    } | tee -a "$output_file"
}

# Test file permissions
# Usage: test_file_permissions <file_path> <output_file>
test_file_permissions() {
    local file_path="$1"
    local output_file="$2"
    
    log_subsection "File Permissions Test: $file_path"
    
    {
        echo "File Permissions Test:"
        echo "======================"
        echo "File: $file_path"
        echo ""
        
        if [ ! -e "$file_path" ]; then
            echo "Status: FILE DOES NOT EXIST"
            echo ""
            echo "Parent directory:"
            local parent_dir=$(dirname "$file_path")
            if [ -d "$parent_dir" ]; then
                ls -ld "$parent_dir"
                echo ""
                echo "Writable: $([ -w "$parent_dir" ] && echo 'YES' || echo 'NO')"
            else
                echo "  Parent directory does not exist: $parent_dir"
            fi
            return 0
        fi
        
        echo "File details:"
        ls -lh "$file_path"
        echo ""
        
        echo "Ownership:"
        echo "  Owner: $(stat -c '%U' "$file_path" 2>/dev/null || echo 'UNKNOWN')"
        echo "  Group: $(stat -c '%G' "$file_path" 2>/dev/null || echo 'UNKNOWN')"
        echo "  UID: $(stat -c '%u' "$file_path" 2>/dev/null || echo 'UNKNOWN')"
        echo "  GID: $(stat -c '%g' "$file_path" 2>/dev/null || echo 'UNKNOWN')"
        echo ""
        
        echo "Permissions:"
        echo "  Octal: $(stat -c '%a' "$file_path" 2>/dev/null || echo 'UNKNOWN')"
        echo "  Symbolic: $(stat -c '%A' "$file_path" 2>/dev/null || echo 'UNKNOWN')"
        echo ""
        
        echo "Access tests:"
        echo "  Readable: $([ -r "$file_path" ] && echo 'YES' || echo 'NO')"
        echo "  Writable: $([ -w "$file_path" ] && echo 'YES' || echo 'NO')"
        echo "  Executable: $([ -x "$file_path" ] && echo 'YES' || echo 'NO')"
        echo ""
        
        # Try to write a test file
        if [ -d "$file_path" ]; then
            local test_file="${file_path}/.write-test-$$"
            echo "Write test (directory):"
            if touch "$test_file" 2>/dev/null; then
                echo "  ✓ Successfully created test file: $test_file"
                rm -f "$test_file"
                echo "  ✓ Successfully deleted test file"
            else
                echo "  ✗ FAILED to create test file in directory"
            fi
        fi
        
    } | tee "$output_file"
}

# Capture system state
# Usage: capture_system_state <output_file>
capture_system_state() {
    local output_file="$1"
    
    log_subsection "System State Capture"
    
    {
        echo "System State:"
        echo "============="
        echo ""
        
        echo "User Information:"
        echo "  User: $(whoami)"
        echo "  UID: $(id -u)"
        echo "  GID: $(id -g)"
        echo "  Groups: $(id -Gn)"
        echo "  Home: $HOME"
        echo ""
        
        echo "Process Information:"
        echo "  PID: $$"
        echo "  PPID: $PPID"
        echo "  Shell: $SHELL"
        echo ""
        
        echo "Environment Variables (filtered):"
        env | grep -E '^(USER|HOME|PATH|PWD|DEPLOY_DIR|CONSOLE_DIR|COOKIE_SECURE)' | sort
        echo ""
        
        echo "Current Time:"
        echo "  Local: $(date)"
        echo "  UTC: $(date -u)"
        echo "  Timestamp: $(date +%s)"
        echo ""
        
        echo "Disk Usage (relevant paths):"
        df -h / /tmp 2>/dev/null || echo "  (df command failed)"
        echo ""
        
    } | tee "$output_file"
}

# Docker container diagnostics
# Usage: docker_diagnostics <container_name> <output_file>
docker_diagnostics() {
    local container_name="$1"
    local output_file="$2"
    
    log_subsection "Docker Container Diagnostics: $container_name"
    
    {
        echo "Docker Container Diagnostics:"
        echo "=============================="
        echo "Container: $container_name"
        echo ""
        
        echo "Container Status:"
        if docker ps --filter "name=$container_name" --format "table {{.Names}}\t{{.Status}}\t{{.State}}\t{{.Ports}}" | grep -q "$container_name"; then
            docker ps --filter "name=$container_name" --format "table {{.Names}}\t{{.Status}}\t{{.State}}\t{{.Ports}}"
            echo "  ✓ Container is running"
        else
            docker ps -a --filter "name=$container_name" --format "table {{.Names}}\t{{.Status}}\t{{.State}}"
            echo "  ✗ Container is NOT running"
        fi
        echo ""
        
        echo "Health Status:"
        local health=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "no-health-check")
        echo "  Status: $health"
        if [ "$health" = "healthy" ]; then
            echo "  ✓ Container is healthy"
        elif [ "$health" = "no-health-check" ]; then
            echo "  ⚠ No health check configured"
        else
            echo "  ✗ Container is unhealthy or not running"
        fi
        echo ""
        
        echo "Container Inspect (key fields):"
        docker inspect "$container_name" 2>/dev/null | jq '{
            State: .State,
            RestartCount: .RestartCount,
            Name: .Name,
            Image: .Config.Image,
            Created: .Created,
            Env: .Config.Env,
            Mounts: .Mounts,
            NetworkSettings: {
                IPAddress: .NetworkSettings.IPAddress,
                Ports: .NetworkSettings.Ports
            }
        }' 2>/dev/null || echo "  (inspect failed)"
        echo ""
        
        echo "Recent Logs (last 50 lines):"
        docker logs "$container_name" --tail 50 2>&1 || echo "  (logs failed)"
        echo ""
        
    } | tee "$output_file"
}

# Capture plugins.json state
# Usage: capture_plugins_json <plugins_json_path> <output_file>
capture_plugins_json() {
    local plugins_json="$1"
    local output_file="$2"
    
    log_subsection "Plugins JSON State"
    
    {
        echo "Plugins JSON State:"
        echo "==================="
        echo "File: $plugins_json"
        echo ""
        
        if [ ! -f "$plugins_json" ]; then
            echo "Status: FILE DOES NOT EXIST"
            echo '{"plugins": []}' > "$output_file.json"
            return 0
        fi
        
        echo "File details:"
        ls -lh "$plugins_json"
        echo ""
        
        echo "Content (formatted):"
        if jq '.' "$plugins_json" 2>/dev/null; then
            echo ""
            echo "✓ Valid JSON"
            
            local count=$(jq '.plugins | length' "$plugins_json" 2>/dev/null || echo "0")
            echo "Plugin count: $count"
            
            # Copy to output
            cp "$plugins_json" "$output_file.json"
        else
            echo "✗ INVALID JSON!"
            cat "$plugins_json"
            echo '{"plugins": [], "error": "Invalid JSON"}' > "$output_file.json"
        fi
        echo ""
        
    } | tee "$output_file"
}

# Capture plugins directory state
# Usage: capture_plugins_dir <plugins_dir_path> <output_file>
capture_plugins_dir() {
    local plugins_dir="$1"
    local output_file="$2"
    
    log_subsection "Plugins Directory State"
    
    {
        echo "Plugins Directory State:"
        echo "========================"
        echo "Directory: $plugins_dir"
        echo ""
        
        if [ ! -d "$plugins_dir" ]; then
            echo "Status: DIRECTORY DOES NOT EXIST"
            return 0
        fi
        
        echo "Directory details:"
        ls -ld "$plugins_dir"
        echo ""
        
        echo "File count: $(find "$plugins_dir" -maxdepth 1 -type f | wc -l)"
        echo "JAR count: $(find "$plugins_dir" -maxdepth 1 -name "*.jar" | wc -l)"
        echo ""
        
        echo "Contents (detailed):"
        ls -lh "$plugins_dir"
        echo ""
        
        echo "JAR files only:"
        find "$plugins_dir" -maxdepth 1 -name "*.jar" -exec ls -lh {} \; | head -20
        echo ""
        
    } | tee "$output_file"
}

# Compare before/after state
# Usage: compare_states <before_file> <after_file> <output_file>
compare_states() {
    local before_file="$1"
    local after_file="$2"
    local output_file="$3"
    
    log_subsection "State Comparison"
    
    {
        echo "State Comparison:"
        echo "================="
        echo ""
        
        if [ ! -f "$before_file" ]; then
            echo "ERROR: Before file does not exist: $before_file"
            return 1
        fi
        
        if [ ! -f "$after_file" ]; then
            echo "ERROR: After file does not exist: $after_file"
            return 1
        fi
        
        echo "Diff output:"
        diff -u "$before_file" "$after_file" || true
        echo ""
        
        # For JSON files, provide structured comparison
        if jq empty "$before_file" 2>/dev/null && jq empty "$after_file" 2>/dev/null; then
            echo "JSON Comparison:"
            
            local before_count=$(jq '.plugins | length' "$before_file" 2>/dev/null || echo "0")
            local after_count=$(jq '.plugins | length' "$after_file" 2>/dev/null || echo "0")
            
            echo "  Plugins before: $before_count"
            echo "  Plugins after: $after_count"
            echo "  Change: $((after_count - before_count))"
            echo ""
            
            if [ "$after_count" -gt "$before_count" ]; then
                echo "  ✓ Plugin count increased (plugins added)"
            elif [ "$after_count" -eq "$before_count" ]; then
                echo "  ⚠ Plugin count unchanged"
            else
                echo "  ✗ Plugin count decreased (unexpected)"
            fi
        fi
        
    } | tee "$output_file"
}

# Generate comprehensive summary
# Usage: generate_summary <test_results_dir> <output_file>
generate_summary() {
    local results_dir="$1"
    local output_file="$2"
    
    log_section "Generating Comprehensive Summary"
    
    {
        echo "╔════════════════════════════════════════════════════════════════╗"
        echo "║        Plugin Install Diagnostics - Comprehensive Summary     ║"
        echo "╚════════════════════════════════════════════════════════════════╝"
        echo ""
        echo "Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
        echo ""
        
        echo "═══════════════════════════════════════════════════════════════"
        echo "EXECUTIVE SUMMARY"
        echo "═══════════════════════════════════════════════════════════════"
        echo ""
        
        # Count test results
        local total_tests=0
        local passed_tests=0
        local failed_tests=0
        local skipped_tests=0
        
        if [ -d "$results_dir" ]; then
            total_tests=$(find "$results_dir" -name "*-result.txt" 2>/dev/null | wc -l)
            passed_tests=$(find "$results_dir" -name "*-result.txt" -exec grep -l "PASS" {} \; 2>/dev/null | wc -l)
            failed_tests=$(find "$results_dir" -name "*-result.txt" -exec grep -l "FAIL" {} \; 2>/dev/null | wc -l)
            skipped_tests=$(find "$results_dir" -name "*-result.txt" -exec grep -l "SKIP" {} \; 2>/dev/null | wc -l)
        fi
        
        echo "Test Results:"
        echo "  Total tests: $total_tests"
        echo "  Passed: $passed_tests"
        echo "  Failed: $failed_tests"
        echo "  Skipped: $skipped_tests"
        echo ""
        
        if [ "$failed_tests" -eq 0 ] && [ "$total_tests" -gt 0 ]; then
            echo "Overall Status: ✓ ALL TESTS PASSED"
        elif [ "$failed_tests" -gt 0 ]; then
            echo "Overall Status: ✗ FAILURES DETECTED"
        else
            echo "Overall Status: ⚠ NO TESTS RUN"
        fi
        echo ""
        
        echo "═══════════════════════════════════════════════════════════════"
        echo "DETAILED TEST RESULTS"
        echo "═══════════════════════════════════════════════════════════════"
        echo ""
        
        if [ -d "$results_dir" ]; then
            find "$results_dir" -name "*-result.txt" | sort | while read -r result_file; do
                local test_name=$(basename "$result_file" | sed 's/-result\.txt$//')
                echo "Test: $test_name"
                cat "$result_file"
                echo ""
            done
        fi
        
        echo "═══════════════════════════════════════════════════════════════"
        echo "FILES COLLECTED"
        echo "═══════════════════════════════════════════════════════════════"
        echo ""
        
        if [ -d "$results_dir" ]; then
            find "$results_dir" -type f | sort | while read -r file; do
                local rel_path=$(realpath --relative-to="$results_dir" "$file")
                local size=$(stat -c '%s' "$file" 2>/dev/null || echo "0")
                printf "  %-60s %10s bytes\n" "$rel_path" "$size"
            done
        fi
        echo ""
        
        echo "═══════════════════════════════════════════════════════════════"
        echo "END OF SUMMARY"
        echo "═══════════════════════════════════════════════════════════════"
        
    } | tee "$output_file"
}

# Export functions for use in other scripts
export -f log_info log_success log_warning log_error log_section log_subsection
export -f inspect_cookie_jar get_cookie_value validate_csrf_token
export -f log_api_request log_api_response
export -f test_file_permissions capture_system_state docker_diagnostics
export -f capture_plugins_json capture_plugins_dir compare_states
export -f generate_summary
