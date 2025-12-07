#!/bin/bash

# Manual test script for session, cookie, and CSRF flow
# This script simulates what the diagnostic workflow does
# Run this script manually to test the API authentication flow

set -e

# Configuration
API_BASE="http://localhost:3001"
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASS="${ADMIN_PASS:-change-this-secure-password}"
COOKIE_FILE="/tmp/test-cookies.txt"

echo "=== MANUAL API AUTHENTICATION TEST ==="
echo ""
echo "API Base: $API_BASE"
echo "Admin User: $ADMIN_USER"
echo ""

# Clean up previous session
rm -f "$COOKIE_FILE"

# Step 1: Login
echo "Step 1: Login"
echo "------------------------------------------------"
LOGIN_RESPONSE=$(jq -n --arg user "$ADMIN_USER" --arg pass "$ADMIN_PASS" \
  '{username: $user, password: $pass}' | \
  curl -s -c "$COOKIE_FILE" -w "\n%{http_code}" \
  -X POST "$API_BASE/api/login" \
  -H "Content-Type: application/json" \
  --data-binary @- 2>&1)

LOGIN_STATUS=$(echo "$LOGIN_RESPONSE" | tail -1)
LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

echo "Status: $LOGIN_STATUS"
echo "Response: $LOGIN_BODY"

if [ "$LOGIN_STATUS" != "200" ]; then
  echo "✗ Login failed!"
  exit 1
fi

echo "✓ Login successful"
echo ""

# Check cookies
echo "Session cookie:"
cat "$COOKIE_FILE" | grep -v '^#'
echo ""

# Step 2: Get CSRF token
echo "Step 2: Get CSRF token"
echo "------------------------------------------------"
CSRF_RESPONSE=$(curl -s -b "$COOKIE_FILE" -w "\n%{http_code}" \
  -X GET "$API_BASE/api/csrf-token" 2>&1)

CSRF_STATUS=$(echo "$CSRF_RESPONSE" | tail -1)
CSRF_BODY=$(echo "$CSRF_RESPONSE" | sed '$d')

echo "Status: $CSRF_STATUS"
echo "Response: $CSRF_BODY"

if [ "$CSRF_STATUS" != "200" ]; then
  echo "✗ Failed to get CSRF token!"
  exit 1
fi

CSRF_TOKEN=$(echo "$CSRF_BODY" | jq -r '.csrfToken')
echo "✓ CSRF token obtained: ${CSRF_TOKEN:0:20}..."
echo ""

# Step 3: Test authenticated endpoint (GET /api/plugins)
echo "Step 3: Test authenticated endpoint (GET /api/plugins)"
echo "------------------------------------------------"
PLUGINS_RESPONSE=$(curl -s -b "$COOKIE_FILE" -w "\n%{http_code}" \
  -X GET "$API_BASE/api/plugins" \
  -H "CSRF-Token: $CSRF_TOKEN" 2>&1)

PLUGINS_STATUS=$(echo "$PLUGINS_RESPONSE" | tail -1)
PLUGINS_BODY=$(echo "$PLUGINS_RESPONSE" | sed '$d')

echo "Status: $PLUGINS_STATUS"
echo "Response:"
echo "$PLUGINS_BODY" | jq '.' 2>/dev/null || echo "$PLUGINS_BODY"

if [ "$PLUGINS_STATUS" != "200" ]; then
  echo "✗ Failed to access plugins endpoint!"
  exit 1
fi

echo "✓ Successfully accessed authenticated endpoint"
echo ""

# Step 4: Get debug logs
echo "Step 4: Get debug logs"
echo "------------------------------------------------"
DEBUG_RESPONSE=$(curl -s -b "$COOKIE_FILE" -w "\n%{http_code}" \
  -X GET "$API_BASE/api/debug/logs" 2>&1)

DEBUG_STATUS=$(echo "$DEBUG_RESPONSE" | tail -1)
DEBUG_BODY=$(echo "$DEBUG_RESPONSE" | sed '$d')

echo "Status: $DEBUG_STATUS"
if [ "$DEBUG_STATUS" = "200" ]; then
  echo "✓ Debug logs retrieved successfully"
  echo "Last 30 lines of debug logs:"
  echo "$DEBUG_BODY" | tail -30
else
  echo "⚠ Debug logs not available (status: $DEBUG_STATUS)"
  echo "Response: $DEBUG_BODY"
fi
echo ""

# Step 5: Check session endpoint
echo "Step 5: Check session status"
echo "------------------------------------------------"
SESSION_RESPONSE=$(curl -s -b "$COOKIE_FILE" \
  -X GET "$API_BASE/api/session")

echo "$SESSION_RESPONSE" | jq '.'
echo ""

echo "=== ALL TESTS PASSED ==="
echo ""
echo "Session management is working correctly!"
echo "- Login creates session cookie"
echo "- CSRF token is generated"
echo "- Authenticated endpoints accept session cookie + CSRF token"
echo ""
echo "Next steps:"
echo "1. Test plugin install with: curl -X POST $API_BASE/api/plugins/install -b $COOKIE_FILE -H 'CSRF-Token: $CSRF_TOKEN' -H 'Content-Type: application/json' -d '{\"url\":\"PLUGIN_URL\"}'"
echo "2. Check debug logs at: $API_BASE/api/debug/logs"
