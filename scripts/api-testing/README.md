# API Testing Scripts

This directory contains scripts for testing and profiling the console backend API endpoints.

## Quick Start

**Using the wrapper script (recommended):**
```bash
# Run API profiler
./scripts/run.sh api-test profiler

# Run authentication test
./scripts/run.sh api-test auth

# Run integration tests
./scripts/run.sh api-test integration
```

**Direct execution:**
```bash
# API profiler
./scripts/api-testing/api-profiler.sh

# Auth test
./scripts/api-testing/test-api-auth.sh
```

## Scripts Overview

### api-profiler.sh

Comprehensive API endpoint profiling with timing and error testing.

**When to use:**
- Need to measure API performance
- Investigating slow responses
- Testing all endpoints systematically
- Validating API changes
- Performance regression testing

**What it does:**
- Tests authentication flow (login, session, CSRF)
- Profiles plugin manager APIs (list, history, install)
- Tests RCON APIs (status, players)
- Measures response times
- Tests error cases (invalid credentials, missing CSRF)
- Logs all requests and responses

**Environment Variables:**
- `CONSOLE_URL` - Console base URL (default: http://localhost:3000)
- `ADMIN_USERNAME` - Admin username (default: admin)
- `ADMIN_PASSWORD` - Admin password
- `OUTPUT_DIR` - Output directory (default: /tmp/api-profiler)

**Example:**
```bash
export CONSOLE_URL="http://localhost:3000"
export ADMIN_USERNAME="admin"
export ADMIN_PASSWORD="mypassword"
./scripts/api-testing/api-profiler.sh
```

**Output:**
```
/tmp/api-profiler/
├── SUMMARY.txt                  # Timing summary and results
├── login-response.json          # Login response
├── csrf-token-response.json     # CSRF token response
├── plugins-list-response.json   # Plugin list response
├── *-timing.txt                 # Individual endpoint timings
└── *-error-*.txt                # Error case results
```

### test-api-auth.sh

Quick API authentication flow test.

**When to use:**
- Testing login functionality
- Validating session management
- Quick authentication check
- Debugging login issues

**What it does:**
- Tests login endpoint
- Validates session cookie creation
- Checks session persistence
- Tests logout functionality

**Example:**
```bash
./scripts/api-testing/test-api-auth.sh
```

### test-api-integration.sh

Comprehensive API integration testing.

**When to use:**
- Testing complete authentication flow
- Validating protected endpoints
- End-to-end API testing
- Integration testing before deployment

**What it does:**
- Complete authentication flow (login → CSRF → protected endpoints)
- Tests multiple protected endpoints
- Validates session across requests
- Tests CSRF protection on mutations
- Validates error responses

**Example:**
```bash
export CONSOLE_URL="http://localhost:3000"
export ADMIN_USERNAME="admin"
export ADMIN_PASSWORD="mypassword"
./scripts/api-testing/test-api-integration.sh
```

### test-csrf-double-submit.sh

CSRF double-submit pattern validation.

**When to use:**
- Testing CSRF protection
- Validating security implementation
- Debugging CSRF issues
- Security testing

**What it does:**
- Tests CSRF token generation
- Validates double-submit pattern
- Tests missing CSRF token handling
- Tests invalid CSRF token handling
- Validates cookie and header matching

**Example:**
```bash
./scripts/api-testing/test-csrf-double-submit.sh
```

## Authentication Flow

Understanding the authentication flow is crucial for API testing:

```
1. Login Request
   POST /api/login
   Body: {"username": "admin", "password": "***"}
   ↓
2. Server Response
   - Sets session cookie (connect.sid)
   - Returns user info
   ↓
3. Get CSRF Token
   GET /api/csrf-token
   Cookie: connect.sid
   ↓
4. Server Response
   - Sets CSRF cookie
   - Returns CSRF token in body
   ↓
5. Protected Request
   POST /api/plugins/install
   Cookie: connect.sid + CSRF cookie
   Header: CSRF-Token: [token from step 4]
   ↓
6. Server validates:
   - Session cookie is valid
   - CSRF token in header matches CSRF cookie
   - User has permissions
```

## Common Workflows

### Quick API Health Check

```bash
# Test authentication
./scripts/run.sh api-test auth

# If successful, API is responding correctly
```

### Complete API Testing

```bash
# 1. Run comprehensive profiler
./scripts/run.sh api-test profiler

# 2. Review timing summary
cat /tmp/api-profiler/SUMMARY.txt

# 3. Check for errors
grep -i error /tmp/api-profiler/*.json
```

### CSRF Debugging

```bash
# 1. Run CSRF tests
./scripts/run.sh api-test csrf

# 2. Run integration tests to see CSRF in action
./scripts/run.sh api-test integration

# 3. Review cookie and token handling
cat /tmp/api-integration/*.json
```

### Performance Baseline

```bash
# Run profiler multiple times and compare
for i in {1..5}; do
  ./scripts/run.sh api-test profiler
  cat /tmp/api-profiler/SUMMARY.txt | grep "Total time"
done
```

## Testing Scenarios

### Valid Request Flow

```bash
# 1. Login
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' \
  -c cookies.txt

# 2. Get CSRF token
curl http://localhost:3000/api/csrf-token \
  -b cookies.txt -c cookies.txt

# 3. Make protected request
CSRF_TOKEN=$(curl -s -b cookies.txt http://localhost:3000/api/csrf-token | jq -r '.csrfToken')
curl -X GET http://localhost:3000/api/plugins \
  -b cookies.txt \
  -H "CSRF-Token: $CSRF_TOKEN"
```

### Error Cases

```bash
# Invalid credentials
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"wrong"}'

# Missing CSRF token
curl -X POST http://localhost:3000/api/plugins/install \
  -H "Content-Type: application/json" \
  -d '{"url":"..."}' \
  -b cookies.txt

# Invalid CSRF token
curl -X POST http://localhost:3000/api/plugins/install \
  -H "Content-Type: application/json" \
  -H "CSRF-Token: invalid" \
  -d '{"url":"..."}' \
  -b cookies.txt
```

## Expected Responses

### Successful Login (200)
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "role": "owner"
  }
}
```

### Invalid Credentials (401)
```json
{
  "error": "Invalid username or password"
}
```

### Missing CSRF Token (403)
```json
{
  "error": "Invalid CSRF token"
}
```

### Invalid Session (401)
```json
{
  "error": "Not authenticated"
}
```

## Troubleshooting

### Script Won't Connect

```bash
# Verify console is running
curl -I http://localhost:3000

