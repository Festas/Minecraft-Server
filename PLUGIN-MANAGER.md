# Plugin Manager

A comprehensive web-based plugin management system for the Minecraft server console that allows installing, updating, and managing plugins through a user-friendly interface.

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
│   └── data/
│       └── plugin-history.json  # Installation history log
└── frontend/
    ├── plugins.html             # Plugin manager UI
    ├── js/
    │   └── plugins.js           # Plugin manager logic
    └── css/
        └── plugins.css          # Plugin manager styles
```

## Security

- All endpoints require authentication
- CSRF protection enabled
- Rate limiting applied (20 requests/minute)
- Input validation and sanitization
- JAR file validation before installation

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
