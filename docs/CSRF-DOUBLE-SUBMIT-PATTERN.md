# CSRF Double-Submit Pattern Implementation

This document explains the CSRF (Cross-Site Request Forgery) protection implementation used in the Minecraft Console Backend.

## Overview

The backend uses a **simple double-submit CSRF pattern** that requires:
1. A matching CSRF token in both a cookie and a request header
2. An authenticated session

This implementation removes the complexity of HMAC-based token validation, making it simpler to use with curl and automated tools while maintaining security.

## How It Works

### Token Generation

When you request a CSRF token from `/api/csrf-token`:
- The server generates a random 64-character hexadecimal token
- The token is returned in the JSON response body
- The same token is set in a `csrf-token` cookie

### Token Validation

For protected API endpoints (POST, PUT, DELETE requests):
1. The server checks if the session is authenticated
2. The server compares the `csrf-token` cookie value with the `CSRF-Token` or `X-CSRF-Token` header value
3. If both match AND the session is authenticated, the request proceeds
4. Otherwise, a 403 Forbidden response is returned

## Using with curl

### Step 1: Login

```bash
# Login and save cookies
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}' \
  -c cookies.txt \
  -v
```

### Step 2: Get CSRF Token

```bash
# Get CSRF token with authenticated session
curl -X GET http://localhost:3001/api/csrf-token \
  -b cookies.txt \
  -c cookies.txt \
  -v
```

This returns a JSON response like:
```json
{
  "csrfToken": "a1b2c3d4e5f6..."
}
```

The CSRF token is also automatically saved in `cookies.txt`.

### Step 3: Make Protected API Request

```bash
# Install a plugin (example protected endpoint)
CSRF_TOKEN=$(grep csrf-token cookies.txt | awk '{print $7}')

curl -X POST http://localhost:3001/api/plugins/install \
  -H "Content-Type: application/json" \
  -H "CSRF-Token: $CSRF_TOKEN" \
  -b cookies.txt \
  -d '{"url":"https://example.com/plugin.jar"}' \
  -v
```

## Complete Example Script

```bash
#!/bin/bash

# Configuration
BASE_URL="http://localhost:3001"
USERNAME="admin"
PASSWORD="your-password"
COOKIE_FILE="cookies.txt"

# Clean up old cookies
rm -f $COOKIE_FILE

# Step 1: Login
echo "Logging in..."
curl -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" \
  -c $COOKIE_FILE \
  -s

# Step 2: Get CSRF token
echo "Getting CSRF token..."
CSRF_TOKEN=$(curl -X GET "$BASE_URL/api/csrf-token" \
  -b $COOKIE_FILE \
  -c $COOKIE_FILE \
  -s | jq -r '.csrfToken')

echo "CSRF Token: $CSRF_TOKEN"

# Step 3: Make authenticated API request
echo "Installing plugin..."
curl -X POST "$BASE_URL/api/plugins/install" \
  -H "Content-Type: application/json" \
  -H "CSRF-Token: $CSRF_TOKEN" \
  -b $COOKIE_FILE \
  -d '{"url":"https://example.com/plugin.jar"}' \
  -v
```

## Cookie Attributes

The CSRF cookie has the following attributes:
- **httpOnly**: `false` - Allows client-side JavaScript to read the cookie (required for double-submit pattern)
- **sameSite**: `lax` - Provides some CSRF protection while allowing normal navigation
- **secure**: `true` in production (HTTPS), `false` in development/test
- **path**: `/` - Available for all paths

## Security Considerations

### Why httpOnly is false

The CSRF cookie has `httpOnly: false` to allow client-side JavaScript to read it. This is required for the double-submit pattern where the client reads the cookie value and sends it in a request header.

**Security tradeoff**: While this makes the cookie readable by JavaScript (including potential XSS attacks), the CSRF protection still works because:
1. An attacker's malicious script running on a different domain cannot read cookies from your domain (Same-Origin Policy)
2. The session must be authenticated for CSRF validation to pass
3. Both cookie and header values must match

### Defense in Depth

The implementation provides multiple layers of security:
1. **Session Authentication**: Requests must have an authenticated session
2. **Token Matching**: Cookie and header tokens must match exactly
3. **SameSite Cookie**: Prevents some cross-site request scenarios
4. **Secure Cookies**: In production, cookies are only sent over HTTPS

## Supported Headers

The CSRF middleware accepts tokens from either header:
- `CSRF-Token`
- `X-CSRF-Token`

Both are case-insensitive and work identically.

## Error Messages

### 403 Forbidden - CSRF validation failed

Possible reasons:
1. **Session not authenticated**: You need to login first
2. **CSRF token missing from header**: Include `CSRF-Token` or `X-CSRF-Token` header
3. **CSRF cookie missing**: Get a new token from `/api/csrf-token`
4. **Token mismatch**: Cookie and header values don't match

Check the server logs for detailed diagnostic information (in development mode).

## Differences from Previous Implementation

### Before (csrf-csrf library)

- Used HMAC-based token validation with `token|hash` format
- Required complex token parsing with pipe separator
- Failed if cookie didn't contain hash segment

### After (Simple Double-Submit)

- Simple token matching without hash validation
- No pipe separator required
- Easier to use with curl and automated tools
- Same security guarantees with simpler implementation

## References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Double Submit Cookie Pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie)
