#!/bin/bash
# CSRF End-to-End Integration Test
# Tests the complete flow: login -> get CSRF token -> make protected request

set -e

echo "========================================="
echo "CSRF Integration Test"
echo "========================================="
echo ""

# Configuration
API_URL="${API_URL:-http://localhost:3001}"
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-changeme123}"
# Create secure temporary directory for cookies
TEMP_DIR=$(mktemp -d -t csrf-test-XXXXXX)
COOKIE_FILE="$TEMP_DIR/cookies.txt"

# Cleanup on exit
cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

echo "Step 1: Testing /api/session (unauthenticated)"
echo "-----------------------------------------------"
SESSION_RESPONSE=$(curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" "$API_URL/api/session")
echo "Response: $SESSION_RESPONSE"
echo ""

echo "Step 2: Login to get authenticated session"
echo "-------------------------------------------"
LOGIN_RESPONSE=$(curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" \
    -X POST "$API_URL/api/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASSWORD\"}")

echo "Login Response: $LOGIN_RESPONSE"

if echo "$LOGIN_RESPONSE" | grep -q "success.*true"; then
    echo "✓ Login successful"
else
    echo "✗ Login failed"
    exit 1
fi
echo ""

echo "Step 3: Get CSRF token"
echo "----------------------"
CSRF_RESPONSE=$(curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" \
    -X GET "$API_URL/api/csrf-token")

echo "CSRF Response: $CSRF_RESPONSE"
CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | jq -r '.csrfToken')

if [ -n "$CSRF_TOKEN" ] && [ "$CSRF_TOKEN" != "null" ]; then
    echo "✓ CSRF token obtained: ${CSRF_TOKEN:0:20}..."
else
    echo "✗ Failed to get CSRF token"
    exit 1
fi

echo ""
echo "Cookies saved:"
cat "$COOKIE_FILE" | grep -v '^#'
echo ""

echo "Step 4: Test protected endpoint WITHOUT CSRF token (should fail with 403)"
echo "--------------------------------------------------------------------------"
NO_CSRF_RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_FILE" \
    -X POST "$API_URL/api/logout")

NO_CSRF_STATUS=$(echo "$NO_CSRF_RESPONSE" | tail -1)
NO_CSRF_BODY=$(echo "$NO_CSRF_RESPONSE" | sed '$d')

echo "Status: $NO_CSRF_STATUS"
echo "Response: $NO_CSRF_BODY"

if [ "$NO_CSRF_STATUS" = "403" ]; then
    echo "✓ Correctly rejected request without CSRF token (403)"
else
    echo "✗ Expected 403, got $NO_CSRF_STATUS"
    exit 1
fi
echo ""

echo "Step 5: Test protected endpoint WITH invalid CSRF token (should fail with 403)"
echo "------------------------------------------------------------------------------"
INVALID_CSRF_RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_FILE" \
    -X POST "$API_URL/api/logout" \
    -H "CSRF-Token: invalid-token-12345")

INVALID_CSRF_STATUS=$(echo "$INVALID_CSRF_RESPONSE" | tail -1)
INVALID_CSRF_BODY=$(echo "$INVALID_CSRF_RESPONSE" | sed '$d')

echo "Status: $INVALID_CSRF_STATUS"
echo "Response: $INVALID_CSRF_BODY"

if [ "$INVALID_CSRF_STATUS" = "403" ]; then
    echo "✓ Correctly rejected request with invalid CSRF token (403)"
else
    echo "✗ Expected 403, got $INVALID_CSRF_STATUS"
    exit 1
fi
echo ""

echo "Step 6: Re-login (session was destroyed in previous tests)"
echo "-----------------------------------------------------------"
LOGIN_RESPONSE2=$(curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" \
    -X POST "$API_URL/api/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASSWORD\"}")

if echo "$LOGIN_RESPONSE2" | grep -q "success.*true"; then
    echo "✓ Re-login successful"
else
    echo "✗ Re-login failed"
    exit 1
fi

# Get new CSRF token after re-login
CSRF_RESPONSE2=$(curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" \
    -X GET "$API_URL/api/csrf-token")
CSRF_TOKEN=$(echo "$CSRF_RESPONSE2" | jq -r '.csrfToken')
echo "✓ New CSRF token obtained"
echo ""

echo "Step 7: Test protected endpoint WITH valid CSRF token (should succeed)"
echo "-----------------------------------------------------------------------"
VALID_CSRF_RESPONSE=$(curl -s -w "\n%{http_code}" -b "$COOKIE_FILE" \
    -X GET "$API_URL/api/plugins" \
    -H "CSRF-Token: $CSRF_TOKEN")

VALID_CSRF_STATUS=$(echo "$VALID_CSRF_RESPONSE" | tail -1)
VALID_CSRF_BODY=$(echo "$VALID_CSRF_RESPONSE" | sed '$d')

echo "Status: $VALID_CSRF_STATUS"
echo "Response: $VALID_CSRF_BODY"

if [ "$VALID_CSRF_STATUS" = "200" ]; then
    echo "✓ Request with valid CSRF token succeeded (200)"
else
    echo "✗ Expected 200, got $VALID_CSRF_STATUS"
    if [ "$VALID_CSRF_STATUS" = "403" ]; then
        echo "⚠ CSRF token was rejected even though it should be valid!"
        echo "This is the BUG we're trying to fix!"
    fi
    exit 1
fi
echo ""

echo "========================================="
echo "✓ All CSRF tests passed!"
echo "========================================="
echo ""
echo "Summary:"
echo "- Login: ✓"
echo "- CSRF token generation: ✓"
echo "- Request without CSRF: Correctly rejected with 403 ✓"
echo "- Request with invalid CSRF: Correctly rejected with 403 ✓"
echo "- Request with valid CSRF: Successfully accepted ✓"
echo ""
echo "CSRF protection is working correctly!"
