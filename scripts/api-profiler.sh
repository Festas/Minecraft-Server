#!/bin/bash

################################################################################
# Advanced API Profiling Script
# 
# This script profiles all major API endpoints with:
# - Detailed timing measurements
# - Both valid and invalid test scenarios
# - Request/response logging
# - Error case testing
################################################################################

set -euo pipefail

# Configuration
CONSOLE_URL="${CONSOLE_URL:-http://localhost:3000}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin}"
OUTPUT_DIR="${OUTPUT_DIR:-/tmp/api-profiler}"
COOKIE_JAR="${OUTPUT_DIR}/cookies.txt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create output directory
mkdir -p "${OUTPUT_DIR}"

# Initialize summary
SUMMARY_FILE="${OUTPUT_DIR}/SUMMARY.txt"
> "${SUMMARY_FILE}"

log() {
    echo -e "${1}" | tee -a "${SUMMARY_FILE}"
}

log_success() {
    log "${GREEN}✓ ${1}${NC}"
}

log_error() {
    log "${RED}✗ ${1}${NC}"
}

log_warning() {
    log "${YELLOW}⚠ ${1}${NC}"
}

log_info() {
    log "${BLUE}ℹ ${1}${NC}"
}

################################################################################
# Timing wrapper for curl requests
################################################################################
timed_request() {
    local name="$1"
    local method="$2"
    local url="$3"
    shift 3
    local extra_args=("$@")
    
    local output_file="${OUTPUT_DIR}/${name}-response.json"
    local headers_file="${OUTPUT_DIR}/${name}-headers.txt"
    local timing_file="${OUTPUT_DIR}/${name}-timing.txt"
    
    log_info "Testing: ${name}"
    
    # Capture timing information
    local start_time=$(date +%s%3N)
    
    # Make request with timing
    local http_code
    http_code=$(curl -w "%{http_code}" -o "${output_file}" \
        -D "${headers_file}" \
        --write-out "\ntime_namelookup: %{time_namelookup}\ntime_connect: %{time_connect}\ntime_appconnect: %{time_appconnect}\ntime_pretransfer: %{time_pretransfer}\ntime_redirect: %{time_redirect}\ntime_starttransfer: %{time_starttransfer}\ntime_total: %{time_total}\nhttp_code: %{http_code}\nsize_download: %{size_download}\nspeed_download: %{speed_download}\n" \
        -X "${method}" \
        -H "Content-Type: application/json" \
        -b "${COOKIE_JAR}" \
        -c "${COOKIE_JAR}" \
        --silent \
        "${extra_args[@]}" \
        "${url}" 2>&1 | tee "${timing_file}")
    
    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))
    
    # Parse http code from timing output
    local status_code
    status_code=$(grep "^http_code:" "${timing_file}" | cut -d' ' -f2 || echo "000")
    
    # Get total time from curl
    local total_time
    total_time=$(grep "^time_total:" "${timing_file}" | cut -d' ' -f2 || echo "0")
    
    # Log result
    echo "  Status: ${status_code} | Duration: ${duration}ms | Curl Time: ${total_time}s"
    echo "  Response saved to: ${output_file}"
    echo ""
    
    # Return status code
    echo "${status_code}"
}

################################################################################
# Test Scenarios
################################################################################

log "================================================================================"
log "Advanced API Profiling - $(date)"
log "================================================================================"
log ""
log "Configuration:"
log "  Console URL: ${CONSOLE_URL}"
log "  Username: ${ADMIN_USERNAME}"
log "  Output Dir: ${OUTPUT_DIR}"
log ""

# Clean cookie jar
> "${COOKIE_JAR}"

################################################################################
# 1. Authentication Flow
################################################################################
log "================================================================================"
log "1. AUTHENTICATION FLOW"
log "================================================================================"
log ""

# 1.1 Login - Valid Credentials
status=$(timed_request "01-login-valid" "POST" "${CONSOLE_URL}/api/login" \
    -d "{\"username\":\"${ADMIN_USERNAME}\",\"password\":\"${ADMIN_PASSWORD}\"}")

if [ "${status}" = "200" ] || [ "${status}" = "201" ]; then
    log_success "Login successful"
else
    log_error "Login failed with status ${status}"
fi

