# API Authentication and CSRF Guide

This guide provides detailed instructions and curl examples for authenticating with the Minecraft Console API and using CSRF tokens properly.

## Table of Contents

1. [Overview](#overview)
2. [Authentication Flow](#authentication-flow)
3. [Environment Setup](#environment-setup)
4. [API Endpoints](#api-endpoints)
5. [Common Error Responses](#common-error-responses)
6. [Troubleshooting](#troubleshooting)

## Overview

The Minecraft Console API uses **session-based authentication** with **CSRF (Cross-Site Request Forgery) protection** using the double-submit cookie pattern.

### Security Features

- **Session Management**: Persistent sessions using Redis (fallback to memory store)
- **CSRF Protection**: Double-submit cookie pattern for all state-changing operations
- **Rate Limiting**: Prevents brute-force attacks
- **Secure Cookies**: HTTPS-only in production (configurable for development/testing)

### Key Concepts

1. **Session Cookie**: `console.sid` - Maintains your authenticated session
2. **CSRF Token**: Required in both cookie (`csrf-token`) and header (`CSRF-Token` or `X-CSRF-Token`)
3. **Cookie File**: Use curl's `-c` and `-b` flags to save and send cookies

## Authentication Flow

The complete authentication flow consists of three steps:

```
1. Login           → Obtain session cookie
2. Get CSRF Token  → Obtain CSRF token (requires session)
3. API Calls       → Use session cookie + CSRF token
```

## Environment Setup

### For HTTP (Development/Testing)

When testing over HTTP (localhost, 127.0.0.1, or CI environments), you **must** set:

```bash
# In your .env file
COOKIE_SECURE=false
NODE_ENV=development
```

**Important**: Secure cookies (secure=true) only work over HTTPS. If secure cookies are enabled but you're using HTTP, the browser/curl will **not send the cookies**, causing authentication to fail.

### For HTTPS (Production)

```bash
# In your .env file
COOKIE_SECURE=true  # or omit for default behavior
NODE_ENV=production
```

## API Endpoints

### 1. Login

Authenticate and obtain a session cookie.

**Endpoint**: `POST /api/login`

**Headers**:
- `Content-Type: application/json`

**Body**:
```json
{
  "username": "admin",
  "password": "your-password"
}
```

**Response (Success - 200)**:
```json
{
  "success": true,
  "message": "Login successful"
}
```

**Response (Failed - 401)**:
```json
{
  "error": "Invalid credentials"
}
```

**Response (Rate Limited - 429)**:
```json
{
  "error": "Too many login attempts",
  "message": "You have exceeded the maximum number of login attempts. Please try again later.",
  "retryAfter": "900",
  "limit": 5,
  "windowMinutes": 15
}
```

**curl Example**:

```bash
# Set your credentials
ADMIN_USER="admin"
ADMIN_PASS="your-password"
API_BASE="http://localhost:3001"
COOKIE_FILE="/tmp/console-cookies.txt"

# Login and save session cookie
curl -c "$COOKIE_FILE" \
  -X POST "$API_BASE/api/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}"
```

**What happens**:
- Server validates credentials
- Creates authenticated session
- Returns `console.sid` cookie
- Cookie saved to `/tmp/console-cookies.txt`

---

### 2. Get CSRF Token

Obtain a CSRF token for subsequent requests.

**Endpoint**: `GET /api/csrf-token`

**Headers**: None required

**Cookies Required**: Session cookie from login

**Response (Success - 200)**:
```json
{
  "csrfToken": "base64-encoded-token-here..."
}
```

**Response (Unauthorized - 401)** (if session expired):
```json
{
  "authenticated": false
}
```

**curl Example**:

```bash
# Get CSRF token (IMPORTANT: use both -b AND -c flags)
CSRF_RESPONSE=$(curl -b "$COOKIE_FILE" -c "$COOKIE_FILE" \
  -X GET "$API_BASE/api/csrf-token")

# Extract token from response
CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | jq -r '.csrfToken')

echo "CSRF Token: ${CSRF_TOKEN:0:20}..."
```

**Critical**: Use **both** `-b` (send cookies) **and** `-c` (save cookies) flags:
- `-b "$COOKIE_FILE"`: Send existing session cookie to server
- `-c "$COOKIE_FILE"`: Save new CSRF cookie from response

**What happens**:
- Server generates CSRF token
- Returns token in response body
- Sets `csrf-token` cookie (httpOnly=false to allow JS access)
- Both cookie and token must be used in subsequent requests

---

### 3. Check Session Status

Check if your session is still authenticated.

**Endpoint**: `GET /api/session`

**Headers**: None required

**Cookies Required**: Session cookie

**Response (Authenticated)**:
```json
{
  "authenticated": true,
  "username": "admin"
}
```

**Response (Not Authenticated)**:
```json
{
  "authenticated": false
}
```

**curl Example**:

```bash
curl -b "$COOKIE_FILE" \
  -X GET "$API_BASE/api/session"
```

---

### 4. Install Plugin

Install a plugin from a URL (example protected endpoint).

**Endpoint**: `POST /api/plugins/install`

**Headers**:
- `Content-Type: application/json`
- `CSRF-Token: <token>` (or `X-CSRF-Token: <token>`)

**Cookies Required**: Session cookie + CSRF cookie

**Body**:
```json
{
  "url": "https://github.com/example/plugin/releases/download/v1.0/plugin.jar",
  "customName": "MyPlugin"
}
```

**Response (Success - 200)**:
```json
{
  "status": "installed",
  "pluginName": "MyPlugin",
  "version": "1.0.0",
  "message": "Plugin installed successfully"
}
```

**Response (Conflict - 200)**:
```json
{
  "status": "conflict",
  "existingVersion": "0.9.0",
  "newVersion": "1.0.0",
  "message": "Plugin already exists",
  "actions": ["update", "downgrade", "reinstall"]
}
```

**Response (Unauthorized - 401)**:
```json
{
  "error": "Authentication required"
}
```

**Response (CSRF Failed - 403)**:
```json
{
  "error": "invalid csrf token",
  "message": "CSRF token validation failed. Please refresh and try again."
}
```

**Response (Bad Request - 400)**:
```json
{
  "error": "URL is required",
  "details": "The url field is required in the request body"
}
```

**curl Example**:

```bash
# Install plugin with CSRF protection
PLUGIN_URL="https://github.com/example/plugin/releases/download/v1.0/plugin.jar"

curl -b "$COOKIE_FILE" \
  -X POST "$API_BASE/api/plugins/install" \
  -H "Content-Type: application/json" \
  -H "CSRF-Token: $CSRF_TOKEN" \
  -d "{\"url\":\"$PLUGIN_URL\"}"
```

**Alternative Header**: You can also use `X-CSRF-Token` instead of `CSRF-Token`:

```bash
curl -b "$COOKIE_FILE" \
  -X POST "$API_BASE/api/plugins/install" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d "{\"url\":\"$PLUGIN_URL\"}"
```

---

### 5. Get Plugin List

Get list of installed plugins.

**Endpoint**: `GET /api/plugins`

**Headers**:
- `CSRF-Token: <token>` (required for consistency)

**Cookies Required**: Session cookie

**Response (Success - 200)**:
```json
{
  "plugins": [
    {
      "name": "MyPlugin",
      "version": "1.0.0",
      "enabled": true,
      "hasBackup": false
    }
  ]
}
```

**curl Example**:

```bash
curl -b "$COOKIE_FILE" \
  -H "CSRF-Token: $CSRF_TOKEN" \
  -X GET "$API_BASE/api/plugins"
```

---

### 6. Logout

Destroy the current session.

**Endpoint**: `POST /api/logout`

**Headers**:
- `CSRF-Token: <token>`

**Cookies Required**: Session cookie + CSRF cookie

**Response (Success - 200)**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**curl Example**:

```bash
curl -b "$COOKIE_FILE" \
  -X POST "$API_BASE/api/logout" \
  -H "CSRF-Token: $CSRF_TOKEN"

# Clean up cookie file
rm -f "$COOKIE_FILE"
```

---

## Complete Workflow Example

Here's a complete bash script demonstrating the full workflow:

```bash
#!/bin/bash
set -e

# Configuration
API_BASE="http://localhost:3001"
ADMIN_USER="admin"
ADMIN_PASS="your-password"
COOKIE_FILE="/tmp/console-cookies.txt"
PLUGIN_URL="https://github.com/example/plugin/releases/download/v1.0/plugin.jar"

# Clean up
rm -f "$COOKIE_FILE"

echo "=== Step 1: Login ==="
LOGIN_RESPONSE=$(curl -s -c "$COOKIE_FILE" \
  -X POST "$API_BASE/api/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}")

echo "$LOGIN_RESPONSE" | jq '.'

echo -e "\n=== Step 2: Get CSRF Token ==="
CSRF_RESPONSE=$(curl -s -b "$COOKIE_FILE" -c "$COOKIE_FILE" \
  -X GET "$API_BASE/api/csrf-token")

CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | jq -r '.csrfToken')
echo "CSRF Token: ${CSRF_TOKEN:0:20}..."

echo -e "\n=== Step 3: Check Session ==="
curl -s -b "$COOKIE_FILE" \
  -X GET "$API_BASE/api/session" | jq '.'

echo -e "\n=== Step 4: Install Plugin ==="
curl -s -b "$COOKIE_FILE" \
  -X POST "$API_BASE/api/plugins/install" \
  -H "Content-Type: application/json" \
  -H "CSRF-Token: $CSRF_TOKEN" \
  -d "{\"url\":\"$PLUGIN_URL\"}" | jq '.'

echo -e "\n=== Step 5: List Plugins ==="
curl -s -b "$COOKIE_FILE" \
  -H "CSRF-Token: $CSRF_TOKEN" \
  -X GET "$API_BASE/api/plugins" | jq '.'

echo -e "\n=== Step 6: Logout ==="
curl -s -b "$COOKIE_FILE" \
  -X POST "$API_BASE/api/logout" \
  -H "CSRF-Token: $CSRF_TOKEN" | jq '.'

# Cleanup
rm -f "$COOKIE_FILE"
echo -e "\n=== Workflow Complete ==="
```

---

## Common Error Responses

### 401 Unauthorized

**Cause**: No session or session expired

**Response**:
```json
{
  "error": "Authentication required"
}
```

**Solution**:
1. Login again to get a new session
2. Check that cookies are being sent (`-b` flag in curl)
3. Verify `COOKIE_SECURE=false` if using HTTP

---

### 403 Forbidden (CSRF)

**Cause**: CSRF token missing, invalid, or mismatched

**Response**:
```json
{
  "error": "invalid csrf token",
  "message": "CSRF token validation failed. Please refresh and try again."
}
```

**Solution**:
1. Ensure you're sending the CSRF token in header: `-H "CSRF-Token: $TOKEN"`
2. Ensure CSRF cookie is present (use `-c` flag when fetching token)
3. Get a fresh token if it expired
4. Check that header name is `CSRF-Token` or `X-CSRF-Token`

---

### 429 Too Many Requests

**Cause**: Rate limit exceeded

**Response**:
```json
{
  "error": "Too many login attempts",
  "message": "You have exceeded the maximum number of login attempts. Please try again later.",
  "retryAfter": "900",
  "limit": 5,
  "windowMinutes": 15
}
```

**Solution**:
1. Wait for the time specified in `retryAfter` (seconds)
2. Check for successful login (rate limit resets on success)
3. Avoid rapid login attempts

---

### 400 Bad Request

**Cause**: Missing or invalid request body

**Response**:
```json
{
  "error": "URL is required",
  "details": "The url field is required in the request body"
}
```

**Solution**:
1. Check request body structure
2. Ensure Content-Type is `application/json`
3. Validate required fields

---

## Troubleshooting

### Cookies Not Working

**Problem**: Authentication works but subsequent requests fail with 401

**Debug Steps**:

1. Check if cookies are being saved:
   ```bash
   cat "$COOKIE_FILE"
   ```

2. Verify `COOKIE_SECURE` setting:
   ```bash
   # For HTTP testing
   export COOKIE_SECURE=false
   # Or set in .env file
   ```

3. Check cookie attributes in response:
   ```bash
   curl -v -c "$COOKIE_FILE" ... 2>&1 | grep -i "set-cookie"
   ```

---

### CSRF Token Issues

**Problem**: Getting 403 errors on protected endpoints

**Debug Steps**:

1. Verify token is in both cookie and header:
   ```bash
   # Check cookie file for csrf-token
   cat "$COOKIE_FILE" | grep csrf-token
   
   # Verify header is set
   echo "CSRF-Token: $CSRF_TOKEN"
   ```

2. Get fresh token:
   ```bash
   # IMPORTANT: Use both -b AND -c flags
   curl -b "$COOKIE_FILE" -c "$COOKIE_FILE" \
     -X GET "$API_BASE/api/csrf-token"
   ```

3. Check NODE_ENV for development logging:
   ```bash
   # In development mode, server logs actual token values
   NODE_ENV=development npm start
   ```

---

### Session Expires Too Quickly

**Problem**: Session cookie expires unexpectedly

**Check**:

1. Session cookie maxAge (default: 24 hours):
   ```javascript
   // In session.js
   maxAge: 24 * 60 * 60 * 1000
   ```

2. Redis connection (sessions persist in Redis):
   ```bash
   # Check Redis is running
   docker ps | grep redis
   
   # Check backend logs for Redis connection
   grep -i redis backend-logs.txt
   ```

---

### Development vs Production

**Development Mode** (`NODE_ENV=development`):
- Detailed logging with actual token values
- Session/cookie/header data logged
- HTTP cookies allowed (secure=false)

**Production Mode** (`NODE_ENV=production`):
- Minimal logging (no sensitive data)
- HTTPS-only cookies (secure=true)
- Redacted session IDs

---

## Security Notes

1. **Never commit credentials**: Use environment variables
2. **HTTPS in production**: Always use secure cookies over HTTPS
3. **Token lifetime**: CSRF tokens are tied to the session
4. **Rate limiting**: Protects against brute-force attacks
5. **Double-submit pattern**: Both cookie and header required for CSRF protection

---

## Additional Resources

- [PLUGIN-MANAGER.md](../PLUGIN-MANAGER.md) - Plugin manager features and usage
- [SESSION-CSRF-DEBUG-IMPLEMENTATION.md](SESSION-CSRF-DEBUG-IMPLEMENTATION.md) - Technical implementation details
- [REDIS-SESSION-TESTING.md](REDIS-SESSION-TESTING.md) - Redis session store setup
- [PLUGIN-INSTALL-DIAGNOSTICS.md](PLUGIN-INSTALL-DIAGNOSTICS.md) - Diagnostic workflow for plugin installation

---

## Support

If you encounter issues not covered in this guide:

1. Check server logs for detailed error messages
2. Use `NODE_ENV=development` for verbose logging
3. Review the diagnostic workflow documentation
4. Check `/api/debug/logs` endpoint (requires authentication)
