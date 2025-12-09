# Plugin Manager

A comprehensive web-based plugin management system for the Minecraft server console that allows installing, updating, and managing plugins through a user-friendly interface with **zero-downtime self-healing capabilities**.

## 🆕 Version 2 - Job Queue System (Recommended)

**Version 2** introduces a modern, asynchronous job queue system with **stateless Bearer token authentication** for improved reliability and user experience.

### Why V2?

- ✅ **No more frozen UI** - All operations are asynchronous
- ✅ **Real-time progress tracking** - Watch jobs execute with live logs
- ✅ **Stateless authentication** - Simple Bearer token, no sessions/CSRF needed
- ✅ **Job queue** - Multiple operations can be queued and processed in order
- ✅ **Better error handling** - Detailed diagnostics and error logs for each job
- ✅ **API-first design** - Perfect for automation and scripting

### Quick Start (V2)

1. **Generate a Bearer token** for plugin operations:
   ```bash
   openssl rand -base64 48
   ```

2. **Add to your `.env` file**:
   ```bash
   PLUGIN_ADMIN_TOKEN=your-generated-token-here
   ```

3. **Access the V2 interface**:
   - Navigate to `/console/plugins-v2.html`
   - Enter your Bearer token when prompted
   - The token is stored in browser localStorage for convenience

4. **Use the API** (example with curl):
   ```bash
   # Install a plugin
   curl -X POST http://localhost:3001/api/v2/plugins/job \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"action":"install","url":"https://github.com/owner/repo/releases/latest"}'
   
   # Check job status
   curl http://localhost:3001/api/v2/plugins/jobs \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

### V2 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v2/plugins/job` | Submit a plugin job (install/uninstall/update/enable/disable) |
| GET | `/api/v2/plugins/jobs` | List recent plugin jobs with status and logs |
| GET | `/api/v2/plugins/jobs/:id` | Get details of a specific job |
| PUT | `/api/v2/plugins/job/:id/cancel` | Cancel a running or queued job |
| GET | `/api/v2/plugins/list` | List all plugins and their states |
| GET | `/api/v2/plugins/health` | Health check including job worker status |

### V2 Authentication

V2 uses **stateless Bearer token authentication** - no sessions or CSRF tokens required!

**Setup:**
1. Generate a secure token (minimum 32 characters):
   ```bash
   openssl rand -base64 48
   ```

2. Set `PLUGIN_ADMIN_TOKEN` in your `.env` file

3. Include token in API requests:
   ```bash
   Authorization: Bearer YOUR_TOKEN
   ```

**Security Notes:**
- Token should be at least 32 characters (48+ recommended)
- Store securely - never commit to git
- Rotate regularly for security
- Token validation uses constant-time comparison to prevent timing attacks

### Job Queue Workflow

1. **Submit Job** - POST to `/api/v2/plugins/job` with action and parameters
2. **Job Queued** - Job is added to queue with status `queued`
3. **Job Processing** - Worker picks up job, status changes to `running`
4. **Job Completion** - Status changes to `completed`, `failed`, or `cancelled`
5. **View Results** - Check job logs and results via API or UI

**Job States:**
- `queued` - Waiting to be processed
- `running` - Currently being executed
- `completed` - Successfully finished
- `failed` - Encountered an error
- `cancelled` - Cancelled by user

### V2 Example Usage

**Install a plugin:**
```bash
curl -X POST http://localhost:3001/api/v2/plugins/job \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "install",
    "url": "https://github.com/PluginOwner/PluginRepo/releases/latest"
  }'

# Response:
{
  "success": true,
  "job": {
    "id": "job-1701234567890-abc123",
    "action": "install",
    "status": "queued",
    "createdAt": "2024-12-09T10:30:00.000Z"
  }
}
```

**Check job status:**
```bash
curl http://localhost:3001/api/v2/plugins/jobs \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
{
  "success": true,
  "jobs": [
    {
      "id": "job-1701234567890-abc123",
      "action": "install",
      "pluginName": "MyPlugin",
      "status": "completed",
      "logs": [
        {"timestamp": "2024-12-09T10:30:01Z", "message": "Started install operation"},
        {"timestamp": "2024-12-09T10:30:02Z", "message": "Installing plugin from: https://..."},
        {"timestamp": "2024-12-09T10:30:05Z", "message": "Download progress: 100%"},
        {"timestamp": "2024-12-09T10:30:06Z", "message": "Completed successfully"}
      ],
      "result": {
        "status": "installed",
        "pluginName": "MyPlugin",
        "version": "1.2.3"
      },
      "createdAt": "2024-12-09T10:30:00Z",
      "startedAt": "2024-12-09T10:30:01Z",
      "completedAt": "2024-12-09T10:30:06Z"
    }
  ],
  "currentJobId": null
}
```

**Enable/Disable a plugin:**
```bash
# Enable
curl -X POST http://localhost:3001/api/v2/plugins/job \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "enable", "name": "MyPlugin"}'

# Disable
curl -X POST http://localhost:3001/api/v2/plugins/job \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "disable", "name": "MyPlugin"}'
```

**Uninstall a plugin:**
```bash
curl -X POST http://localhost:3001/api/v2/plugins/job \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "uninstall",
    "name": "MyPlugin",
    "options": {"deleteConfigs": false}
  }'
```

