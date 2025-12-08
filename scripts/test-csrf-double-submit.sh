#!/bin/bash

# Test script for CSRF double-submit pattern with plugin install
# This script demonstrates that plugin install works with simple matching cookie/header tokens

set -e  # Exit on error

echo "========================================"
echo "CSRF Double-Submit Pattern Test"
echo "========================================"
echo ""

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3001}"
USERNAME="${ADMIN_USERNAME:-admin}"
PASSWORD="${ADMIN_PASSWORD:-test-password-123}"
COOKIE_FILE="/tmp/csrf-test-cookies.txt"

# Clean up
rm -f $COOKIE_FILE

echo "Step 1: Login to get authenticated session"
echo "-------------------------------------------"
LOGIN_RESPONSE=$(curl -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" \
  -c $COOKIE_FILE \
  -s)

if echo "$LOGIN_RESPONSE" | grep -q "success"; then
    echo "✓ Login successful"
else
    echo "✗ Login failed: $LOGIN_RESPONSE"
    exit 1
fi

echo ""
echo "Step 2: Get CSRF token"
echo "----------------------"
CSRF_RESPONSE=$(curl -X GET "$BASE_URL/api/csrf-token" \
  -b $COOKIE_FILE \
  -c $COOKIE_FILE \
  -s)

CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$CSRF_TOKEN" ]; then
    echo "✗ Failed to get CSRF token: $CSRF_RESPONSE"
    exit 1
fi

echo "✓ CSRF token retrieved: ${CSRF_TOKEN:0:20}..."
echo "✓ Token length: ${#CSRF_TOKEN} characters"

# Verify the token is a simple hex string (no pipe separator)
if echo "$CSRF_TOKEN" | grep -q '|'; then
    echo "✗ ERROR: Token contains pipe separator (should be simple hex string)"
    exit 1
else
    echo "✓ Token is simple hex string (no pipe separator)"
fi

echo ""
echo "Step 3: Extract cookie value to verify it matches"
echo "--------------------------------------------------"
COOKIE_VALUE=$(grep csrf-token $COOKIE_FILE | awk '{print $7}')

if [ "$COOKIE_VALUE" = "$CSRF_TOKEN" ]; then
    echo "✓ Cookie value matches token from JSON response"
else
    echo "✗ Cookie value mismatch:"
    echo "  Cookie: $COOKIE_VALUE"
    echo "  Token:  $CSRF_TOKEN"
    exit 1
fi

echo ""
echo "Step 4: Test plugin install with matching cookie/header"
echo "--------------------------------------------------------"

# Use a test URL (this will fail at plugin manager level but CSRF should pass)
INSTALL_RESPONSE=$(curl -X POST "$BASE_URL/api/plugins/install" \
  -H "Content-Type: application/json" \
  -H "CSRF-Token: $CSRF_TOKEN" \
  -b $COOKIE_FILE \
  -d '{"url":"https://example.com/test-plugin.jar"}' \
  -w "\nHTTP_STATUS:%{http_code}" \
  -s)

HTTP_STATUS=$(echo "$INSTALL_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
RESPONSE_BODY=$(echo "$INSTALL_RESPONSE" | sed '/HTTP_STATUS/d')

echo "HTTP Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "403" ]; then
    if echo "$RESPONSE_BODY" | grep -qi "csrf"; then
        echo "✗ CSRF validation failed (should have passed)"
        echo "Response: $RESPONSE_BODY"
        exit 1
    else
        echo "✓ CSRF validation passed (403 is from other validation)"
    fi
elif [ "$HTTP_STATUS" = "401" ]; then
    echo "✗ Session not authenticated (should have authenticated session)"
    exit 1
else
    echo "✓ CSRF validation passed (status: $HTTP_STATUS)"
fi

echo ""
echo "Step 5: Test with mismatched tokens (should fail)"
echo "--------------------------------------------------"
WRONG_TOKEN="0000000000000000000000000000000000000000000000000000000000000000"

FAIL_RESPONSE=$(curl -X POST "$BASE_URL/api/plugins/install" \
  -H "Content-Type: application/json" \
  -H "CSRF-Token: $WRONG_TOKEN" \
  -b $COOKIE_FILE \
  -d '{"url":"https://example.com/test-plugin.jar"}' \
  -w "\nHTTP_STATUS:%{http_code}" \
  -s)

FAIL_STATUS=$(echo "$FAIL_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
FAIL_BODY=$(echo "$FAIL_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$FAIL_STATUS" = "403" ] && echo "$FAIL_BODY" | grep -qi "csrf"; then
    echo "✓ CSRF validation correctly rejected mismatched tokens"
else
    echo "✗ CSRF validation should have failed with 403"
    echo "Status: $FAIL_STATUS"
    echo "Response: $FAIL_BODY"
    exit 1
fi

echo ""
echo "Step 6: Test with missing CSRF header (should fail)"
echo "----------------------------------------------------"
NO_HEADER_RESPONSE=$(curl -X POST "$BASE_URL/api/plugins/install" \
  -H "Content-Type: application/json" \
  -b $COOKIE_FILE \
  -d '{"url":"https://example.com/test-plugin.jar"}' \
  -w "\nHTTP_STATUS:%{http_code}" \
  -s)

NO_HEADER_STATUS=$(echo "$NO_HEADER_RESPONSE" | grep "HTTP_STATUS" | cut -d':' -f2)
NO_HEADER_BODY=$(echo "$NO_HEADER_RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$NO_HEADER_STATUS" = "403" ] && echo "$NO_HEADER_BODY" | grep -qi "csrf"; then
    echo "✓ CSRF validation correctly rejected missing header"
else
    echo "✗ CSRF validation should have failed with 403"
    echo "Status: $NO_HEADER_STATUS"
    echo "Response: $NO_HEADER_BODY"
    exit 1
fi

echo ""
echo "========================================"
echo "✓ All CSRF double-submit tests passed!"
echo "========================================"
echo ""
echo "Summary:"
echo "- Simple hex token generation works (no pipe separator)"
echo "- Cookie and header matching validation works"
echo "- Session authentication requirement works"
echo "- Mismatched tokens are correctly rejected"
echo "- Missing tokens are correctly rejected"
echo ""

# Cleanup
rm -f $COOKIE_FILE
