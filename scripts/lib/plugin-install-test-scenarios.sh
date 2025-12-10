#!/bin/bash
#
# Plugin Install Test Scenarios
# Runs comprehensive test scenarios for plugin installation with full diagnostics
#
# Scenarios tested:
# 1. Valid CSRF and session (expected: success)
# 2. Missing CSRF token (expected: 403)
# 3. Invalid CSRF token (expected: 403)
# 4. Missing session cookie (expected: 401)
# 5. Invalid session cookie (expected: 401)
# 6. Expired session (if feasible)
#

set -euo pipefail

# Source the diagnostics library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/plugin-install-diagnostics-lib.sh"

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3001}"
ADMIN_USER="${ADMIN_USER:-}"
ADMIN_PASS="${ADMIN_PASS:-}"
TEST_PLUGIN_URL="${TEST_PLUGIN_URL:-}"
RESULTS_DIR="${RESULTS_DIR:-/tmp/plugin-install-test-results}"

# Create results directory
mkdir -p "$RESULTS_DIR"

# Global test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Test result tracking
declare -A TEST_RESULTS

# Increment test counter and record result
# Usage: record_test_result <test_name> <result>
record_test_result() {
    local test_name="$1"
    local result="$2"  # PASS, FAIL, or SKIP
    
    ((TOTAL_TESTS++))
    
    case "$result" in
        PASS)
            ((PASSED_TESTS++))
            log_success "Test PASSED: $test_name"
            ;;
        FAIL)
            ((FAILED_TESTS++))
            log_error "Test FAILED: $test_name"
            ;;
        SKIP)
            ((SKIPPED_TESTS++))
            log_warning "Test SKIPPED: $test_name"
            ;;
    esac
    
    TEST_RESULTS["$test_name"]="$result"
    echo "$result" > "$RESULTS_DIR/${test_name}-result.txt"
}

# Authenticate and get session cookie
# Usage: authenticate <cookie_file> <output_dir>
# Returns: 0 on success, 1 on failure
authenticate() {
    local cookie_file="$1"
    local output_dir="$2"
    
    log_subsection "Authentication"
    
    # Validate credentials
    if [ -z "$ADMIN_USER" ] || [ -z "$ADMIN_PASS" ]; then
        log_error "ADMIN_USER or ADMIN_PASS not set"
        return 1
    fi
    
    # Prepare request
    local request_body=$(jq -n --arg user "$ADMIN_USER" --arg pass "$ADMIN_PASS" \
        '{username: $user, password: $pass}')
    
    echo "$request_body" > "$output_dir/login-request.json"
    
    # Make login request
    local response=$(curl -s -c "$cookie_file" -w "\n%{http_code}" \
        -X POST "$API_BASE_URL/api/login" \
        -H "Content-Type: application/json" \
        -d "$request_body" 2>&1)
    
    local status=$(echo "$response" | tail -1)
    local body=$(echo "$response" | sed '$d')
    
    echo "$status" > "$output_dir/login-status.txt"
    echo "$body" > "$output_dir/login-response.json"
    
    log_info "Login status: $status"
    
    if [ "$status" = "200" ]; then
        log_success "Authentication successful"
        inspect_cookie_jar "$cookie_file" "$output_dir/post-login-cookies.txt"
        return 0
    else
        log_error "Authentication failed"
        log_error "Response: $body"
        return 1
    fi
}

# Get CSRF token
# Usage: get_csrf_token <cookie_file> <output_dir>
# Returns: Token on success, empty on failure
get_csrf_token() {
    local cookie_file="$1"
    local output_dir="$2"
    
    log_subsection "CSRF Token Request"
    
    # Make CSRF token request
    local response=$(curl -s -b "$cookie_file" -c "$cookie_file" \
        -w "\n%{http_code}" \
        -D "$output_dir/csrf-response-headers.txt" \
        -X GET "$API_BASE_URL/api/csrf-token" 2>&1)
    
    local status=$(echo "$response" | tail -1)
    local body=$(echo "$response" | sed '$d')
    
    echo "$status" > "$output_dir/csrf-status.txt"
    echo "$body" > "$output_dir/csrf-response.json"
    
    log_info "CSRF token request status: $status"
    
    if [ "$status" = "200" ]; then
        local token=$(echo "$body" | jq -r '.csrfToken // empty')
        
        if [ -n "$token" ]; then
            log_success "CSRF token obtained"
            log_info "Token length: ${#token} chars"
            
            # Validate token
            validate_csrf_token "$output_dir/csrf-response.json" "$cookie_file" "$output_dir/csrf-validation.txt"
            
            # Inspect cookies after CSRF
            inspect_cookie_jar "$cookie_file" "$output_dir/post-csrf-cookies.txt"
            
            echo "$token"
            return 0
        else
            log_error "Failed to parse CSRF token from response"
            log_error "Response: $body"
            return 1
        fi
    else
        log_error "CSRF token request failed"
        log_error "Response: $body"
        return 1
    fi
}

