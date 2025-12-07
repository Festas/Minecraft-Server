# CSRF Validation Fix Documentation

## Problem Summary

The console backend was experiencing CSRF token validation failures where valid tokens were being rejected with HTTP 200 instead of the correct 403 status for invalid tokens. This was causing plugin installations and other protected operations to fail even when proper authentication and CSRF tokens were provided.

## Root Cause Analysis

### Issue 1: Incorrect Error Handling in CSRF Middleware
**Location:** `console/backend/server.js` lines 204-216

The CSRF protection middleware was calling `next(err)` for both success and failure cases:

```javascript
doubleCsrfProtection(req, res, (err) => {
    if (err) {
        console.error('[CSRF] CSRF validation failed:', {...});
    }
    next(err);  // BUG: Always calls next, even with error
});
```

**Problem:** When CSRF validation failed, the error was passed to the global error handler instead of immediately responding with 403. This caused unpredictable status codes.

### Issue 2: Confusing Error Handler Logic
**Location:** `console/backend/middleware/errorHandler.js` line 30

```javascript
const statusCode = err.status || res.statusCode !== 200 ? res.statusCode : 500;
```

**Problem:** The ternary logic was confusing and could result in returning status 200 even for errors.

## Solution

### Fix 1: Direct 403 Response for CSRF Failures
Changed the CSRF middleware to immediately return 403 when validation fails:

```javascript
doubleCsrfProtection(req, res, (err) => {
    if (err) {
        console.error('[CSRF] CSRF validation failed:', {...});
        // Return 403 Forbidden for CSRF validation failures
        return res.status(403).json({ 
            error: 'invalid csrf token',
            message: 'CSRF token validation failed. Please refresh and try again.'
        });
    }
    console.log('[CSRF] CSRF validation passed:', {...});
    next();  // Only call next() on success
});
```

### Fix 2: Clarified Error Handler Status Code Logic
Improved the status code determination logic:

```javascript
let statusCode = 500;

if (err.status) {
    statusCode = err.status;
} else if (err.statusCode) {
    statusCode = err.statusCode;
} else if (res.statusCode && res.statusCode !== 200) {
    statusCode = res.statusCode;
}
```

## Testing

### Automated Tests
Created comprehensive test suite in `__tests__/middleware/csrf.test.js`:

1. **CSRF Token Generation** (2 tests)
   - Token endpoint returns valid token
   - Cookie is set with correct attributes (HttpOnly, SameSite, Path)

2. **Validation Skipping** (3 tests)
   - Login endpoint skips CSRF (POST /api/login)
   - Session check skips CSRF (GET /api/session)
   - CSRF token endpoint skips CSRF (GET /api/csrf-token)

3. **Validation Failures** (3 tests)
   - Returns 403 when token is missing
   - Returns 403 when header is missing but cookie present
   - Returns 403 when token is invalid

4. **Validation Success** (2 tests)
   - Accepts valid token in CSRF-Token header
   - Accepts valid token in X-CSRF-Token header

5. **Logging Verification** (2 tests)
   - Success logs are generated
   - Failure logs are generated

**Result:** All 12 tests pass ✅

### Integration Test
Created `scripts/test-csrf-integration.sh` for manual end-to-end testing:

1. Login to get authenticated session
2. Fetch CSRF token
3. Test protected endpoint without CSRF (should return 403)
4. Test protected endpoint with invalid CSRF (should return 403)
5. Test protected endpoint with valid CSRF (should return 200)

## Verification

### Before Fix
- CSRF validation errors returned HTTP 200 with JSON error
- Valid tokens were sometimes rejected
- Status codes were inconsistent

### After Fix
- CSRF validation errors return HTTP 403 ✅
- Valid tokens are consistently accepted ✅
- Error messages are clear and actionable ✅
- All 78 existing tests still pass ✅
- No security vulnerabilities (CodeQL scan) ✅

## Impact

### Plugin Install API
The `/api/plugins/install` endpoint now correctly:
- Returns 403 for missing/invalid CSRF tokens
- Accepts valid CSRF tokens and proceeds with installation
- Provides clear error messages for debugging

### All Protected Endpoints
Any POST/PUT/DELETE/PATCH endpoint now:
- Properly validates CSRF tokens
- Returns correct HTTP status codes
- Provides consistent error handling

## Usage

### For API Consumers
The CSRF flow remains unchanged:

1. **Login:**
   ```bash
   curl -c cookies.txt -X POST http://localhost:3001/api/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"yourpass"}'
   ```

2. **Get CSRF Token:**
   ```bash
   curl -b cookies.txt -c cookies.txt \
     -X GET http://localhost:3001/api/csrf-token
   ```

3. **Use Token in Protected Requests:**
   ```bash
   curl -b cookies.txt \
     -H "CSRF-Token: <token-from-step-2>" \
     -X POST http://localhost:3001/api/plugins/install \
     -H "Content-Type: application/json" \
     -d '{"url":"https://example.com/plugin.jar"}'
   ```

### For Developers
Run the integration test script:

```bash
cd console/backend
./scripts/test-csrf-integration.sh
```

Or run the automated tests:

```bash
npm test -- __tests__/middleware/csrf.test.js
```

## Related Files

### Modified
- `console/backend/server.js` - CSRF middleware fix
- `console/backend/middleware/errorHandler.js` - Status code logic fix

### Created
- `console/backend/__tests__/middleware/csrf.test.js` - CSRF test suite
- `console/backend/__tests__/routes/plugins-csrf.test.js` - Plugin API CSRF tests
- `console/backend/scripts/test-csrf-integration.sh` - Integration test script

## Security Considerations

1. **CSRF Secret:** Ensure `CSRF_SECRET` environment variable is set to a secure random value
2. **Cookie Security:** Set `COOKIE_SECURE=false` for HTTP testing, `true` for production HTTPS
3. **Token Transmission:** CSRF tokens are sent in response body, not in cookies or headers
4. **Cookie Attributes:** CSRF cookies use `httpOnly: true` and `sameSite: 'lax'`

## References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [csrf-csrf Library Documentation](https://github.com/Psifi-Solutions/csrf-csrf)
- [Double Submit Cookie Pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie)
