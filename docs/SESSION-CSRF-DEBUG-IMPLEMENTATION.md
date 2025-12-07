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
- `secure: true` in production (HTTPS only)
- `maxAge: 24h` (24-hour session lifetime)

### 3. Enhanced CSRF Configuration

Updated CSRF configuration in `server.js`:
- Added custom `getTokenFromRequest` function
- Checks both `csrf-token` and `x-csrf-token` headers
- Cookie name: `csrf-token`
- Cookie settings match session (sameSite: lax, httpOnly, secure in production)
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

# Get debug logs
curl -b cookies.txt http://localhost:3001/api/debug/logs
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
