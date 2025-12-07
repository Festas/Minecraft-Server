# Session Management and CSRF Debug Implementation

## Overview

This document describes the comprehensive debugging infrastructure added to diagnose and resolve session management and CSRF authentication issues in the Minecraft Console API.

## Problem Statement

Diagnostic workflows showed that:
- Login via `/api/login` succeeded and issued session cookies
- CSRF token was obtained successfully from `/api/csrf-token`
- However, authenticated API requests (GET `/api/plugins`, POST `/api/plugins/install`) failed with either:
  - 401 Authentication Required
  - "invalid csrf token" errors

The issue appeared to be related to session persistence or CSRF token validation not working correctly for API/curl clients.

## Solution Implementation

### 1. Debug Logging Middleware (`debugLogger.js`)

Created comprehensive debug logging middleware that logs:

**Session Information:**
- Session ID
- Session existence and authentication state
- Username
- Cookie configuration (maxAge, expires, httpOnly, secure, sameSite, path, domain)

**Cookie Information:**
- Raw cookies from headers
- Parsed cookies
- Signed cookies

**CSRF Information:**
- CSRF token from headers (both `csrf-token` and `x-csrf-token`)
- CSRF cookie value

**Request/Response Information:**
- Method, URL, path, IP, user agent
- All headers (with sensitive data redacted in production)
- Request body (with sensitive fields redacted)
- Response status, timing, and body (optional)

**Security Features:**
- Redacts sensitive fields: password, token, secret, key, credentials, apiKey, accessToken
- Redacts authorization and cookie headers in production
- Uses single-line JSON for better performance
- Writes to `/app/logs/api-debug.log`
- Uses tail command for efficient large file reading

### 2. Enhanced Session Configuration

Updated `auth/session.js` with:
- Custom session cookie name: `console.sid` (avoids conflicts)
- Explicit `path: '/'` (ensures cookie available for all paths)
- No domain setting (lets browser default to current domain)
- `sameSite: 'lax'` (compatible with API calls and redirects)
- `httpOnly: true` (prevents XSS attacks)
- **`secure: false` in development/test/CI (allows HTTP), `true` in production (HTTPS only)**
- **Override with `COOKIE_SECURE` environment variable for testing**
- `maxAge: 24h` (24-hour session lifetime)
- Comprehensive logging of cookie configuration on startup

### 3. Enhanced CSRF Configuration

Updated CSRF configuration in `server.js`:
- Added custom `getTokenFromRequest` function
- Checks both `csrf-token` and `x-csrf-token` headers
- Cookie name: `csrf-token`
- **Cookie settings match session (sameSite: lax, httpOnly, secure based on environment)**
- **Override with `COOKIE_SECURE` environment variable for testing**
- Comprehensive logging of CSRF cookie configuration on startup
- Skips CSRF check for: `/api/login`, `/api/session`, `/api/csrf-token`, `/api/debug/logs`

### 4. Enhanced Logging Throughout Backend

**Login Endpoint (`/api/login`):**
- Logs authentication attempts with username and session ID
- Logs successful login with session details
- Forces session save with callback to ensure persistence
- Logs session save errors
- Removed sessionID from response (security improvement)

**CSRF Token Endpoint (`/api/csrf-token`):**
- Logs token requests with session state
- Logs token generation with prefix for debugging
- Returns token in JSON response

**Authentication Middleware (`requireAuth`):**
- Logs every authentication check
- Logs detailed failure reasons (no session vs not authenticated)
- Logs successful authentication with username

**CSRF Protection Middleware:**
- Logs CSRF protection application
- Shows which endpoints skip CSRF
- Logs validation failures with error details

### 5. Debug Logs API Endpoint

Added new endpoint: `GET /api/debug/logs`
- Requires authentication
- Returns last 1000 lines of debug log by default
- Uses tail command for performance
- Falls back to file reading if tail fails
- Returns plain text response