# Check console URL
echo $CONSOLE_URL

# Test with explicit URL
CONSOLE_URL="http://localhost:3000" ./scripts/api-testing/test-api-auth.sh
```

### Authentication Fails

```bash
# Verify credentials
echo "Username: $ADMIN_USERNAME"
echo "Password length: ${#ADMIN_PASSWORD}"

# Test login manually
curl -v -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}"
```

### CSRF Issues

```bash
# Check if CSRF cookie is being set
curl -v http://localhost:3000/api/csrf-token -c cookies.txt

# View cookies
cat cookies.txt

# Check if token matches cookie
./scripts/api-testing/test-csrf-double-submit.sh
```

### Slow Responses

```bash
# Profile API performance
./scripts/api-testing/api-profiler.sh

# Check backend logs
docker logs minecraft-console --tail 100

# Monitor resources during test
./scripts/run.sh diagnostics resource-monitor &
./scripts/run.sh api-test profiler
```

## Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed
- `2` - Configuration error or missing dependencies

## Related Documentation

- [../README.md](../README.md) - Main scripts documentation
- [../../docs/API-AUTHENTICATION-GUIDE.md](../../docs/API-AUTHENTICATION-GUIDE.md) - API authentication details
- [../../docs/troubleshooting/browser-diagnostics.md](../../docs/troubleshooting/browser-diagnostics.md) - Browser and API diagnostics
