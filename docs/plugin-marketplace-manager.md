# Plugin Marketplace & Manager

A comprehensive plugin management system for the Minecraft server console that integrates with popular plugin marketplaces (Modrinth, Hangar) and provides a user-friendly interface for searching, browsing, installing, and managing plugins.

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Setup](#setup)
4. [Using the Marketplace](#using-the-marketplace)
5. [Plugin Management](#plugin-management)
6. [API Reference](#api-reference)
7. [Workflows](#workflows)
8. [Compatibility](#compatibility)
9. [Security](#security)
10. [Troubleshooting](#troubleshooting)

## Overview

The Plugin Marketplace & Manager combines the power of multiple plugin sources:

- **Modrinth** - Modern, open-source plugin marketplace
- **Hangar** - PaperMC's official plugin repository
- **Custom URLs** - Direct JAR downloads from any source
- **Local Upload** - Upload your own plugin JAR files

All plugins are managed through a unified interface with RBAC-controlled access, automated update checking, configuration management, and safe installation/rollback capabilities.

## Features

### Marketplace Integration

- ✅ **Search & Browse** - Search across multiple marketplaces simultaneously
- ✅ **Featured Plugins** - Discover popular and recommended plugins
- ✅ **Plugin Details** - View comprehensive information before installing
- ✅ **Version Management** - Install specific versions or latest releases
- ✅ **Category Filtering** - Filter by plugin categories
- ✅ **Platform Selection** - Search specific marketplaces or all at once

### Plugin Management

- ✅ **Install/Update/Remove** - Full lifecycle management
- ✅ **Enable/Disable** - Toggle plugins without uninstalling
- ✅ **Rollback** - Restore previous versions from backups
- ✅ **Update Notifications** - Automatic update checking
- ✅ **Config Preview** - View plugin configurations
- ✅ **Installation History** - Track all plugin operations

### Security & Safety

- ✅ **JAR Validation** - Verify downloaded files are valid plugins
- ✅ **RBAC Permissions** - Role-based access control
- ✅ **Backup Before Update** - Automatic backups before changes
- ✅ **CSRF Protection** - Secure API endpoints
- ✅ **Rate Limiting** - Prevent abuse
- ✅ **Audit Logging** - Track all plugin operations

### User Experience

- ✅ **Responsive UI** - Works on desktop and mobile
- ✅ **Dark/Light Mode** - Theme support
- ✅ **Real-time Feedback** - Progress indicators and notifications
- ✅ **Keyboard Navigation** - Full accessibility support
- ✅ **Error Handling** - Clear error messages and recovery options

## Setup

### Prerequisites

- Minecraft server running in Docker (recommended) or standalone
- Console backend running (Node.js)
- Admin access to the server console

### Configuration

1. **Environment Variables** (optional)

   Add to your `.env` file:
   ```bash
   # GitHub token for higher rate limits (optional)
   GITHUB_TOKEN=your_github_token_here
   ```

2. **RBAC Permissions**

   The following permissions control marketplace access:
   - `PLUGIN_VIEW` - View plugins and marketplace (all roles)
   - `PLUGIN_INSTALL` - Install plugins (owner/admin)
   - `PLUGIN_UPDATE` - Update plugins (owner/admin)
   - `PLUGIN_DELETE` - Remove plugins (owner/admin)
   - `PLUGIN_ENABLE` - Enable plugins (owner/admin/moderator)
   - `PLUGIN_DISABLE` - Disable plugins (owner/admin/moderator)
   - `PLUGIN_RELOAD` - Reload plugins (owner/admin/moderator)

3. **Access the Marketplace**

   Navigate to `/console/marketplace.html` or click "Marketplace" in the sidebar.

## Using the Marketplace

### Browsing Featured Plugins

1. Open the marketplace page
2. View featured plugins on the homepage
3. Click any plugin card to see details
4. Click "Install" to add the plugin to your server

### Searching for Plugins

1. Enter search terms in the search box
2. Use filters to narrow results:
   - **Platform**: All, Modrinth, or Hangar
   - **Category**: Filter by plugin type
   - **Sort**: Relevance, Downloads, Updated, Newest
3. Click "Search" or press Enter
4. Browse results and click plugins for details

### Installing a Plugin

#### From Marketplace:

1. Search for or browse to find a plugin
2. Click the plugin card to view details
3. Review versions, compatibility, and description
4. Click "Install Latest Version" or choose a specific version
5. Wait for installation to complete
6. Plugin will appear in your installed list

#### From URL:

1. Go to the "Plugins" page (not marketplace)
2. Paste a plugin URL (direct JAR, GitHub release, etc.)
3. Click "Install Plugin"
4. Follow any prompts for conflicts or options

#### Custom Upload:

**Via Web UI:**

1. Go to the "Plugins" page
2. Scroll to the "Upload Plugin File" section
3. Click "Select File" or drag and drop a .jar file
4. Wait for validation and upload
5. Plugin will be installed automatically

**Upload Features:**
- Drag and drop support
- Real-time upload progress
- JAR file validation
- Automatic metadata extraction from plugin.yml
- Duplicate detection and backup
- Maximum file size: 100MB

**Via API:**

```bash
curl -X POST http://localhost:3001/api/plugins/upload \
  -H "CSRF-Token: YOUR_CSRF_TOKEN" \
  -b cookies.txt \
  -F "plugin=@/path/to/plugin.jar"
```

**Response:**
```json
{
  "success": true,
  "status": "installed",
  "pluginName": "MyPlugin",
  "version": "1.0.0",
  "message": "Plugin MyPlugin installed successfully via upload",
  "metadata": {
    "name": "MyPlugin",
    "version": "1.0.0",
    "description": "Plugin description",
    "author": "Author Name"
  }
}
```

### Viewing Plugin Details

The details modal shows:
- Plugin name, author, and description
- Download statistics and followers
- Categories and tags
- License information
- Links (source code, issues, wiki, discord)
- Available versions with:
  - Version number and type (release/beta/alpha)
  - Compatible Minecraft versions
  - Download counts
  - Release dates
  - Individual install buttons

## Plugin Management

### Managing Installed Plugins

#### Enable/Disable

1. Go to the Plugins page
2. Toggle the switch next to any plugin
3. Plugin will be enabled/disabled without uninstalling

**Note**: Some plugins require a server restart to fully enable/disable.

#### Update Plugins

1. Click "Check Updates" button
2. View available updates
3. Click update button for specific plugins
4. Or install latest version from marketplace

#### Rollback

1. Find the plugin in your installed list
2. Click the rollback icon (↩️)
3. Confirm the rollback action
4. Previous version will be restored from backup

**Note**: Only available if a backup exists.

#### Uninstall

1. Find the plugin in your installed list
2. Click the trash icon (🗑️)
3. Choose whether to delete configs:
   - **Delete JAR only** - Keep plugin configs
   - **Delete JAR + configs** - Complete removal
4. Confirm the action

#### View Configuration

1. Navigate to plugin details
2. Click "Config Preview" (if available)
3. View configuration files:
   - File names and sizes
   - Last modified dates
   - Preview of content (for small files)

**Note**: Config editing via UI is not yet implemented. Edit files manually or use the file manager.

### Installation History

Track all plugin operations:
- Plugin name and action (install/update/remove)
- Timestamp
- User who performed the action
- Status (success/failure)

Access via the "Installation History" section on the Plugins page.

## API Reference

### Marketplace Endpoints

#### Search Plugins

```http
GET /api/marketplace/search
```

**Query Parameters:**
- `q` - Search query (string)
- `platform` - all, modrinth, hangar (default: all)
- `category` - Category filter (optional)
- `version` - Minecraft version filter (optional)
- `limit` - Results per page (default: 20)
- `offset` - Pagination offset (default: 0)
- `sortBy` - relevance, downloads, updated, newest (default: relevance)

**Response:**
```json
{
  "success": true,
  "plugins": [
    {
      "id": "plugin-id",
      "name": "Plugin Name",
      "description": "Plugin description",
      "author": "Author Name",
      "downloads": 100000,
      "followers": 5000,
      "icon": "https://...",
      "categories": ["economy", "admin"],
      "platform": "modrinth",
      "url": "https://..."
    }
  ],
  "total": 100,
  "hasMore": true
}
```

#### Get Plugin Details

```http
GET /api/marketplace/plugin/:platform/:pluginId
```

**Path Parameters:**
- `platform` - modrinth or hangar
- `pluginId` - Plugin identifier

**Response:**
```json
{
  "success": true,
  "plugin": {
    "id": "plugin-id",
    "name": "Plugin Name",
    "description": "Full description",
    "body": "Markdown content",
    "author": "Author Name",
    "downloads": 100000,
    "license": "MIT",
    "sourceUrl": "https://github.com/...",
    "versions": [
      {
        "id": "version-id",
        "name": "1.0.0",
        "versionNumber": "1.0.0",
        "gameVersions": ["1.20.1", "1.20.2"],
        "versionType": "release",
        "files": [
          {
            "filename": "plugin.jar",
            "url": "https://...",
            "size": 1024000,
            "primary": true
          }
        ]
      }
    ]
  }
}
```

#### Get Featured Plugins

```http
GET /api/marketplace/featured
```

**Query Parameters:**
- `limit` - Number of results (default: 10)
- `category` - Category filter (optional)
- `version` - Minecraft version filter (optional)

#### Get Categories

```http
GET /api/marketplace/categories
```

**Response:**
```json
{
  "success": true,
  "categories": {
    "modrinth": ["adventure", "economy", ...],
    "hangar": ["admin_tools", "chat", ...]
  }
}
```

### Plugin Management Endpoints

#### Check for Updates

```http
GET /api/plugins/:pluginName/updates
```

**Response:**
```json
{
  "success": true,
  "hasUpdate": true,
  "currentVersion": "1.0.0",
  "latestVersion": "1.1.0",
  "downloadUrl": "https://...",
  "changelog": "What's new...",
  "releaseDate": "2024-01-01T00:00:00Z"
}
```

#### Check All Updates

```http
GET /api/plugins/updates/check-all
```

**Response:**
```json
{
  "success": true,
  "updates": [
    {
      "pluginName": "MyPlugin",
      "currentVersion": "1.0.0",
      "latestVersion": "1.1.0",
      "hasUpdate": true
    }
  ]
}
```

#### Get Plugin Config

```http
GET /api/plugins/:pluginName/config
```

**Response:**
```json
{
  "success": true,
  "pluginName": "MyPlugin",
  "hasConfig": true,
  "configDir": "/path/to/plugins/MyPlugin",
  "configFiles": [
    {
      "name": "config.yml",
      "path": "/path/to/config.yml",
      "size": 1024,
      "modified": "2024-01-01T00:00:00Z",
      "type": "yml",
      "preview": "# Config content...",
      "lines": 50
    }
  ]
}
```

#### Upload Plugin

```http
POST /api/plugins/upload
```

**Headers:**
- `CSRF-Token` - CSRF token (required)
- `Content-Type` - multipart/form-data

**Body (multipart/form-data):**
- `plugin` - JAR file (required)

**Response:**
```json
{
  "success": true,
  "status": "installed",
  "pluginName": "MyPlugin",
  "version": "1.0.0",
  "message": "Plugin MyPlugin installed successfully via upload",
  "metadata": {
    "name": "MyPlugin",
    "version": "1.0.0",
    "description": "Plugin description",
    "author": "Author Name",
    "api-version": "1.20"
  }
}
```

**Error Responses:**

- `400` - No file uploaded / Invalid file type
  ```json
  {
    "error": "No file uploaded",
    "details": "Please select a .jar file to upload"
  }
  ```

- `400` - Invalid plugin file
  ```json
  {
    "error": "Invalid plugin file",
    "details": "The uploaded file is not a valid Minecraft plugin JAR file. It must contain a valid plugin.yml."
  }
  ```

- `400` - File too large
  ```json
  {
    "error": "File too large",
    "details": "Plugin file must be smaller than 100MB"
  }
  ```

### Authentication

All endpoints require authentication via session cookies and CSRF tokens:

```http
GET /api/csrf-token
```

Include in requests:
```javascript
headers: {
  'CSRF-Token': csrfToken
}
```

## Workflows

### Complete Plugin Installation Workflow

1. **Search or Browse**
   - Enter search terms or browse featured plugins
   - Apply filters (category, platform, sort)
   - View search results

2. **Evaluate Plugin**
   - Click plugin card to view details
   - Review description, author, downloads
   - Check compatible Minecraft versions
   - View available versions and changelogs
   - Check external links (source, issues, wiki)

3. **Install**
   - Select version to install (or latest)
   - Click "Install" button
   - Wait for download and installation
   - Receive confirmation notification

4. **Verify Installation**
   - Plugin appears in installed list
   - Check status (enabled/disabled)
   - View in marketplace with "✓ Installed" badge

5. **Configure (Optional)**
   - View config preview
   - Edit config files manually if needed
   - Reload or restart server as required

6. **Monitor**
   - Check for updates periodically
   - View installation history
   - Monitor plugin status

### Update Management Workflow

1. **Check for Updates**
   - Click "Check Updates" button
   - System checks all installed plugins
   - View list of available updates

2. **Review Update**
   - View changelog for new version
   - Check compatibility
   - Decide to update or skip

3. **Update Plugin**
   - Click update button
   - System creates automatic backup
   - Downloads and installs new version
   - Confirms success

4. **Rollback (if needed)**
   - If update causes issues
   - Click rollback button
   - Previous version restored from backup

### Troubleshooting Workflow

1. **Check Health**
   ```http
   GET /api/plugins/health
   ```
   Verify system is healthy

2. **View Logs**
   - Check installation history
   - Review error messages
   - Check server logs

3. **Run Diagnostics**
   ```bash
   ./scripts/diagnose-plugins.sh diagnose
   ```

4. **Fix Issues**
   ```bash
   ./scripts/diagnose-plugins.sh fix
   ```

5. **Restore if Needed**
   - Use rollback feature
   - Or manually restore from backup

## Compatibility

### Minecraft Versions

The marketplace integrates with plugins for all Minecraft versions supported by the platforms:
- Modrinth: 1.7.10+
- Hangar: PaperMC versions (1.8+)

Always check plugin compatibility before installing.

### Server Types

Compatible with:
- ✅ Spigot
- ✅ Paper
- ✅ Purpur
- ✅ Other Bukkit-based servers

Not compatible with:
- ❌ Vanilla
- ❌ Forge (use Modrinth for Forge mods)
- ❌ Fabric (use Modrinth for Fabric mods)

### Platform Requirements

- **Backend**: Node.js 14+ (included in Docker)
- **Frontend**: Modern browsers (Chrome, Firefox, Safari, Edge)
- **Server**: Minecraft server with plugin support
- **Storage**: Adequate disk space for plugins and backups

## Security

### Authentication & Authorization

- **Session-based auth** - Secure cookie sessions
- **CSRF protection** - Double-submit pattern
- **RBAC** - Role-based access control
- **Rate limiting** - 30 requests/minute for marketplace, 20 for plugin ops

### Permission Model

| Role | View | Install | Update | Delete | Enable/Disable | Reload |
|------|------|---------|--------|--------|----------------|--------|
| Owner | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Moderator | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Viewer | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### File Validation

- **JAR validation** - Verify ZIP structure
- **plugin.yml parsing** - Extract and validate metadata
- **Size limits** - Max 100MB per file
- **Timeout protection** - 2 minute download timeout

### Backup Strategy

- **Automatic backups** - Created before updates
- **Timestamped** - Unique names for each backup
- **Retention** - Manual cleanup required
- **Location** - `plugins/` directory with `.backup` suffix

### Audit Logging

All plugin operations are logged:
- User who performed action
- Timestamp
- Action type (install/update/remove/enable/disable)
- Result (success/failure)
- Error details (if applicable)

Logs stored in:
- `console/backend/data/plugin-history.json`
- `console/backend/data/install-errors.log`
- `console/backend/data/audit.log`

## Troubleshooting

### Common Issues

#### Marketplace Won't Load

**Symptoms:**
- Blank marketplace page
- Search returns no results
- Featured plugins don't load

**Solutions:**

1. Check network connectivity:
   ```bash
   curl https://api.modrinth.com/v2/search
   curl https://hangar.papermc.io/api/v1/projects
   ```

2. Verify authentication:
   - Ensure you're logged in
   - Check CSRF token is valid
   - Try logging out and back in

3. Check browser console for errors:
   - Open DevTools (F12)
   - Look for network errors
   - Check for JavaScript errors

4. Verify backend is running:
   ```bash
   curl http://localhost:3001/api/marketplace/featured
   ```

#### Plugin Install Fails

**Symptoms:**
- "Installation failed" error
- Download timeout
- Invalid plugin file

**Solutions:**

1. Check error message details
2. Verify download URL is accessible
3. Check disk space:
   ```bash
   df -h
   ```

4. Verify plugins directory is writable:
   ```bash
   ls -la plugins/
   chmod 755 plugins/
   ```

5. Try direct JAR URL instead of marketplace

6. Check logs:
   ```bash
   tail -f console/backend/data/install-errors.log
   ```

#### Updates Not Showing

**Symptoms:**
- "Check Updates" shows no updates
- Known updates not detected

**Solutions:**

1. Ensure plugins have marketplace metadata:
   - Check `config/server/plugins.json` for `marketplace` object
   - Add manually if missing:
     ```json
     {
       "name": "MyPlugin",
       "marketplace": {
         "platform": "modrinth",
         "id": "plugin-id"
       }
     }
     ```

2. Verify plugin versions are parseable:
   - Use semantic versioning (1.2.3)
   - Or exact string matching

3. Check marketplace API is accessible

#### Config Preview Not Working

**Symptoms:**
- No config files shown
- Preview shows "Unable to read file"

**Solutions:**

1. Verify plugin has config directory:
   ```bash
   ls -la plugins/PluginName/
   ```

2. Check file permissions:
   ```bash
   chmod 644 plugins/PluginName/config.yml
   ```

3. Verify file size < 50KB for preview

4. Check supported file types:
   - .yml, .yaml, .json, .properties, .txt, .conf, .cfg

### Error Messages

#### "Too many marketplace requests"

**Cause**: Rate limiting triggered

**Solution**: Wait 1 minute before trying again

#### "Invalid platform specified"

**Cause**: Trying to access unsupported platform

**Solution**: Use 'modrinth' or 'hangar' only

#### "Failed to fetch plugin details"

**Causes**:
- Plugin ID incorrect
- Platform unavailable
- Network issue

**Solutions**:
- Verify plugin ID from marketplace URL
- Check platform status
- Retry after a moment

#### "No downloadable versions available"

**Cause**: Plugin has no JAR files

**Solution**: Contact plugin author or try different version

### Debug Mode

Enable detailed logging:

```bash
# Backend
NODE_ENV=development npm start

# View logs
tail -f console/backend/data/install-errors.log
```

### Getting Help

If issues persist:

1. **Run diagnostics**:
   ```bash
   ./scripts/diagnose-plugins.sh diagnose
   ```

2. **Collect information**:
   - Error messages
   - Browser console logs
   - Server logs
   - Diagnostic output

3. **Check documentation**:
   - admin/plugin-manager.md
   - API.md
   - TROUBLESHOOTING.md

4. **Report issue**:
   - GitHub Issues
   - Include diagnostic output
   - Describe steps to reproduce

## Advanced Topics

### Adding Marketplace Metadata to Existing Plugins

Edit `config/server/plugins.json`:

```json
{
  "plugins": [
    {
      "name": "MyPlugin",
      "version": "1.0.0",
      "enabled": true,
      "marketplace": {
        "platform": "modrinth",
        "id": "plugin-slug-or-id"
      }
    }
  ]
}
```

This enables:
- Update checking
- Direct install from marketplace
- Version management

### Custom Marketplace Integration

To add more marketplaces, edit `console/backend/services/marketplaceService.js`:

1. Add API endpoints
2. Implement search function
3. Add format conversion functions
4. Update `searchPlugins()` to include new platform

### Automated Updates

Create a cron job to check for updates:

```bash
# Check updates daily at 2 AM
0 2 * * * curl -X GET http://localhost:3001/api/plugins/updates/check-all \
  -H "CSRF-Token: $TOKEN" -b cookies.txt
```

Or use the automation system (if available).

### Bulk Operations

Install multiple plugins via API:

```bash
#!/bin/bash
PLUGINS=(
  "https://modrinth.com/plugin/essentialsx"
  "https://modrinth.com/plugin/luckperms"
  "https://modrinth.com/plugin/worldedit"
)

for url in "${PLUGINS[@]}"; do
  curl -X POST http://localhost:3001/api/plugins/install \
    -H "Content-Type: application/json" \
    -H "CSRF-Token: $TOKEN" \
    -b cookies.txt \
    -d "{\"url\": \"$url\"}"
  sleep 2
done
```

## Contributing

To contribute to the marketplace:

1. **Add Features**:
   - Backend: `console/backend/services/marketplaceService.js`
   - Routes: `console/backend/routes/marketplace.js`
   - Frontend: `console/frontend/js/marketplace.js`

2. **Test Changes**:
   ```bash
   cd console/backend
   npm test
   ```

3. **Update Documentation**:
   - Update this file
   - Add API documentation
   - Include examples

4. **Submit PR**:
   - Create feature branch
   - Commit changes
   - Submit pull request

## License

MIT License - See LICENSE file for details

## Changelog

### Version 1.0.0 (Current)

- ✅ Modrinth integration
- ✅ Hangar integration
- ✅ Search and browse
- ✅ Plugin details
- ✅ Install from marketplace
- ✅ Update checking
- ✅ Config preview
- ✅ RBAC permissions
- ✅ Comprehensive documentation

### Planned Features

- [ ] SpigotMC integration
- [ ] Dependency auto-resolution
- [ ] Scheduled update checks
- [ ] Update notifications in UI
- [ ] Config file editor
- [ ] Plugin compatibility checker
- [ ] Import/export plugin lists
- [ ] Plugin collections/bundles