### 6. Diagnostic Workflow Updates

Updated `.github/workflows/plugin-install-diagnose.yml`:
- Collects `api-debug.log` from backend container
- Added section "## 6. Backend API debug logs" to post-install diagnostics
- Displays last 50 lines of debug logs in workflow output
- Includes api-debug.log in diagnostic artifacts tarball
- Updated diagnostic summary to mention api-debug.log

### 7. Manual Testing Script

Created `scripts/test-api-auth.sh`:
- Tests complete authentication flow
- Step 1: Login and save session cookie
- Step 2: Get CSRF token
- Step 3: Test authenticated endpoint (GET /api/plugins)
- Step 4: Get debug logs
- Step 5: Check session status
- Provides next steps and example plugin install command
- Executable permissions set

### 8. Documentation

Updated `PLUGIN-MANAGER.md` with:
- New "API Authentication" section under "API Endpoints"
- Complete authentication flow documentation
- Example commands for login, CSRF token, and authenticated requests
- Complete example script for plugin installation
- Session and cookie configuration details
- Instructions for debugging authentication issues
- Reference to manual test script
- Updated security section to mention debug logging
- Updated file structure to show debugLogger.js and api-debug.log

## Files Changed

1. **console/backend/middleware/debugLogger.js** (NEW)
   - Complete debug logging middleware
   - 200+ lines of comprehensive logging logic

2. **console/backend/server.js**
   - Import debugLogger
   - Apply debugLogger to all /api routes
   - Enhanced CSRF configuration with custom getTokenFromRequest
   - Enhanced CSRF token endpoint with logging
   - Enhanced CSRF middleware with detailed logging

3. **console/backend/auth/session.js**
   - Added custom session cookie name
   - Added explicit path setting
   - Improved cookie configuration documentation

4. **console/backend/auth/auth.js**
   - Enhanced requireAuth with detailed logging
   - Logs authentication check details and failures

5. **console/backend/routes/api.js**
   - Enhanced login endpoint with forced session save
   - Enhanced logging in login endpoint
   - Enhanced logging in session endpoint
   - Added /api/debug/logs endpoint
   - Removed sessionID from login response (security)

6. **.github/workflows/plugin-install-diagnose.yml**
   - Added api-debug.log collection
   - Added debug logs display section
   - Updated diagnostic summary

7. **scripts/test-api-auth.sh** (NEW)
   - Manual API authentication test script
   - 145 lines with complete test flow

8. **PLUGIN-MANAGER.md**
   - Added API Authentication section (~100 lines)
   - Updated Security section
   - Updated File Structure section

## Usage

### Cookie Security Configuration for curl/HTTP Testing

**CRITICAL:** Before testing with curl or any HTTP-based diagnostic tool, ensure cookie security is configured correctly.

#### Quick Setup for HTTP Testing

Add to your `.env` file:
```bash
# Allow cookies to work over HTTP (required for curl testing without SSL)
COOKIE_SECURE=false
```

Or set in docker-compose environment:
```yaml
environment:
  - COOKIE_SECURE=false
```

Then restart the backend:
```bash
docker compose -f docker-compose.console.yml restart console
```

Verify configuration in logs:
```bash
docker logs minecraft-console | grep "Cookie configuration"
```

Expected output:
```
[Session] Cookie configuration: { secure: false, nodeEnv: 'production', cookieSecureOverride: 'false', warning: 'HTTP allowed - cookies work without SSL' }
[CSRF] Cookie configuration: { secure: false, nodeEnv: 'production', cookieSecureOverride: 'false', warning: 'HTTP allowed - cookies work without SSL' }
```

### curl Workflow Examples

#### Basic Authentication Flow