# 1.2 Session Check
status=$(timed_request "02-session-check" "GET" "${CONSOLE_URL}/api/session")

if [ "${status}" = "200" ]; then
    log_success "Session check successful"
else
    log_error "Session check failed with status ${status}"
fi

# 1.3 CSRF Token Fetch
status=$(timed_request "03-csrf-token" "GET" "${CONSOLE_URL}/api/csrf-token")

if [ "${status}" = "200" ]; then
    log_success "CSRF token fetch successful"
    # Extract CSRF token
    CSRF_TOKEN=$(grep -o '"csrfToken":"[^"]*"' "${OUTPUT_DIR}/03-csrf-token-response.json" | cut -d'"' -f4 || echo "")
    log_info "CSRF Token extracted: ${CSRF_TOKEN:0:20}..."
else
    log_error "CSRF token fetch failed with status ${status}"
fi

log ""

################################################################################
# 2. Plugin Manager APIs
################################################################################
log "================================================================================"
log "2. PLUGIN MANAGER APIs"
log "================================================================================"
log ""

# 2.1 List Plugins - Valid
status=$(timed_request "04-plugins-list" "GET" "${CONSOLE_URL}/api/plugins")

if [ "${status}" = "200" ]; then
    log_success "Plugin list fetch successful"
else
    log_error "Plugin list fetch failed with status ${status}"
fi

# 2.2 Plugin History - Valid
status=$(timed_request "05-plugins-history" "GET" "${CONSOLE_URL}/api/plugins/history")

if [ "${status}" = "200" ]; then
    log_success "Plugin history fetch successful"
else
    log_error "Plugin history fetch failed with status ${status}"
fi

log ""

################################################################################
# 3. RCON APIs
################################################################################
log "================================================================================"
log "3. RCON APIs"
log "================================================================================"
log ""

# 3.1 Server Status - Valid
status=$(timed_request "06-server-status" "GET" "${CONSOLE_URL}/api/status")

if [ "${status}" = "200" ]; then
    log_success "Server status fetch successful"
else
    log_error "Server status fetch failed with status ${status}"
fi

# 3.2 Players List - Valid
status=$(timed_request "07-players-list" "GET" "${CONSOLE_URL}/api/players")

if [ "${status}" = "200" ]; then
    log_success "Players list fetch successful"
else
    log_error "Players list fetch failed with status ${status}"
fi

log ""

################################################################################
# 4. Error Case Testing
################################################################################
log "================================================================================"
log "4. ERROR CASE TESTING"
log "================================================================================"
log ""

# 4.1 Invalid Login
log_info "Testing invalid credentials..."
status=$(timed_request "08-login-invalid" "POST" "${CONSOLE_URL}/api/login" \
    -d '{"username":"invalid","password":"wrongpassword"}')

if [ "${status}" = "401" ] || [ "${status}" = "403" ]; then
    log_success "Invalid login correctly rejected (${status})"
else
    log_warning "Invalid login returned unexpected status ${status}"
fi

# 4.2 Missing CSRF Token (if we have a valid session)
log_info "Testing missing CSRF token..."
status=$(timed_request "09-plugin-install-no-csrf" "POST" "${CONSOLE_URL}/api/plugins/install" \
    -d '{"url":"https://example.com/test.jar"}')

if [ "${status}" = "403" ]; then
    log_success "Missing CSRF correctly rejected (403)"
else
    log_warning "Missing CSRF returned unexpected status ${status}"
fi

# 4.3 Invalid CSRF Token
if [ -n "${CSRF_TOKEN}" ]; then
    log_info "Testing invalid CSRF token..."
    status=$(timed_request "10-plugin-install-bad-csrf" "POST" "${CONSOLE_URL}/api/plugins/install" \
        -H "x-csrf-token: invalid-token-12345" \
        -d '{"url":"https://example.com/test.jar"}')
    
    if [ "${status}" = "403" ]; then
        log_success "Invalid CSRF correctly rejected (403)"
    else
        log_warning "Invalid CSRF returned unexpected status ${status}"
    fi
fi

# 4.4 Invalid API Endpoint
status=$(timed_request "11-invalid-endpoint" "GET" "${CONSOLE_URL}/api/nonexistent")