# Test plugin install
# Usage: test_plugin_install <cookie_file> <csrf_token> <output_dir> <scenario_name>
# Returns: 0 on expected result, 1 on unexpected result
test_plugin_install() {
    local cookie_file="$1"
    local csrf_token="$2"
    local output_dir="$3"
    local scenario_name="$4"
    
    log_subsection "Plugin Install Test: $scenario_name"
    
    # Prepare request body
    local request_body=$(jq -n --arg url "$TEST_PLUGIN_URL" '{url: $url}')
    echo "$request_body" > "$output_dir/install-request.json"
    
    # Build curl command
    local curl_cmd="curl -s -b \"$cookie_file\" -c \"$cookie_file\" -w \"\\n%{http_code}\" -D \"$output_dir/install-response-headers.txt\" -X POST \"$API_BASE_URL/api/plugins/install\" -H \"Content-Type: application/json\""
    
    # Add CSRF token header if provided
    if [ -n "$csrf_token" ]; then
        curl_cmd="$curl_cmd -H \"CSRF-Token: $csrf_token\""
    fi
    
    curl_cmd="$curl_cmd -d @\"$output_dir/install-request.json\""
    
    # Log the request
    log_info "Making plugin install request..."
    
    # Execute request
    local response=$(eval "$curl_cmd" 2>&1)
    
    local status=$(echo "$response" | tail -1)
    local body=$(echo "$response" | sed '$d')
    
    echo "$status" > "$output_dir/install-status.txt"
    echo "$body" > "$output_dir/install-response.json"
    
    log_info "Install API status: $status"
    log_info "Response: $(echo "$body" | jq -c '.' 2>/dev/null || echo "$body")"
    
    # Inspect cookies after install
    inspect_cookie_jar "$cookie_file" "$output_dir/post-install-cookies.txt"
    
    # Return status for scenario validation
    echo "$status"
}

# Scenario 1: Valid CSRF and session (expected: success)
test_scenario_valid() {
    log_section "Scenario 1: Valid CSRF and Session"
    
    local scenario_dir="$RESULTS_DIR/scenario-01-valid"
    mkdir -p "$scenario_dir"
    
    local cookie_file="$scenario_dir/cookies.txt"
    
    # Authenticate
    if ! authenticate "$cookie_file" "$scenario_dir"; then
        record_test_result "scenario-01-valid" "FAIL"
        echo "FAIL: Authentication failed" >> "$scenario_dir/scenario-01-valid-result.txt"
        return 1
    fi
    
    # Get CSRF token
    local csrf_token=$(get_csrf_token "$cookie_file" "$scenario_dir")
    if [ -z "$csrf_token" ]; then
        record_test_result "scenario-01-valid" "FAIL"
        echo "FAIL: CSRF token acquisition failed" >> "$scenario_dir/scenario-01-valid-result.txt"
        return 1
    fi
    
    # Test install
    local status=$(test_plugin_install "$cookie_file" "$csrf_token" "$scenario_dir" "valid")
    
    # Validate result (expect 200 or 201, or possibly 409 for conflict)
    if [[ "$status" =~ ^(200|201|409)$ ]]; then
        record_test_result "scenario-01-valid" "PASS"
        echo "PASS: Install succeeded or returned expected status ($status)" >> "$scenario_dir/scenario-01-valid-result.txt"
        return 0
    else
        record_test_result "scenario-01-valid" "FAIL"
        echo "FAIL: Unexpected status code $status (expected 200, 201, or 409)" >> "$scenario_dir/scenario-01-valid-result.txt"
        return 1
    fi
}