```bash
# Step 1: Login and save session cookie
curl -c cookies.txt -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'

# Step 2: Get CSRF token (IMPORTANT: use both -c and -b)
curl -c cookies.txt -b cookies.txt http://localhost:3001/api/csrf-token

# Step 3: Extract CSRF token
CSRF_TOKEN=$(curl -s -c cookies.txt -b cookies.txt http://localhost:3001/api/csrf-token | jq -r '.csrfToken')

# Step 4: Make authenticated request
curl -b cookies.txt \
  -H "CSRF-Token: $CSRF_TOKEN" \
  http://localhost:3001/api/plugins
```

#### Why Both -c and -b Flags?

When calling `/api/csrf-token`:
- `-b cookies.txt` - **Send** the session cookie to prove you're authenticated
- `-c cookies.txt` - **Save** the new CSRF cookie that the server sets

**Common Mistake:** Using only `-b` (send cookies) without `-c` (save cookies)
- Result: CSRF cookie is not saved to cookies.txt
- Consequence: Next request has session but no CSRF cookie, validation fails

**Correct Pattern:**
```bash
# Always use both flags when endpoint might set new cookies
curl -c cookies.txt -b cookies.txt http://localhost:3001/api/csrf-token
```

#### Complete Plugin Install Workflow

```bash
#!/bin/bash
set -e

BASE_URL="${BASE_URL:-http://localhost:3001}"
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASS="${ADMIN_PASS:-your-password}"
PLUGIN_URL="https://github.com/EssentialsX/Essentials/releases/latest"

echo "=== Minecraft Console API Test ==="
echo "Base URL: $BASE_URL"
echo ""

# Clean up
rm -f cookies.txt

# 1. Login
echo "=== Step 1: Login ==="
LOGIN_RESPONSE=$(curl -s -c cookies.txt -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}")

echo "$LOGIN_RESPONSE" | jq '.'

if [[ $(echo "$LOGIN_RESPONSE" | jq -r '.success') != "true" ]]; then
    echo "ERROR: Login failed"
    exit 1
fi

echo "✓ Login successful"
echo ""

# 2. Get CSRF token
echo "=== Step 2: Get CSRF Token ==="
CSRF_RESPONSE=$(curl -s -c cookies.txt -b cookies.txt "$BASE_URL/api/csrf-token")
CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | jq -r '.csrfToken')

echo "CSRF Token: ${CSRF_TOKEN:0:20}..."
echo "✓ CSRF token obtained"
echo ""

# 3. Verify cookies were saved
echo "=== Step 3: Verify Cookies ==="
if [[ ! -f cookies.txt ]]; then
    echo "ERROR: cookies.txt not found"
    exit 1
fi

if grep -q "console.sid" cookies.txt && grep -q "csrf-token" cookies.txt; then
    echo "✓ Both session and CSRF cookies present"
else
    echo "ERROR: Missing cookies"
    cat cookies.txt
    exit 1
fi
echo ""

# 4. Test authenticated endpoint
echo "=== Step 4: List Plugins ==="
PLUGINS_RESPONSE=$(curl -s -b cookies.txt \
  -H "CSRF-Token: $CSRF_TOKEN" \
  "$BASE_URL/api/plugins")

PLUGIN_COUNT=$(echo "$PLUGINS_RESPONSE" | jq '.plugins | length')
echo "Found $PLUGIN_COUNT plugins"
echo "✓ Successfully accessed authenticated endpoint"
echo ""

# 5. Install a plugin
echo "=== Step 5: Install Plugin ==="
echo "Installing from: $PLUGIN_URL"

INSTALL_RESPONSE=$(curl -s -b cookies.txt -X POST \
  -H "Content-Type: application/json" \
  -H "CSRF-Token: $CSRF_TOKEN" \
  "$BASE_URL/api/plugins/install" \
  -d "{\"url\":\"$PLUGIN_URL\"}")

echo "$INSTALL_RESPONSE" | jq '.'

if [[ $(echo "$INSTALL_RESPONSE" | jq -r '.status') == "success" ]]; then
    echo "✓ Plugin installed successfully"
else
    echo "✗ Plugin installation failed"
    exit 1
fi

echo ""
echo "=== All Tests Passed ==="
rm -f cookies.txt
```