if [ "${status}" = "404" ]; then
    log_success "Invalid endpoint correctly returned 404"
else
    log_warning "Invalid endpoint returned unexpected status ${status}"
fi

log ""

################################################################################
# 5. Performance Summary
################################################################################
log "================================================================================"
log "5. PERFORMANCE SUMMARY"
log "================================================================================"
log ""

# Aggregate timing data
log "API Response Times (curl time_total):"
log ""

for timing_file in "${OUTPUT_DIR}"/*-timing.txt; do
    if [ -f "${timing_file}" ]; then
        name=$(basename "${timing_file}" -timing.txt)
        time_total=$(grep "^time_total:" "${timing_file}" | cut -d' ' -f2)
        http_code=$(grep "^http_code:" "${timing_file}" | cut -d' ' -f2)
        
        printf "  %-35s %8s   (HTTP %s)\n" "${name}" "${time_total}s" "${http_code}" | tee -a "${SUMMARY_FILE}"
    fi
done

log ""

################################################################################
# 6. Request/Response Analysis
################################################################################
log "================================================================================"
log "6. REQUEST/RESPONSE ANALYSIS"
log "================================================================================"
log ""

# Count total requests
total_requests=$(ls -1 "${OUTPUT_DIR}"/*-response.json 2>/dev/null | wc -l)
log "Total API requests: ${total_requests}"

# Count by status code
success_count=$(grep -l "^HTTP/.*200" "${OUTPUT_DIR}"/*-headers.txt 2>/dev/null | wc -l)
auth_error_count=$(grep -l "^HTTP/.*401\|^HTTP/.*403" "${OUTPUT_DIR}"/*-headers.txt 2>/dev/null | wc -l)
not_found_count=$(grep -l "^HTTP/.*404" "${OUTPUT_DIR}"/*-headers.txt 2>/dev/null | wc -l)
server_error_count=$(grep -l "^HTTP/.*500\|^HTTP/.*502\|^HTTP/.*503" "${OUTPUT_DIR}"/*-headers.txt 2>/dev/null | wc -l)

log "  Successful (2xx): ${success_count}"
log "  Auth errors (401/403): ${auth_error_count}"
log "  Not found (404): ${not_found_count}"
log "  Server errors (5xx): ${server_error_count}"

log ""

################################################################################
# 7. Diagnostic Files Index
################################################################################
log "================================================================================"
log "7. DIAGNOSTIC FILES"
log "================================================================================"
log ""
log "All diagnostic files saved to: ${OUTPUT_DIR}"
log ""
log "Response files:"
ls -1 "${OUTPUT_DIR}"/*-response.json 2>/dev/null | while read -r file; do
    log "  - $(basename "${file}")"
done

log ""
log "Timing files:"
ls -1 "${OUTPUT_DIR}"/*-timing.txt 2>/dev/null | while read -r file; do
    log "  - $(basename "${file}")"
done

log ""
log "Header files:"
ls -1 "${OUTPUT_DIR}"/*-headers.txt 2>/dev/null | while read -r file; do
    log "  - $(basename "${file}")"
done

log ""

################################################################################
# 8. Root Cause Analysis Guide
################################################################################
log "================================================================================"
log "8. ROOT CAUSE ANALYSIS GUIDE"
log "================================================================================"
log ""
log "How to use these diagnostics:"
log ""
log "1. Check SUMMARY.txt for overall timing and status codes"
log "2. Review *-response.json files for API response content"
log "3. Examine *-timing.txt for detailed timing breakdown"
log "4. Check *-headers.txt for HTTP headers and cookies"
log "5. Compare valid vs invalid scenarios to identify issues"
log ""
log "Common issues to look for:"
log "  - Slow response times (>1s) may indicate backend delays"
log "  - 403 errors may indicate CSRF or session issues"
log "  - 500 errors may indicate backend crashes"
log "  - Missing or malformed responses may indicate network issues"
log ""

################################################################################
# Complete
################################################################################
log "================================================================================"
log "API Profiling Complete - $(date)"
log "================================================================================"
log ""

# Exit with error if we have server errors
if [ "${server_error_count}" -gt 0 ]; then
    log_error "Server errors detected! Check logs above."
    exit 1
fi

log_success "All API profiling completed successfully"
exit 0
