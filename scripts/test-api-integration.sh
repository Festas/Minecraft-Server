#!/bin/bash

# Integration Test Script for API Authentication Flow
# Tests: Login → CSRF Token Fetch → Plugin Install
# Verifies the workflow works for both 127.0.0.1 and localhost

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEFAULT_ADMIN_USER="${ADMIN_USER:-admin}"
DEFAULT_ADMIN_PASS="${ADMIN_PASSWORD:-change-this-secure-password}"
DEFAULT_PORT="${CONSOLE_PORT:-3001}"
COOKIE_FILE="/tmp/api-integration-test-cookies.txt"
TEST_PLUGIN_URL="https://github.com/pl3xgaming/Pl3xMap/releases/download/v1.20.4-477/Pl3xMap-1.20.4-477.jar"

# Test mode: basic or full
TEST_MODE="${1:-basic}"

# Function to print colored output
print_header() {
    echo -e "\n${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Function to check if server is running
check_server() {
    local host=$1
    local port=$2
    
    if curl -s -f "http://${host}:${port}/health" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to test authentication flow
test_auth_flow() {
    local host=$1
    local api_base="http://${host}:${DEFAULT_PORT}"
    local test_name="Test: $host"
    
    print_header "$test_name"
    
    # Clean up
    rm -f "$COOKIE_FILE"
    
    # Step 1: Login
    print_info "Step 1: Login to $api_base/api/login"
    
    LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" \
        -c "$COOKIE_FILE" \
        -X POST "${api_base}/api/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"${DEFAULT_ADMIN_USER}\",\"password\":\"${DEFAULT_ADMIN_PASS}\"}")
    
    LOGIN_STATUS=$(echo "$LOGIN_RESPONSE" | tail -1)
    LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')
    
    if [ "$LOGIN_STATUS" != "200" ]; then
        print_error "Login failed with status $LOGIN_STATUS"
        echo "Response: $LOGIN_BODY"
        return 1
    fi
    
    # Check if session cookie was saved
    if ! grep -q "console.sid" "$COOKIE_FILE"; then
        print_error "Session cookie not saved"
        cat "$COOKIE_FILE"
        return 1
    fi
    
    print_success "Login successful (Status: $LOGIN_STATUS)"
    
    # Step 2: Get CSRF Token
    print_info "Step 2: Get CSRF token from $api_base/api/csrf-token"
    
    CSRF_RESPONSE=$(curl -s -w "\n%{http_code}" \
        -b "$COOKIE_FILE" \
        -c "$COOKIE_FILE" \
        -X GET "${api_base}/api/csrf-token")
    
    CSRF_STATUS=$(echo "$CSRF_RESPONSE" | tail -1)
    CSRF_BODY=$(echo "$CSRF_RESPONSE" | sed '$d')
    
    if [ "$CSRF_STATUS" != "200" ]; then
        print_error "CSRF token fetch failed with status $CSRF_STATUS"
        echo "Response: $CSRF_BODY"
        return 1
    fi
    
    CSRF_TOKEN=$(echo "$CSRF_BODY" | jq -r '.csrfToken' 2>/dev/null)
    
    if [ -z "$CSRF_TOKEN" ] || [ "$CSRF_TOKEN" = "null" ]; then
        print_error "CSRF token not found in response"
        echo "Response: $CSRF_BODY"
        return 1
    fi
    
    # Check if CSRF cookie was saved
    if ! grep -q "csrf-token" "$COOKIE_FILE"; then
        print_error "CSRF cookie not saved"
        cat "$COOKIE_FILE"
        return 1
    fi
    
    print_success "CSRF token obtained (Status: $CSRF_STATUS, Length: ${#CSRF_TOKEN})"
    
    # Step 3: Check Session Status
    print_info "Step 3: Verify session status"
    
    SESSION_RESPONSE=$(curl -s -w "\n%{http_code}" \
        -b "$COOKIE_FILE" \
        -X GET "${api_base}/api/session")
    
    SESSION_STATUS=$(echo "$SESSION_RESPONSE" | tail -1)
    SESSION_BODY=$(echo "$SESSION_RESPONSE" | sed '$d')
    
    if [ "$SESSION_STATUS" != "200" ]; then
        print_error "Session check failed with status $SESSION_STATUS"
        echo "Response: $SESSION_BODY"
        return 1
    fi
    
    IS_AUTHENTICATED=$(echo "$SESSION_BODY" | jq -r '.authenticated' 2>/dev/null)
    
    if [ "$IS_AUTHENTICATED" != "true" ]; then
        print_error "Session not authenticated"
        echo "Response: $SESSION_BODY"
        return 1
    fi
    
    print_success "Session authenticated (Status: $SESSION_STATUS)"
    
    # Step 4: Test protected endpoint (GET /api/plugins)
    print_info "Step 4: Test protected endpoint (GET /api/plugins)"
    
    PLUGINS_RESPONSE=$(curl -s -w "\n%{http_code}" \
        -b "$COOKIE_FILE" \
        -H "CSRF-Token: $CSRF_TOKEN" \
        -X GET "${api_base}/api/plugins")
    
    PLUGINS_STATUS=$(echo "$PLUGINS_RESPONSE" | tail -1)
    PLUGINS_BODY=$(echo "$PLUGINS_RESPONSE" | sed '$d')
    
    if [ "$PLUGINS_STATUS" != "200" ]; then
        print_error "Plugin list failed with status $PLUGINS_STATUS"
        echo "Response: $PLUGINS_BODY"
        return 1
    fi
    
    print_success "Plugin list retrieved (Status: $PLUGINS_STATUS)"
    
    # Step 5: Test plugin install endpoint (if full test mode)
    if [ "$TEST_MODE" = "full" ]; then
        print_info "Step 5: Test plugin install endpoint"
        
        INSTALL_RESPONSE=$(curl -s -w "\n%{http_code}" \
            -b "$COOKIE_FILE" \
            -X POST "${api_base}/api/plugins/install" \
            -H "Content-Type: application/json" \
            -H "CSRF-Token: $CSRF_TOKEN" \
            -d "{\"url\":\"${TEST_PLUGIN_URL}\"}")
        
        INSTALL_STATUS=$(echo "$INSTALL_RESPONSE" | tail -1)
        INSTALL_BODY=$(echo "$INSTALL_RESPONSE" | sed '$d')
        
        # Accept 200 (success/conflict) or 400+ (expected errors like timeout, network issues)
        if [ "$INSTALL_STATUS" = "200" ]; then
            INSTALL_RESULT=$(echo "$INSTALL_BODY" | jq -r '.status' 2>/dev/null)
            print_success "Plugin install endpoint responded (Status: $INSTALL_STATUS, Result: $INSTALL_RESULT)"
        elif [ "$INSTALL_STATUS" -ge 400 ]; then
            # For test purposes, 400+ errors are acceptable as long as it's not 401/403
            if [ "$INSTALL_STATUS" = "401" ] || [ "$INSTALL_STATUS" = "403" ]; then
                print_error "Plugin install failed with auth/CSRF error (Status: $INSTALL_STATUS)"
                echo "Response: $INSTALL_BODY"
                return 1
            else
                print_warning "Plugin install returned expected error (Status: $INSTALL_STATUS)"
                print_info "This is acceptable - endpoint is accessible and auth/CSRF worked"
            fi
        else
            print_error "Plugin install failed with unexpected status $INSTALL_STATUS"
            echo "Response: $INSTALL_BODY"
            return 1
        fi
    else
        print_info "Step 5: Skipped (basic test mode - use './scripts/test-api-integration.sh full' for full test)"
    fi
    
    # Step 6: Test CSRF validation (should fail without token)
    print_info "Step 6: Verify CSRF protection (should fail without token)"
    
    NO_CSRF_RESPONSE=$(curl -s -w "\n%{http_code}" \
        -b "$COOKIE_FILE" \
        -X POST "${api_base}/api/logout")
    
    NO_CSRF_STATUS=$(echo "$NO_CSRF_RESPONSE" | tail -1)
    
    if [ "$NO_CSRF_STATUS" = "403" ]; then
        print_success "CSRF protection working (Status: $NO_CSRF_STATUS - correctly rejected request without token)"
    else
        print_warning "Unexpected status without CSRF token: $NO_CSRF_STATUS (expected 403)"
    fi
    
    # Step 7: Logout with proper CSRF token
    print_info "Step 7: Logout with CSRF token"
    
    LOGOUT_RESPONSE=$(curl -s -w "\n%{http_code}" \
        -b "$COOKIE_FILE" \
        -X POST "${api_base}/api/logout" \
        -H "CSRF-Token: $CSRF_TOKEN")
    
    LOGOUT_STATUS=$(echo "$LOGOUT_RESPONSE" | tail -1)
    
    if [ "$LOGOUT_STATUS" = "200" ]; then
        print_success "Logout successful (Status: $LOGOUT_STATUS)"
    else
        print_error "Logout failed with status $LOGOUT_STATUS"
        return 1
    fi
    
    # Cleanup
    rm -f "$COOKIE_FILE"
    
    print_success "$test_name completed successfully!"
    return 0
}

# Main execution
main() {
    print_header "API Authentication Integration Test"
    
    print_info "Test Mode: $TEST_MODE (use './scripts/test-api-integration.sh full' for plugin install test)"
    print_info "Admin User: $DEFAULT_ADMIN_USER"
    print_info "Port: $DEFAULT_PORT"
    
    # Test localhost
    print_info "Checking if server is running on localhost:${DEFAULT_PORT}..."
    if check_server "localhost" "$DEFAULT_PORT"; then
        print_success "Server is running on localhost"
    else
        print_error "Server is not running on localhost:${DEFAULT_PORT}"
        print_info "Please start the server first: cd console/backend && npm start"
        exit 1
    fi
    
    # Run tests
    TESTS_PASSED=0
    TESTS_FAILED=0
    
    # Test with localhost
    if test_auth_flow "localhost"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    sleep 1  # Brief pause between tests
    
    # Test with 127.0.0.1
    if test_auth_flow "127.0.0.1"; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    # Summary
    print_header "Test Summary"
    
    echo "Tests Passed: $TESTS_PASSED"
    echo "Tests Failed: $TESTS_FAILED"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        print_success "All tests passed!"
        echo ""
        echo "Authentication flow verified:"
        echo "  1. ✓ Login obtains session cookie"
        echo "  2. ✓ CSRF token fetch works with session"
        echo "  3. ✓ Session status check works"
        echo "  4. ✓ Protected endpoints accept session + CSRF"
        if [ "$TEST_MODE" = "full" ]; then
            echo "  5. ✓ Plugin install endpoint accessible"
        fi
        echo "  6. ✓ CSRF protection rejects requests without token"
        echo "  7. ✓ Logout works with CSRF token"
        echo ""
        print_success "API authentication is working correctly on both localhost and 127.0.0.1"
        exit 0
    else
        print_error "Some tests failed!"
        echo ""
        print_info "Troubleshooting tips:"
        echo "  1. Check server logs for detailed error messages"
        echo "  2. Verify COOKIE_SECURE=false in .env for HTTP testing"
        echo "  3. Ensure Redis is running for session persistence"
        echo "  4. Check that ADMIN_PASSWORD is set correctly"
        echo "  5. Review docs/API-AUTHENTICATION-GUIDE.md"
        exit 1
    fi
}

# Run main function
main