# Scenario 2: Missing CSRF token (expected: 403)
test_scenario_missing_csrf() {
    log_section "Scenario 2: Missing CSRF Token"
    
    local scenario_dir="$RESULTS_DIR/scenario-02-missing-csrf"
    mkdir -p "$scenario_dir"
    
    local cookie_file="$scenario_dir/cookies.txt"
    
    # Authenticate
    if ! authenticate "$cookie_file" "$scenario_dir"; then
        record_test_result "scenario-02-missing-csrf" "SKIP"
        echo "SKIP: Authentication failed" >> "$scenario_dir/scenario-02-missing-csrf-result.txt"
        return 1
    fi
    
    # Skip getting CSRF token - test without it
    log_info "Intentionally skipping CSRF token acquisition"
    
    # Test install without CSRF token (pass empty string)
    local status=$(test_plugin_install "$cookie_file" "" "$scenario_dir" "missing-csrf")
    
    # Validate result (expect 403 Forbidden)
    if [ "$status" = "403" ]; then
        record_test_result "scenario-02-missing-csrf" "PASS"
        echo "PASS: Missing CSRF token correctly rejected with 403" >> "$scenario_dir/scenario-02-missing-csrf-result.txt"
        return 0
    else
        record_test_result "scenario-02-missing-csrf" "FAIL"
        echo "FAIL: Expected 403, got $status" >> "$scenario_dir/scenario-02-missing-csrf-result.txt"
        return 1
    fi
}

# Scenario 3: Invalid CSRF token (expected: 403)
test_scenario_invalid_csrf() {
    log_section "Scenario 3: Invalid CSRF Token"
    
    local scenario_dir="$RESULTS_DIR/scenario-03-invalid-csrf"
    mkdir -p "$scenario_dir"
    
    local cookie_file="$scenario_dir/cookies.txt"
    
    # Authenticate
    if ! authenticate "$cookie_file" "$scenario_dir"; then
        record_test_result "scenario-03-invalid-csrf" "SKIP"
        echo "SKIP: Authentication failed" >> "$scenario_dir/scenario-03-invalid-csrf-result.txt"
        return 1
    fi
    
    # Get valid CSRF token but use an invalid one
    local valid_token=$(get_csrf_token "$cookie_file" "$scenario_dir")
    if [ -z "$valid_token" ]; then
        record_test_result "scenario-03-invalid-csrf" "SKIP"
        echo "SKIP: Could not obtain valid CSRF token for comparison" >> "$scenario_dir/scenario-03-invalid-csrf-result.txt"
        return 1
    fi
    
    # Create invalid token (just modify the valid one)
    local invalid_token="${valid_token}INVALID"
    log_info "Using invalid CSRF token: ${invalid_token:0:50}..."
    
    # Test install with invalid CSRF token
    local status=$(test_plugin_install "$cookie_file" "$invalid_token" "$scenario_dir" "invalid-csrf")
    
    # Validate result (expect 403 Forbidden)
    if [ "$status" = "403" ]; then
        record_test_result "scenario-03-invalid-csrf" "PASS"
        echo "PASS: Invalid CSRF token correctly rejected with 403" >> "$scenario_dir/scenario-03-invalid-csrf-result.txt"
        return 0
    else
        record_test_result "scenario-03-invalid-csrf" "FAIL"
        echo "FAIL: Expected 403, got $status" >> "$scenario_dir/scenario-03-invalid-csrf-result.txt"
        return 1
    fi
}

# Scenario 4: Missing session cookie (expected: 401)
test_scenario_missing_session() {
    log_section "Scenario 4: Missing Session Cookie"
    
    local scenario_dir="$RESULTS_DIR/scenario-04-missing-session"
    mkdir -p "$scenario_dir"
    
    local cookie_file="$scenario_dir/cookies.txt"
    
    # Don't authenticate - skip session cookie
    log_info "Intentionally skipping authentication (no session cookie)"
    
    # Create empty cookie file
    touch "$cookie_file"
    
    # Try to get CSRF token without session (this might fail too)
    log_info "Attempting to get CSRF token without session..."
    local csrf_token=$(get_csrf_token "$cookie_file" "$scenario_dir" || echo "")
    
    # Even if we got a CSRF token, test install without session
    # Use empty cookie file to ensure no session
    echo "# Netscape HTTP Cookie File" > "$cookie_file"
    
    # Test install without session cookie
    local status=$(test_plugin_install "$cookie_file" "${csrf_token:-FAKE_TOKEN}" "$scenario_dir" "missing-session")
    
    # Validate result (expect 401 Unauthorized)
    if [ "$status" = "401" ]; then
        record_test_result "scenario-04-missing-session" "PASS"
        echo "PASS: Missing session correctly rejected with 401" >> "$scenario_dir/scenario-04-missing-session-result.txt"
        return 0
    else
        record_test_result "scenario-04-missing-session" "FAIL"
        echo "FAIL: Expected 401, got $status" >> "$scenario_dir/scenario-04-missing-session-result.txt"
        return 1
    fi
}