#### Debugging with Verbose Output

```bash
# Use -v flag to see full HTTP exchange including headers
curl -v -c cookies.txt -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"pass"}'
```

Look for in the output:
```
< Set-Cookie: console.sid=s%3A...; Path=/; HttpOnly; SameSite=Lax
< Set-Cookie: csrf-token=...; Path=/; HttpOnly; SameSite=Lax
```

If you see `Secure` in the Set-Cookie header but you're using HTTP:
```
< Set-Cookie: console.sid=...; Path=/; HttpOnly; Secure; SameSite=Lax
                                                  ^^^^^^
                                                  This breaks HTTP!
```

**Fix:** Set `COOKIE_SECURE=false` and restart backend.

### Viewing Debug Logs

**During Development:**
```bash
# Tail logs in real-time
docker exec minecraft-console tail -f /app/logs/api-debug.log
```

**Via API (requires authentication):**
```bash
# Login first
curl -c cookies.txt -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'

# Get CSRF token
CSRF_TOKEN=$(curl -s -c cookies.txt -b cookies.txt http://localhost:3001/api/csrf-token | jq -r '.csrfToken')

# Get debug logs
curl -b cookies.txt \
  -H "CSRF-Token: $CSRF_TOKEN" \
  http://localhost:3001/api/debug/logs
```

**In Diagnostic Workflows:**
- Check post-install diagnostics section "## 6. Backend API debug logs"
- Download artifacts and examine `api-debug.log`

### Testing Authentication Flow

**Run Manual Test Script:**
```bash
export ADMIN_USER=admin
export ADMIN_PASS=your-password
./scripts/test-api-auth.sh
```

**Expected Output:**
- ✓ Login successful
- ✓ CSRF token obtained
- ✓ Successfully accessed authenticated endpoint
- ✓ Debug logs retrieved
- Session status confirmation

## Debug Log Format

Each log entry is a single-line JSON object with:
```json
{
  "timestamp": "2025-12-07T15:32:20.546Z",
  "request": {
    "method": "POST",
    "url": "/api/plugins/install",
    "path": "/plugins/install",
    "ip": "127.0.0.1",
    "userAgent": "curl/7.68.0"
  },
  "session": {
    "sessionID": "abc123...",
    "sessionExists": true,
    "authenticated": true,
    "username": "admin",
    "sessionData": { /* cookie config */ }
  },
  "cookies": {
    "rawCookies": "console.sid=abc123; csrf-token=xyz789",
    "parsedCookies": { /* parsed cookie objects */ },
    "signedCookies": { /* signed cookie objects */ }
  },
  "csrf": {
    "csrfTokenHeader": "xyz789...",
    "csrfCookie": "xyz789..."
  },
  "headers": { /* all request headers */ },
  "requestBody": { /* sanitized request body */ },
  "response": {
    "statusCode": 200,
    "statusMessage": "OK",
    "responseTime": "125ms"
  },
  "responseBody": { /* sanitized response */ }
}
```

## Security Considerations

1. **Sensitive Data Redaction:**
   - Password, token, secret, key, credentials fields redacted in request bodies
   - Authorization and cookie headers redacted in production
   - Session IDs only logged server-side, not sent to client

2. **Production Mode:**
   - All sensitive headers redacted
   - Session IDs not exposed in responses
   - Debug logs still available but with redactions

3. **Performance:**
   - Single-line JSON (not pretty-printed) for efficiency
   - Tail command used for large log files
   - Logs written asynchronously

## Troubleshooting

### Authentication Fails (401)
1. Check debug logs for session state
2. Verify session cookie is present in request
3. Verify session is authenticated
4. Check if session expired (24h maxAge)