**Cancel a job:**
```bash
curl -X PUT http://localhost:3001/api/v2/plugins/job/job-123/cancel \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Version 1 - Legacy (Session-based)

## Features

### Installation
- **Simple URL-based installation** - Just paste a URL and install
- **Smart URL detection** - Automatically detects and handles:
  - Direct JAR URLs
  - GitHub release pages
  - GitHub latest releases
  - Modrinth project pages
  - SpigotMC resources (with manual download guidance)
- **Auto-detection from plugin.yml** - Automatically extracts plugin metadata
- **Conflict detection** - Detects existing plugins and offers update/downgrade/reinstall options
- **Backup before overwrite** - Creates backups before replacing existing plugins
- **Bulk installation** - Install multiple plugins at once

### Management
- **Enable/Disable plugins** - Toggle plugins without uninstalling
- **Rollback support** - Restore previous versions from backups
- **Uninstall options** - Delete JAR only or JAR + configs
- **Installation history** - Track all plugin operations with timestamps

### Safety & Validation
- **JAR validation** - Verifies downloaded files are valid JARs
- **plugin.yml parsing** - Validates required fields
- **Version comparison** - Uses semver for accurate version comparison
- **Config preservation** - Never touches plugin configuration folders

### Self-Healing & Auto-Recovery
- **Automatic diagnostics** - Pre/post-deployment health checks
- **Auto-fix capabilities** - Automatically repairs common configuration issues
- **Network validation** - Ensures proper port mapping and binding
- **Container health monitoring** - Verifies Docker container status and connectivity
- **Zero-downtime recovery** - Auto-restart backend when fixes are applied
- **Comprehensive logging** - Detailed diagnostics artifacts for troubleshooting

## Usage

### Web Interface

1. **Access the Plugin Manager**
   - Navigate to the console at `/console/plugins.html`
   - Or click the "Plugins" button in the sidebar

2. **Install a Plugin**
   - Paste a plugin URL in the input field
   - Optionally provide a custom name
   - Click "Install Plugin"
   - Follow any prompts for conflicts or multiple JAR options

3. **Manage Plugins**
   - Toggle the switch to enable/disable plugins
   - Click the rollback icon (↩️) to restore from backup
   - Click the trash icon (🗑️) to uninstall

4. **Bulk Install**
   - Click "Bulk Install" button
   - Paste multiple URLs (one per line)
   - Click "Install All"

### Command Line

The install-plugins.sh script now supports the `url` source type:

```json
{
  "name": "MyPlugin",
  "enabled": true,
  "category": "custom",
  "source": "url",
  "direct_url": "https://example.com/MyPlugin.jar",
  "version": "1.0.0",
  "description": "Custom plugin installed from URL"
}
```

Then run:
```bash
./install-plugins.sh
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/plugins` | List all plugins |
| POST | `/api/plugins/parse-url` | Parse URL to detect type |
| POST | `/api/plugins/install` | Install plugin from URL |
| POST | `/api/plugins/proceed-install` | Proceed after conflict detection |
| POST | `/api/plugins/uninstall` | Uninstall a plugin |
| POST | `/api/plugins/toggle` | Enable/disable a plugin |
| POST | `/api/plugins/rollback` | Rollback to backup |
| GET | `/api/plugins/history` | Get installation history |

### API Authentication

All plugin API endpoints require authentication. The API uses session-based authentication with CSRF protection.

#### Authentication Flow

1. **Login** - Authenticate and create session
   ```bash
   curl -c cookies.txt -X POST http://localhost:3001/api/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"your-password"}'
   ```
   
   Response:
   ```json
   {"success":true,"message":"Login successful","sessionID":"..."}
   ```

2. **Get CSRF Token** - Required for all protected endpoints
   ```bash
   curl -b cookies.txt -X GET http://localhost:3001/api/csrf-token
   ```
   
   Response:
   ```json
   {"csrfToken":"abc123..."}
   ```

3. **Make Authenticated Requests** - Include session cookie and CSRF token
   ```bash
   curl -b cookies.txt -X GET http://localhost:3001/api/plugins \
     -H "CSRF-Token: abc123..."
   ```

#### Complete Example: Installing a Plugin via API

```bash
#!/bin/bash

# 1. Login and save session cookie
LOGIN_RESPONSE=$(curl -s -c cookies.txt -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}')

echo "Login: $LOGIN_RESPONSE"