# Scenario 5: Invalid session cookie (expected: 401)
test_scenario_invalid_session() {
    log_section "Scenario 5: Invalid Session Cookie"
    
    local scenario_dir="$RESULTS_DIR/scenario-05-invalid-session"
    mkdir -p "$scenario_dir"
    
    local cookie_file="$scenario_dir/cookies.txt"
    
    # Create cookie file with invalid session
    cat > "$cookie_file" << 'EOF'
# Netscape HTTP Cookie File
localhost	FALSE	/	FALSE	0	connect.sid	s%3AINVALID_SESSION_ID.INVALID_SIGNATURE
EOF
    
    log_info "Using invalid session cookie"
    inspect_cookie_jar "$cookie_file" "$scenario_dir/invalid-session-cookies.txt"
    
    # Try to get CSRF token with invalid session
    local csrf_token=$(get_csrf_token "$cookie_file" "$scenario_dir" || echo "FAKE_TOKEN")
    
    # Test install with invalid session
    local status=$(test_plugin_install "$cookie_file" "$csrf_token" "$scenario_dir" "invalid-session")
    
    # Validate result (expect 401 Unauthorized)
    if [ "$status" = "401" ]; then
        record_test_result "scenario-05-invalid-session" "PASS"
        echo "PASS: Invalid session correctly rejected with 401" >> "$scenario_dir/scenario-05-invalid-session-result.txt"
        return 0
    else
        record_test_result "scenario-05-invalid-session" "FAIL"
        echo "FAIL: Expected 401, got $status" >> "$scenario_dir/scenario-05-invalid-session-result.txt"
        return 1
    fi
}

# Scenario 6: Expired session (if feasible - this is tricky to test)
test_scenario_expired_session() {
    log_section "Scenario 6: Expired Session (Best Effort)"
    
    local scenario_dir="$RESULTS_DIR/scenario-06-expired-session"
    mkdir -p "$scenario_dir"
    
    # This scenario is difficult to test without manipulating time or session TTL
    # We'll skip it for now but log the attempt
    log_warning "Expired session testing requires time manipulation or session TTL modification"
    log_warning "Skipping this scenario for now"
    
    record_test_result "scenario-06-expired-session" "SKIP"
    echo "SKIP: Expired session testing not implemented (requires time manipulation)" >> "$scenario_dir/scenario-06-expired-session-result.txt"
    
    return 0
}

# Main test execution
main() {
    log_section "Plugin Install Test Scenarios - Starting"
    
    # Validate prerequisites
    if [ -z "$ADMIN_USER" ] || [ -z "$ADMIN_PASS" ]; then
        log_error "ADMIN_USER and ADMIN_PASS environment variables must be set"
        exit 1
    fi
    
    if [ -z "$TEST_PLUGIN_URL" ]; then
        log_error "TEST_PLUGIN_URL environment variable must be set"
        exit 1
    fi
    
    log_info "Configuration:"
    log_info "  API Base URL: $API_BASE_URL"
    log_info "  Admin User: $ADMIN_USER"
    log_info "  Test Plugin URL: $TEST_PLUGIN_URL"
    log_info "  Results Directory: $RESULTS_DIR"
    echo ""
    
    # Run all test scenarios
    test_scenario_valid || true
    test_scenario_missing_csrf || true
    test_scenario_invalid_csrf || true
    test_scenario_missing_session || true
    test_scenario_invalid_session || true
    test_scenario_expired_session || true
    
    # Generate summary
    log_section "Test Execution Complete"
    
    log_info "Results:"
    log_info "  Total tests: $TOTAL_TESTS"
    log_info "  Passed: $PASSED_TESTS"
    log_info "  Failed: $FAILED_TESTS"
    log_info "  Skipped: $SKIPPED_TESTS"
    echo ""
    
    # Individual test results
    log_info "Individual test results:"
    for test_name in "${!TEST_RESULTS[@]}"; do
        local result="${TEST_RESULTS[$test_name]}"
        case "$result" in
            PASS) log_success "  $test_name: $result" ;;
            FAIL) log_error "  $test_name: $result" ;;
            SKIP) log_warning "  $test_name: $result" ;;
        esac
    done
    echo ""
    
    # Generate comprehensive summary
    generate_summary "$RESULTS_DIR" "$RESULTS_DIR/comprehensive-summary.txt"
    
    # Exit with failure if any tests failed
    if [ "$FAILED_TESTS" -gt 0 ]; then
        log_error "Some tests failed!"
        exit 1
    else
        log_success "All tests passed or skipped!"
        exit 0
    fi
}

# Run main if executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