### CSRF Token Invalid
1. Check debug logs for CSRF validation
2. Verify CSRF token obtained after login
3. Verify CSRF token sent in header (not query param)
4. Verify session cookie sent with CSRF request
5. Check if CSRF cookie matches token

### Session Not Persisting
1. Check if session.save() is called
2. Verify cookie is set in response
3. Check cookie path and domain settings
4. Verify sameSite setting compatible with request origin
5. **Check if secure cookie is blocking HTTP requests (see Cookie Security section below)**

### Cookie Security and HTTP/HTTPS Issues

**Problem:** Session cookies with `secure: true` are ONLY sent over HTTPS. When testing with HTTP (localhost, CI, diagnostics), browsers/curl will NOT send the cookie back to the server, causing:
- Session ID changes on every request
- Authentication always fails (authenticated: false)
- CSRF tokens never match (different sessions)
- All authenticated API calls return 401 or "invalid csrf token"

**Solution:** The backend now automatically configures cookie security based on environment:

**Production (NODE_ENV=production):**
- `secure: true` - Requires HTTPS/SSL
- Session cookies only sent over encrypted connections
- Safe for production deployment with reverse proxy (Nginx/Caddy with SSL)

**Development/Test (NODE_ENV=development or NODE_ENV=test):**
- `secure: false` - Allows HTTP
- Session cookies work over plain HTTP
- Required for local development and testing

**Override for Testing:**
- Set `COOKIE_SECURE=false` environment variable to force non-secure cookies
- Useful for CI/CD workflows that test via HTTP
- Example in `.env`:
  ```
  NODE_ENV=production
  COOKIE_SECURE=false  # Allow HTTP testing even in production mode
  ```

**Verification:**
- Check backend startup logs for `[Session] Cookie configuration` and `[CSRF] Cookie configuration`
- Both should show `secure: false` for HTTP testing
- Both should show `warning: 'HTTP allowed - cookies work without SSL'`

**Configuration Files:**
- `console/backend/auth/session.js` - Session cookie configuration
- `console/backend/server.js` - CSRF cookie configuration
- `docker-compose.console.yml` - Environment variables
- `.env.example` - Documentation and examples

**Tests:**
- `console/backend/__tests__/auth/session.test.js` - Verifies cookie security based on environment


### Detailed Troubleshooting Guide

#### Issue 1: "401 Unauthorized" on Authenticated Endpoints

**Symptoms:**
```bash
curl -b cookies.txt http://localhost:3001/api/plugins
# Returns: {"error":"Authentication required"}
```

**Diagnosis:**
```bash
# Check if session cookie is in cookies.txt
grep "console.sid" cookies.txt
```

**Likely Causes:**
1. **Cookies not saved during login** - Missing `-c` flag
2. **Secure cookies with HTTP** - Backend configured with `secure: true` but using HTTP
3. **Session expired** - Session lasts 24 hours

**Solution:**
```bash
# 1. Check backend cookie configuration
docker logs minecraft-console | grep "Cookie configuration"
# Should show: secure: false for HTTP

# 2. Re-login with -c flag
curl -c cookies.txt -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"pass"}'

# 3. Verify cookies were saved
cat cookies.txt | grep -E "(console.sid|csrf-token)"
```

#### Issue 2: "invalid csrf token" Error

**Symptoms:**
```bash
curl -b cookies.txt -H "CSRF-Token: abc123" -X POST http://localhost:3001/api/plugins/install
# Returns: {"error":"invalid csrf token"}
```

**Likely Causes:**
1. **CSRF token not obtained after login** - Token from different session
2. **CSRF cookie not saved** - Used `-b` but not `-c` when getting token
3. **Token not sent in header** - Missing or wrong header name
4. **Session cookie not sent** - CSRF validation requires matching session