# 2. Get CSRF token
CSRF_TOKEN=$(curl -s -b cookies.txt http://localhost:3001/api/csrf-token | jq -r '.csrfToken')

echo "CSRF Token: ${CSRF_TOKEN:0:20}..."

# 3. Get current plugins
curl -s -b cookies.txt -H "CSRF-Token: $CSRF_TOKEN" \
  http://localhost:3001/api/plugins | jq '.'

# 4. Install a plugin
curl -s -b cookies.txt -X POST http://localhost:3001/api/plugins/install \
  -H "Content-Type: application/json" \
  -H "CSRF-Token: $CSRF_TOKEN" \
  -d '{"url":"https://github.com/owner/repo/releases/latest"}' | jq '.'
```

#### Session and Cookie Configuration

The backend uses the following session/cookie settings:

- **Session Cookie Name**: `console.sid`
- **Cookie Settings** (identical for both session and CSRF cookies):
  - `httpOnly: true` - Prevents XSS attacks
  - `secure: <environment-based>` - See Cookie Security below
  - `sameSite: 'lax'` - Compatible with API calls
  - `maxAge: 24h` - Session expires after 24 hours (session cookie only)
  - `path: '/'` - Available for all paths

- **CSRF Cookie Name**: `csrf-token`
- **CSRF Header**: `CSRF-Token` or `X-CSRF-Token`

#### Cookie Security Configuration

**Critical:** Cookie security settings determine whether cookies work over HTTP or require HTTPS.

**Understanding `secure` Cookie Flag:**
- `secure: true` - Cookies ONLY sent over HTTPS (secure connections)
- `secure: false` - Cookies sent over both HTTP and HTTPS

**Default Behavior (when COOKIE_SECURE is not set):**
- **Production** (`NODE_ENV=production`): `secure: true` (HTTPS required)
- **Development** (`NODE_ENV=development`): `secure: false` (HTTP allowed)
- **Test** (`NODE_ENV=test`): `secure: false` (HTTP allowed)

**Override for HTTP Testing:**

Set `COOKIE_SECURE=false` in `.env` to force HTTP cookie support regardless of NODE_ENV:

```bash
# In .env file
NODE_ENV=production
COOKIE_SECURE=false  # Override: allow HTTP even in production mode
```

Or in docker-compose.yml:
```yaml
environment:
  - NODE_ENV=production
  - COOKIE_SECURE=false
```

**When to Use COOKIE_SECURE=false:**
- Local development on `http://localhost`
- CI/CD testing over plain HTTP
- curl/diagnostic scripts without SSL
- Testing API before SSL is configured
- Any environment without HTTPS/TLS

**Verification:**

Check backend startup logs for cookie configuration:

```bash
docker logs minecraft-console | grep "Cookie configuration"
```

Expected output:
```
[Session] Cookie configuration: { secure: false, nodeEnv: 'production', cookieSecureOverride: 'false', warning: 'HTTP allowed - cookies work without SSL' }
[CSRF] Cookie configuration: { secure: false, nodeEnv: 'production', cookieSecureOverride: 'false', warning: 'HTTP allowed - cookies work without SSL' }
```

#### curl Workflow Examples

**Complete Authentication Flow with Cookie Files:**

```bash
# Step 1: Login and save session cookie to cookies.txt
curl -c cookies.txt -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'

# Response: {"success":true,"message":"Login successful"}

# Step 2: Get CSRF token (send session cookie, save CSRF cookie)
# Note: Both -c and -b flags are required here
#   -c cookies.txt: Save the new CSRF cookie
#   -b cookies.txt: Send the existing session cookie
curl -c cookies.txt -b cookies.txt http://localhost:3001/api/csrf-token

# Response: {"csrfToken":"abc123xyz..."}
# Extract token for next step (requires jq - install with: apt-get install jq)
CSRF_TOKEN=$(curl -s -c cookies.txt -b cookies.txt http://localhost:3001/api/csrf-token | jq -r '.csrfToken')
# Verify extraction succeeded
if [ -z "$CSRF_TOKEN" ] || [ "$CSRF_TOKEN" = "null" ]; then
    echo "ERROR: Failed to extract CSRF token"
    exit 1
fi

# Step 3: Make authenticated API request
# Send both cookies and CSRF token in header
curl -b cookies.txt \
  -H "CSRF-Token: $CSRF_TOKEN" \
  http://localhost:3001/api/plugins

# Step 4: Install a plugin
curl -b cookies.txt -X POST \
  -H "Content-Type: application/json" \
  -H "CSRF-Token: $CSRF_TOKEN" \
  http://localhost:3001/api/plugins/install \
  -d '{"url":"https://github.com/owner/repo/releases/latest"}'
```

**Important curl Flags:**
- `-c cookies.txt` - **Save** cookies received from server to file
- `-b cookies.txt` - **Send** cookies from file to server
- Use **both** `-c` and `-b` when you need to save new cookies AND send existing ones

**Complete Script Example:**

```bash
#!/bin/bash
set -e

BASE_URL="http://localhost:3001"
COOKIES_FILE="cookies.txt"

# Clean up old cookies
rm -f "$COOKIES_FILE"

echo "=== Step 1: Login ==="
curl -s -c "$COOKIES_FILE" -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}' | jq '.'

echo -e "\n=== Step 2: Get CSRF Token ==="
CSRF_TOKEN=$(curl -s -c "$COOKIES_FILE" -b "$COOKIES_FILE" "$BASE_URL/api/csrf-token" | jq -r '.csrfToken' 2>/dev/null)

# Verify token was extracted
if [ -z "$CSRF_TOKEN" ] || [ "$CSRF_TOKEN" = "null" ]; then
    echo "ERROR: Failed to extract CSRF token"
    exit 1
fi

echo "CSRF Token: ${CSRF_TOKEN:0:20}..."

echo -e "\n=== Step 3: List Plugins ==="
curl -s -b "$COOKIES_FILE" \
  -H "CSRF-Token: $CSRF_TOKEN" \
  "$BASE_URL/api/plugins" | jq '.plugins[] | {name, version, enabled}'

echo -e "\n=== Step 4: Install Plugin ==="
curl -s -b "$COOKIES_FILE" -X POST \
  -H "Content-Type: application/json" \
  -H "CSRF-Token: $CSRF_TOKEN" \
  "$BASE_URL/api/plugins/install" \
  -d '{"url":"https://github.com/owner/repo/releases/latest"}' | jq '.'

echo -e "\n=== Done ==="
rm -f "$COOKIES_FILE"
```

#### Debugging Authentication Issues

If you encounter authentication or CSRF errors, use the debug logs endpoint:

```bash
# Get debug logs (requires authentication)
curl -s -b cookies.txt http://localhost:3001/api/debug/logs > debug.log
```

The debug logs show detailed information about:
- Session ID and authentication state
- Cookie values (session and CSRF)
- Request headers
- CSRF token validation
- Authentication checks

Or use the provided test script:
```bash
./scripts/test-api-auth.sh
```

This script tests the complete authentication flow and provides detailed output.

**Common Issues:**

1. **"401 Unauthorized" or "invalid csrf token" errors**
   - Check if COOKIE_SECURE is set correctly for your environment
   - Verify cookies.txt contains both session and CSRF cookies
   - Ensure you're using both `-c` and `-b` flags with curl when needed

2. **Cookies not persisting between requests**
   - Likely cause: `secure: true` cookies with HTTP requests
   - Solution: Set `COOKIE_SECURE=false` in environment
   - Verify in logs: both Session and CSRF should show `secure: false`

3. **CSRF token validation fails**
   - Ensure CSRF token is sent in header: `-H "CSRF-Token: $TOKEN"`
   - Ensure session cookie is sent: `-b cookies.txt`
   - Check that CSRF token was obtained AFTER login (same session)

**Debug Checklist:**

```bash
# 1. Check backend cookie configuration
docker logs minecraft-console | grep "Cookie configuration"
# Should show: secure: false for HTTP testing

# 2. Verify cookies are saved
cat cookies.txt
# Should contain: console.sid and csrf-token

# 3. Test login
curl -v -c cookies.txt -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"pass"}'
# Look for Set-Cookie headers in response

# 4. Get CSRF token with verbose output
curl -v -c cookies.txt -b cookies.txt http://localhost:3001/api/csrf-token
# Should show both sending cookies and receiving new CSRF cookie

# 5. Check debug logs
curl -s -b cookies.txt http://localhost:3001/api/debug/logs | tail -50
```

## URL Format Support

### Direct JAR
```
https://example.com/Plugin-1.0.0.jar
```

### GitHub Release (specific tag)
```
https://github.com/owner/repo/releases/tag/v1.0.0
```

### GitHub Latest Release
```
https://github.com/owner/repo/releases/latest
```

### Modrinth Project
```
https://modrinth.com/plugin/project-slug
```

### SpigotMC (Manual Download Required)
```
https://www.spigotmc.org/resources/plugin.12345/
```
*Note: SpigotMC requires manual download. The system will provide instructions.*

## Plugin Metadata Auto-Detection

The system automatically extracts the following from plugin.yml:
- `name` - Plugin name
- `version` - Plugin version
- `description` - Plugin description
- `author` / `authors` - Plugin author(s)
- `api-version` - Minecraft API version
- `depend` - Required dependencies
- `softdepend` - Optional dependencies

## Version Comparison

The system uses semantic versioning (semver) to compare plugin versions:
- **Upgrade**: New version is higher (v1.0 → v2.0)
- **Downgrade**: New version is lower (v2.0 → v1.0)
- **Same**: Versions are identical

## Hot-Loading with PlugManX

When PlugManX is installed, the system can hot-load plugins without server restart:
- Install PlugManX from Modrinth (already in plugins.json)
- After installation, plugins can be loaded/unloaded dynamically
- If PlugManX is not available, a server restart is required

## File Structure

```
console/
├── backend/
│   ├── routes/
│   │   └── plugins.js           # Plugin API routes
│   ├── services/
│   │   ├── pluginParser.js      # Parse plugin.yml from JAR
│   │   ├── urlParser.js         # Smart URL detection
│   │   └── pluginManager.js     # Core plugin management
│   ├── middleware/
│   │   └── debugLogger.js       # Debug logging for session/CSRF
│   ├── data/
│   │   └── plugin-history.json  # Installation history log
│   └── logs/
│       └── api-debug.log        # API debug logs (session, cookies, CSRF)
└── frontend/
    ├── plugins.html             # Plugin manager UI
    ├── js/
    │   └── plugins.js           # Plugin manager logic
    └── css/
        └── plugins.css          # Plugin manager styles
```

## Security

- All endpoints require authentication (session-based)
- CSRF protection enabled on all POST/PUT/DELETE endpoints
- Rate limiting applied (20 requests/minute for plugin operations)
- Input validation and sanitization
- JAR file validation before installation
- Session cookies with httpOnly and secure flags (production)
- Debug logging for troubleshooting authentication issues
  - Logs session state, cookies, and CSRF tokens
  - Available at `/api/debug/logs` (authenticated endpoint)
  - Automatically collected in diagnostic workflows

## Dependencies

### Backend
- `adm-zip` - JAR file manipulation
- `js-yaml` - plugin.yml parsing
- `semver` - Version comparison
- `axios` - HTTP requests

### Frontend
- Vanilla JavaScript (no frameworks)
- Uses existing console UI components

## Configuration

Edit `plugins.json` to add plugins:

```json
{
  "plugins": [
    {
      "name": "PluginName",
      "enabled": true,
      "category": "custom",
      "source": "url",
      "direct_url": "https://example.com/Plugin.jar",
      "version": "1.0.0",
      "description": "Plugin description",
      "installed_at": "2025-12-04T23:00:00Z"
    }
  ]
}
```

## Troubleshooting

### Plugin Manager Shows "Failed to load plugins"

**Symptoms:**
- Empty plugin list with error message
- Console shows error about plugins.json

**Common Causes & Solutions:**

1. **Missing plugins.json file**
   - Create an empty `plugins.json` in repository root:
     ```json
     {
       "plugins": []
     }
     ```

2. **Corrupt plugins.json (JSON parse error)**
   - Check the file for syntax errors
   - Validate JSON at https://jsonlint.com/
   - Look for missing commas, brackets, or quotes
   - Check backend logs for specific parse error location

3. **Empty plugins.json**
   - File exists but is empty or contains only whitespace
   - Add proper structure: `{"plugins": []}`

4. **Plugins directory not writable**
   - Check directory permissions: `ls -la plugins/`
   - Ensure the console process has write access
   - Fix with: `chmod 755 plugins/`

### Plugin Installation Hangs or Times Out

**Symptoms:**
- Installation appears stuck
- No progress updates
- Eventually fails with timeout error

**Common Causes & Solutions:**

1. **Slow or unresponsive remote server**
   - Plugin files are downloaded with 2-minute timeout
   - Large plugins may need more time
   - Try downloading manually and using direct JAR URL

2. **Network connectivity issues**
   - Check internet connection
   - Verify URL is accessible: `curl -I <url>`
   - Check firewall settings

3. **File size too large (>100MB)**
   - Plugin exceeds maximum file size limit
   - Download manually and place in `plugins/` folder
   - Update plugins.json manually

### Installation Fails

**Symptoms:**
- Error message: "Installation failed"
- Plugin not added to list

**Common Causes & Solutions:**

1. **Invalid JAR file**
   - File is not a valid JAR
   - Missing plugin.yml inside JAR
   - Corrupted download
   - Solution: Download from official source

2. **Plugins directory not accessible**
   - Error: "Plugins directory not accessible or not writable"
   - Check directory exists: `ls -la plugins/`
   - Check permissions: should be readable and writable

3. **Insufficient disk space**
   - Check available space: `df -h`
   - Free up space or expand volume

### GitHub API rate limiting

**Symptoms:**
- Error message about rate limiting
- Cannot install from GitHub releases

**Solution:**
- Set `GITHUB_TOKEN` environment variable in `.env`
- This increases rate limit from 60 to 5000 requests/hour
- Get token from: https://github.com/settings/tokens

### Plugin doesn't load after installation

**Symptoms:**
- Plugin installed successfully
- Not appearing in server plugin list

**Common Causes & Solutions:**

1. **Server restart required**
   - Check if PlugManX is installed
   - Without PlugManX, restart server to load plugins
   - With PlugManX: plugins load automatically

2. **Plugin dependencies missing**
   - Check plugin.yml for required dependencies
   - Install dependencies first
   - Restart server after all dependencies installed

3. **Incompatible Minecraft version**
   - Verify plugin supports your server version
   - Check plugin description for compatibility
   - Try different plugin version

### Health Check Endpoint

Check plugin manager status:
```bash
curl http://localhost:3001/api/plugins/health
```

**Healthy Response (200):**
```json
{
  "status": "healthy",
  "checks": {
    "pluginsJson": {
      "status": "ok",
      "message": "Found 15 plugins"
    },
    "pluginsDir": {
      "status": "ok",
      "message": "Directory is writable"
    }
  }
}
```

**Unhealthy Response (503):**
```json
{
  "status": "unhealthy",
  "checks": {
    "pluginsJson": {
      "status": "error",
      "message": "JSON parse error: Unexpected token ..."
    },
    "pluginsDir": {
      "status": "ok",
      "message": "Directory is writable"
    }
  }
}
```

### Frontend Shows Blank Screen

**Symptoms:**
- Plugin page doesn't load
- JavaScript errors in console

**Solution:**
- Hard refresh browser (Ctrl+Shift+R)
- Clear browser cache
- Check browser console for specific errors
- Verify authentication (may need to re-login)

### API Not Reachable / Connection Refused

**Symptoms:**
- Cannot access `http://localhost:3001/api/plugins`
- Cannot access `http://localhost:3001/api/plugins/health`
- Connection refused or timeout errors
- Container is running but API doesn't respond

**Common Causes & Solutions:**

1. **Backend not binding to correct address**
   - **Check:** Server should bind to `0.0.0.0:3001` (all interfaces), not `127.0.0.1`
   - **Verify:** Look for "Console server running on 0.0.0.0:3001" in container logs:
     ```bash
     docker logs minecraft-console | grep "running on"
     ```
   - **Fix:** Update `server.js` to explicitly bind to `0.0.0.0`:
     ```javascript
     server.listen(PORT, '0.0.0.0', () => { ... });
     ```

2. **Docker port mapping not configured**
   - **Check:** Verify port mapping exists:
     ```bash
     docker port minecraft-console
     # Should show: 3001/tcp -> 0.0.0.0:3001
     ```
   - **Fix:** Update `docker-compose.console.yml`:
     ```yaml
     ports:
       - "3001:3001"
     ```
   - Recreate container: `docker compose -f docker-compose.console.yml up -d --force-recreate`

3. **Port bound to localhost only (127.0.0.1)**
   - **Symptoms:** API works from inside container but not from host/SSH
   - **Check binding:** From host machine:
     ```bash
     # On host (via SSH)
     netstat -tuln | grep 3001
     # or
     ss -tuln | grep 3001
     # Should show 0.0.0.0:3001, not 127.0.0.1:3001
     ```
   - **Test from inside container:**
     ```bash
     docker exec minecraft-console curl -s http://localhost:3001/health
     # Should return: {"status":"ok"}
     ```
   - **Test from host:**
     ```bash
     curl -s http://localhost:3001/health
     # Should also work if bound correctly
     ```

4. **Missing CSRF_SECRET environment variable**
   - **Symptoms:** Container starts but server crashes immediately
   - **Check logs:**
     ```bash
     docker logs minecraft-console
     # Look for: "ERROR: CSRF_SECRET environment variable must be set!"
     ```
   - **Fix:** Add to `.env` file:
     ```bash
     CSRF_SECRET=$(openssl rand -base64 32)
     ```
   - Recreate container: `docker compose -f docker-compose.console.yml up -d --force-recreate`

5. **Firewall blocking port 3001**
   - **Check:** Verify firewall rules:
     ```bash
     sudo ufw status | grep 3001
     # or
     sudo iptables -L -n | grep 3001
     ```
   - **Fix:** Allow port 3001:
     ```bash
     sudo ufw allow 3001/tcp
     ```

6. **Network diagnostics**
   - Run the diagnostic script with network checks:
     ```bash
     ./scripts/diagnose-plugins.sh diagnose
     ```
   - Check section "Network Binding and Port Check" in output
   - Look for binding to `0.0.0.0` vs `127.0.0.1`

**Quick Test Checklist:**
```bash
# 1. Check container is running
docker ps | grep minecraft-console

# 2. Check port mapping
docker port minecraft-console

# 3. Check binding from container logs
docker logs minecraft-console | grep "running on"

# 4. Test from inside container
docker exec minecraft-console curl -s http://localhost:3001/health

# 5. Test from host
curl -s http://localhost:3001/health

# 6. Check port binding on host
netstat -tuln | grep 3001   # or: ss -tuln | grep 3001

# 7. Run diagnostics
./scripts/diagnose-plugins.sh diagnose
```

## Diagnostic Tools

The plugin manager includes comprehensive diagnostic scripts to help troubleshoot issues.

### Basic Diagnostics (`diagnose-plugins.sh`)

This script performs basic health checks and can automatically fix common issues.

**Features:**
- Checks `plugins.json` existence and validity
- Validates JSON syntax
- Checks plugins directory presence and permissions
- Validates `plugin-history.json`
- Tests API backend reachability
- **Verifies network port binding (0.0.0.0 vs 127.0.0.1)**
- **Checks Docker port mapping configuration**
- Auto-fixes missing or corrupt files
- Fixes directory permission problems

**Usage:**

**Diagnose mode** (check only):
```bash
./scripts/diagnose-plugins.sh diagnose
```

**Fix mode** (check and auto-repair):
```bash
./scripts/diagnose-plugins.sh fix
```

**What gets auto-fixed:**
- Missing `plugins.json` - creates with empty structure
- Empty `plugins.json` - initializes with proper structure
- Corrupt `plugins.json` - backs up and recreates (backup saved)
- Missing plugins directory - creates with correct permissions
- Incorrect directory permissions - fixes read/write/execute permissions
- Missing `plugin-history.json` - creates with empty array
- Corrupt `plugin-history.json` - backs up and recreates

**Output:**
- Creates timestamped directory: `/tmp/plugin-diagnostics-YYYYMMDD-HHMMSS/`
- Contains detailed logs for each diagnostic section
- Summary report with issues found and fixes applied
- Lists manual actions needed (if any)

### Advanced Diagnostics (`diagnose-plugins-advanced.sh`)

This script performs deep diagnostics that go beyond basic file checks.

**Features:**
- Analyzes backend logs for errors
- Validates API schema and responses
- Tests authentication mechanisms
- Checks Docker container mounts and volumes
- Validates backend dependencies
- Deep file system analysis
- Identifies issues not auto-fixable

**Usage:**
```bash
./scripts/diagnose-plugins-advanced.sh
```

**What it checks:**
- Backend container logs for plugin-related errors
- JSON parsing errors in logs
- File access errors (ENOENT, EACCES)
- API endpoint health and schema validation
- Authentication and session handling
- CSRF protection
- Docker volume mounts (read-write status)
- Container environment variables
- Node.js and npm versions
- Required npm dependencies installation
- Disk space availability
- Orphaned backup files
- Duplicate plugin installations

**Output:**
- Creates timestamped directory: `/tmp/plugin-diagnostics-advanced-YYYYMMDD-HHMMSS/`
- Detailed section logs for each diagnostic area
- Container inspection data (if using Docker)
- Backend log excerpts
- Summary with warnings, errors, and recommendations

### GitHub Actions Workflow

Automated diagnostics can be run via GitHub Actions.

**Workflow:** `.github/workflows/plugins-manager-diagnose.yml`

**Trigger:** Manual (workflow_dispatch)

**Options:**
- **Mode:** `diagnose` or `fix`
- **Run advanced diagnostics:** `true` or `false`
- **Restart backend if repairs made:** `true` or `false`

**What it does:**
1. Uploads diagnostic scripts to the server
2. Runs basic diagnostics (optionally with auto-fix)
3. Runs advanced diagnostics (if enabled)
4. Downloads diagnostic reports
5. Uploads reports as GitHub Artifacts (30-day retention)
6. Displays summary in workflow output
7. Optionally restarts backend if fixes were applied

**Artifacts:**
- `plugin-diagnostics-basic-{run_number}` - Basic diagnostic logs
- `plugin-diagnostics-advanced-{run_number}` - Advanced diagnostic logs

## Zero-Downtime Self-Healing

The plugin manager includes comprehensive self-healing capabilities that automatically detect and fix common issues during deployment and runtime.

### How It Works

1. **Pre-Deployment Check**
   - Runs before every deployment
   - Validates configuration files
   - Checks port mappings and network binding
   - Auto-fixes detected issues
   - Creates pre-deployment diagnostic artifact

2. **Post-Deployment Verification**
   - Runs after successful deployment
   - Verifies container health
   - Validates API connectivity
   - Auto-fixes any configuration drift
   - Auto-restarts backend if fixes applied
   - Creates post-deployment diagnostic artifact

3. **Continuous Monitoring**
   - Health endpoints at `/health` and `/api/plugins/health`
   - Docker healthchecks every 30 seconds
   - Automatic container restart on unhealthy status

### Auto-Fix Capabilities

The diagnostic system automatically fixes:

- ✅ Missing or empty `plugins.json` - Creates with proper structure
- ✅ Corrupt JSON files - Backs up and recreates (preserves backups)
- ✅ Missing plugins directory - Creates with correct permissions
- ✅ Incorrect directory permissions - Sets proper read/write/execute
- ✅ Missing `plugin-history.json` - Initializes with empty array
- ✅ Configuration file issues - Validates and repairs

### Deployment Artifacts

Every deployment generates diagnostic artifacts:

- **Pre-deployment diagnostics** - State before deployment
- **Post-deployment diagnostics** - State after deployment
- **Deployment summary** - Comprehensive health report
- **Container logs** - Backend startup and error logs

Artifacts are retained for 30 days and available in GitHub Actions.

### Port Mapping & Network Binding

**Critical Configuration:**

The backend server **must** bind to `0.0.0.0:3001` (all interfaces) in Docker containers to accept external connections.

**Automatic Validation:**
- Pre-deployment checks verify port mapping in `docker-compose.yml`
- Post-deployment validates actual port binding in running container
- Diagnostics check both Docker port mapping and in-container binding

**Expected Configuration:**

`docker-compose.console.yml`:
```yaml
services:
  console:
    ports:
      - "3001:3001"
    environment:
      - API_PORT=3001
      - CONSOLE_PORT=3001
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
```

`server.js`:
```javascript
const HOST = '0.0.0.0';
const PORT = process.env.CONSOLE_PORT || 3001;
server.listen(PORT, HOST, () => {
    console.log(`✓ Console Server Started Successfully`);
    console.log(`Server binding: ${HOST}:${PORT}`);
    // ... additional startup logs
});
```

**Startup Log Message:**

When the backend starts correctly, you should see:
```
═══════════════════════════════════════════════════════════
✓ Console Server Started Successfully
═══════════════════════════════════════════════════════════
Server binding:     0.0.0.0:3001
Node environment:   production
API base URL:       http://0.0.0.0:3001/api
Health endpoint:    http://0.0.0.0:3001/health
Plugin API:         http://0.0.0.0:3001/api/plugins
Plugin Health:      http://0.0.0.0:3001/api/plugins/health
═══════════════════════════════════════════════════════════
```

**Error Handling:**

If the server fails to bind, you'll see detailed error messages:
```
═══════════════════════════════════════════════════════════
✗ Server Failed to Start
═══════════════════════════════════════════════════════════
ERROR: Port 3001 is already in use
Solution: Stop the process using port 3001 or use a different port
Check with: lsof -i :3001 or netstat -tuln | grep 3001
═══════════════════════════════════════════════════════════
```

### Manual Restart

If auto-restart is disabled, restart manually:

```bash
# Using docker compose
cd /home/deploy/minecraft-console
docker compose restart

# Or restart container directly
docker restart minecraft-console

# Wait for healthy status
docker ps --filter "name=minecraft-console"
```

## Troubleshooting

### Common Issues

#### 1. API Not Reachable (Connection Refused)

**Symptoms:**
- Cannot access `http://server-ip:3001/api/plugins`
- Console shows "Cannot connect to backend"
- `curl http://localhost:3001/health` fails

**Diagnosis:**
```bash
# Run diagnostics
./scripts/diagnose-plugins.sh diagnose

# Check specific sections
cat /tmp/plugin-diagnostics-*/06-network-binding.log
cat /tmp/plugin-diagnostics-*/07-docker-port-mapping.log
```

**Common Causes & Solutions:**

1. **Container not running**
   ```bash
   docker ps | grep minecraft-console
   # If not running:
   docker compose -f docker-compose.console.yml up -d
   ```

2. **Port not mapped in docker-compose.yml**
   ```bash
   # Check for ports section
   grep -A 2 "ports:" docker-compose.console.yml
   # Should show: - "3001:3001"
   
   # If missing, add and recreate:
   docker compose -f docker-compose.console.yml up -d --force-recreate
   ```

3. **Server binding to localhost only**
   ```bash
   # Check container logs
   docker logs minecraft-console | grep "binding"
   # Should show: Server binding: 0.0.0.0:3001
   # NOT: Server binding: 127.0.0.1:3001
   
   # If wrong, server.js needs to use HOST = '0.0.0.0'
   ```

4. **Firewall blocking port 3001**
   ```bash
   # Check if port is open
   sudo ufw status | grep 3001
   # Open if needed:
   sudo ufw allow 3001
   ```

**Auto-Fix:**
```bash
# Run diagnostics with auto-fix and auto-restart
AUTO_RESTART=true ./scripts/diagnose-plugins.sh fix
```

#### 2. Port 3001 Already in Use

**Symptoms:**
- Backend fails to start
- Error: "EADDRINUSE: address already in use"

**Diagnosis:**
```bash
# Find what's using port 3001
lsof -i :3001
# Or:
netstat -tuln | grep 3001
```

**Solutions:**

1. **Stop conflicting process**
   ```bash
   # Find PID from lsof/netstat output
   kill <PID>
   ```

2. **Use different port**
   ```bash
   # Update .env file
   echo "CONSOLE_PORT=3002" >> .env
   # Update docker-compose.yml ports section
   # Restart container
   ```

#### 3. Docker Container Unhealthy

**Symptoms:**
- Container status shows "unhealthy"
- Health check failing

**Diagnosis:**
```bash
# Check health status
docker inspect --format='{{.State.Health.Status}}' minecraft-console

# Check health check logs
docker inspect --format='{{json .State.Health}}' minecraft-console | python3 -m json.tool

# Check container logs
docker logs minecraft-console --tail=50
```

**Common Causes:**

1. **Health endpoint not responding**
   ```bash
   # Test from inside container
   docker exec minecraft-console wget --spider http://localhost:3001/health
   
   # If fails, backend may not be running or crashed
   docker logs minecraft-console
   ```

2. **Missing CSRF_SECRET or other required env vars**
   ```bash
   # Check environment
   docker exec minecraft-console env | grep -E "CSRF_SECRET|ADMIN_PASSWORD"
   
   # These must be set, or backend won't start
   ```

3. **Backend startup failure**
   ```bash
   # Check logs for errors
   docker logs minecraft-console | grep -i error
   ```

**Auto-Fix:**
```bash
# Run full diagnostics with fix and restart
AUTO_RESTART=true ./scripts/diagnose-plugins.sh fix
```

#### 4. plugins.json Corrupt or Invalid

**Symptoms:**
- API returns empty plugin list
- Backend logs show JSON parse errors
- Plugin manager UI shows no plugins

**Diagnosis:**
```bash
# Check file
cat /path/to/plugins.json

# Validate JSON
jq '.' /path/to/plugins.json
# Or:
python3 -c "import json; json.load(open('plugins.json'))"
```

**Auto-Fix:**
```bash
# Diagnostics will detect and fix
./scripts/diagnose-plugins.sh fix

# Or manually:
cp plugins.json plugins.json.backup
echo '{"plugins": []}' > plugins.json
```

#### 5. Permission Errors

**Symptoms:**
- Cannot create/modify plugins
- EACCES errors in logs

**Diagnosis:**
```bash
# Check permissions
ls -la plugins/
ls -la plugins.json

# Check ownership
docker exec minecraft-console ls -la /minecraft/plugins
```

**Auto-Fix:**
```bash
./scripts/diagnose-plugins.sh fix
```

### Diagnostic Tools

#### Basic Diagnostics

**Quick Check:**
```bash
# Run basic diagnostics
./scripts/diagnose-plugins.sh diagnose

# Review summary
cat /tmp/plugin-diagnostics-*/summary.log
```

**Auto-Fix Common Issues:**
```bash
# Run with auto-fix
./scripts/diagnose-plugins.sh fix

# Review what was fixed
cat /tmp/plugin-diagnostics-*/fixes.log
```

**Deep Analysis:**
```bash
# Run advanced diagnostics
./scripts/diagnose-plugins-advanced.sh

# Review all findings
ls /tmp/plugin-diagnostics-advanced-*/
cat /tmp/plugin-diagnostics-advanced-*/summary.log
```

**Review Individual Sections:**
```bash
# Basic diagnostics sections
cat /tmp/plugin-diagnostics-*/01-plugins-json.log
cat /tmp/plugin-diagnostics-*/02-plugins-directory.log
cat /tmp/plugin-diagnostics-*/03-plugin-history.log
cat /tmp/plugin-diagnostics-*/04-api-backend.log
cat /tmp/plugin-diagnostics-*/05-backend-process.log
cat /tmp/plugin-diagnostics-*/06-network-binding.log
cat /tmp/plugin-diagnostics-*/07-docker-port-mapping.log
cat /tmp/plugin-diagnostics-*/08-compose-config.log
cat /tmp/plugin-diagnostics-*/09-auto-restart.log
cat /tmp/plugin-diagnostics-*/deployment-summary.txt

# Advanced diagnostics sections
cat /tmp/plugin-diagnostics-advanced-*/01-log-analysis.log
cat /tmp/plugin-diagnostics-advanced-*/02-api-schema.log
cat /tmp/plugin-diagnostics-advanced-*/03-auth-session.log
cat /tmp/plugin-diagnostics-advanced-*/04-docker-analysis.log
cat /tmp/plugin-diagnostics-advanced-*/05-dependencies.log
cat /tmp/plugin-diagnostics-advanced-*/06-filesystem.log
```

### Debug Checklist

Run through this checklist when troubleshooting:

```bash
# 1. Check container is running
docker ps | grep minecraft-console

# 2. Check port mapping
docker port minecraft-console
# Should show: 3001/tcp -> 0.0.0.0:3001

# 3. Check binding from container logs
docker logs minecraft-console | grep "Server binding"
# Should show: Server binding: 0.0.0.0:3001

# 4. Test health from inside container
docker exec minecraft-console wget --spider http://localhost:3001/health

# 5. Test health from host
curl -s http://localhost:3001/health

# 6. Check port binding on host
netstat -tuln | grep 3001
# Or: ss -tuln | grep 3001
# Should show: 0.0.0.0:3001

# 7. Check docker-compose configuration
grep -A 2 "ports:" docker-compose.console.yml
grep "API_PORT" docker-compose.console.yml

# 8. Run full diagnostics
./scripts/diagnose-plugins.sh diagnose

# 9. Review deployment summary
cat /tmp/plugin-diagnostics-*/deployment-summary.txt
```

### Getting Help

If issues persist after running diagnostics:

1. **Collect diagnostic artifacts:**
   ```bash
   # Run full diagnostics
   ./scripts/diagnose-plugins.sh fix
   ./scripts/diagnose-plugins-advanced.sh
   
   # Collect logs
   tar -czf plugin-diagnostics.tar.gz /tmp/plugin-diagnostics-*
   ```

2. **Include in bug report:**
   - Deployment summary (`deployment-summary.txt`)
   - Container logs (`docker logs minecraft-console`)
   - Docker configuration (`docker-compose.console.yml`)
   - Diagnostic artifacts

3. **GitHub Actions:**
   - Check deployment workflow runs for diagnostic artifacts
   - Download pre/post-deployment diagnostics
   - Review workflow summary for issues

### Troubleshooting with Diagnostics

**Quick Check:**
```bash
# Run basic diagnostics
./scripts/diagnose-plugins.sh diagnose

# Review summary
cat /tmp/plugin-diagnostics-*/summary.log
```

**Auto-Fix Common Issues:**
```bash
# Run with auto-fix
./scripts/diagnose-plugins.sh fix

# Review what was fixed
cat /tmp/plugin-diagnostics-*/fixes.log
```

**Deep Analysis:**
```bash
# Run advanced diagnostics
./scripts/diagnose-plugins-advanced.sh

# Review all findings
ls /tmp/plugin-diagnostics-advanced-*/
cat /tmp/plugin-diagnostics-advanced-*/summary.log
```

**Review Individual Sections:**
```bash
# Basic diagnostics sections
cat /tmp/plugin-diagnostics-*/01-plugins-json.log
cat /tmp/plugin-diagnostics-*/02-plugins-directory.log
cat /tmp/plugin-diagnostics-*/03-plugin-history.log
cat /tmp/plugin-diagnostics-*/04-api-backend.log
cat /tmp/plugin-diagnostics-*/05-backend-process.log

# Advanced diagnostics sections
cat /tmp/plugin-diagnostics-advanced-*/01-log-analysis.log
cat /tmp/plugin-diagnostics-advanced-*/02-api-schema.log
cat /tmp/plugin-diagnostics-advanced-*/03-auth-session.log
cat /tmp/plugin-diagnostics-advanced-*/04-docker-analysis.log
cat /tmp/plugin-diagnostics-advanced-*/05-dependencies.log
cat /tmp/plugin-diagnostics-advanced-*/06-filesystem.log
```

### Common Issues Detected by Diagnostics

**Basic Script Detects:**
- Missing or corrupt `plugins.json`
- Invalid JSON syntax
- Missing plugins directory
- Permission issues (not readable/writable)
- Missing `plugin-history.json`
- Backend not responding
- Backend process not running

**Advanced Script Detects:**
- Backend log errors (JSON parsing, file access)
- API schema violations
- Authentication/session issues
- Docker mount problems (read-only mounts)
- Missing npm dependencies
- Incompatible Node.js version
- Low disk space
- Orphaned backup files
- Duplicate plugin installations

### Exit Codes

**Basic Script:**
- `0` - No issues or all issues fixed
- `1` - Issues found that require manual intervention

**Advanced Script:**
- `0` - No errors (warnings are OK)
- `1` - Errors found requiring attention

## Examples

### Install from Direct URL
```javascript
POST /api/plugins/install
{
  "url": "https://example.com/MyPlugin.jar"
}
```

### Install from GitHub
```javascript
POST /api/plugins/install
{
  "url": "https://github.com/owner/repo/releases/latest"
}
```

### Uninstall Plugin
```javascript
POST /api/plugins/uninstall
{
  "pluginName": "MyPlugin",
  "deleteConfigs": false
}
```

### Rollback Plugin
```javascript
POST /api/plugins/rollback
{
  "pluginName": "MyPlugin"
}
```

## Future Enhancements

- [ ] Dependency resolution and auto-installation
- [ ] Plugin search and discovery
- [ ] Update checker for installed plugins
- [ ] Plugin compatibility checks
- [ ] Scheduled plugin updates
- [ ] Import/export plugin configurations

## Contributing

When adding new features:
1. Update backend services in `console/backend/services/`
2. Add API endpoints in `console/backend/routes/plugins.js`
3. Update frontend UI in `console/frontend/plugins.html`
4. Update this README with new features

## License

MIT