**Solution:**
```bash
# 1. Fresh authentication flow
rm -f cookies.txt

# 2. Login
curl -c cookies.txt -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"pass"}'

# 3. Get CSRF token (IMPORTANT: both -c and -b)
CSRF_TOKEN=$(curl -s -c cookies.txt -b cookies.txt http://localhost:3001/api/csrf-token | jq -r '.csrfToken')

# 4. Verify both cookies are present
cat cookies.txt | grep -E "(console.sid|csrf-token)"

# 5. Make request with both cookies and header
curl -b cookies.txt -H "CSRF-Token: $CSRF_TOKEN" -X POST http://localhost:3001/api/plugins/install \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/plugin.jar"}'
```

#### Issue 3: Cookies Not Persisting Between Requests

**Symptoms:**
- Login succeeds but next request shows "not authenticated"
- Different session ID on each request

**Diagnosis:**
```bash
# Use -v to see Set-Cookie headers
curl -v -c cookies.txt -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"pass"}' 2>&1 | grep -i "set-cookie"
```

**What to Look For:**
- If you see `Secure` flag but using HTTP → **Problem!**
- Expected for HTTP: `Set-Cookie: console.sid=...; Path=/; HttpOnly; SameSite=Lax`
- Wrong for HTTP: `Set-Cookie: console.sid=...; Path=/; HttpOnly; Secure; SameSite=Lax`

**Solution:**
```bash
# 1. Set environment variable
echo "COOKIE_SECURE=false" >> .env

# 2. Restart backend
docker compose -f docker-compose.console.yml restart console

# 3. Verify configuration
docker logs minecraft-console | grep "Cookie configuration"
# Should show: secure: false
```

### Diagnostic Checklist

```bash
# 1. Check backend cookie configuration
docker logs minecraft-console | grep "Cookie configuration"
# Expected: Both Session and CSRF should show "secure: false" for HTTP testing

# 2. Check backend is running
curl http://localhost:3001/health
# Expected: {"status":"ok"}

# 3. Test login with verbose output
curl -v -c cookies.txt -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"pass"}' 2>&1 | grep -i "set-cookie"
# Expected: Should see Set-Cookie headers WITHOUT "Secure" flag for HTTP

# 4. Verify cookies were saved
cat cookies.txt
# Expected: Should contain console.sid

# 5. Get CSRF token
CSRF_TOKEN=$(curl -s -c cookies.txt -b cookies.txt http://localhost:3001/api/csrf-token | jq -r '.csrfToken')
echo "Token: ${CSRF_TOKEN:0:20}..."

# 6. Verify CSRF cookie was saved
cat cookies.txt | grep csrf-token

# 7. Test authenticated endpoint
curl -b cookies.txt -H "CSRF-Token: $CSRF_TOKEN" http://localhost:3001/api/plugins

# 8. Check debug logs for CSRF details
docker logs minecraft-console | grep PLUGIN_INSTALL_API
# Should show detailed CSRF header and cookie values
```


## Testing Checklist

- [x] All code lints without errors
- [x] All tests pass (auth module tests)
- [x] No security vulnerabilities (CodeQL scan)
- [x] Debug logging works and writes to file
- [x] Session configuration explicit and documented
- [x] CSRF configuration accepts common header names
- [x] Manual test script executable and documented
- [x] Documentation complete and accurate
- [x] Diagnostic workflow collects debug logs
- [x] Code review feedback addressed

## Next Steps

1. Deploy changes to staging/production
2. Run diagnostic workflow to verify debug logs are collected
3. Use manual test script to verify authentication flow
4. Monitor debug logs for authentication issues
5. Adjust session/CSRF configuration if needed based on logs

## Related Documentation

- [PLUGIN-MANAGER.md](../PLUGIN-MANAGER.md) - API authentication section
- [scripts/test-api-auth.sh](../scripts/test-api-auth.sh) - Manual test script
- [.github/workflows/plugin-install-diagnose.yml](../.github/workflows/plugin-install-diagnose.yml) - Diagnostic workflow
