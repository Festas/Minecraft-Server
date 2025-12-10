# Server Configuration Guide

**Server-level configuration and plugin management**

This directory contains server-level configuration files that control the overall behavior of the Minecraft server and plugin system.

## 📁 Files in This Directory

### plugins.json
**The central plugin registry and configuration file**

This file defines all available plugins, their sources, installation settings, and metadata.

#### File Location
- **Path**: `config/server/plugins.json`
- **Format**: JSON
- **Environment Variable**: Can be overridden with `PLUGINS_JSON`

#### Schema

```json
{
  "plugins": [
    {
      "name": "PluginName",
      "enabled": true,
      "category": "essential|community|optional|competitions|cosmetics|welcome|creator-tools",
      "source": "github|modrinth|manual",
      "repo": "Owner/Repository",
      "asset_pattern": "regex-pattern\\.jar$",
      "project_id": "modrinth-project-id",
      "fallback_source": "alternative-source",
      "fallback_repo": "Alternative/Repository",
      "fallback_asset_pattern": "fallback-pattern\\.jar$",
      "fallback_project_id": "fallback-modrinth-id",
      "download_url": "https://example.com/manual-download",
      "description": "Brief description of plugin functionality"
    }
  ]
}
```

#### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Plugin name (must match JAR file name prefix) |
| `enabled` | boolean | ✅ | Whether to install/enable this plugin |
| `category` | string | ✅ | Plugin category for organization |
| `source` | string | ✅ | Where to download from: `github`, `modrinth`, or `manual` |
| `repo` | string | ⚠️ | GitHub repository (required if source=github) |
| `asset_pattern` | string | ⚠️ | Regex to match release asset filename |
| `project_id` | string | ⚠️ | Modrinth project ID (required if source=modrinth) |
| `fallback_source` | string | ⬜ | Alternative source if primary fails |
| `fallback_repo` | string | ⬜ | Alternative GitHub repo |
| `fallback_asset_pattern` | string | ⬜ | Alternative asset pattern |
| `fallback_project_id` | string | ⬜ | Alternative Modrinth project ID |
| `download_url` | string | ⬜ | Manual download URL with instructions |
| `description` | string | ✅ | Brief description of what the plugin does |

Legend: ✅ = Required, ⚠️ = Conditionally required, ⬜ = Optional

#### Plugin Categories

- **essential**: Core plugins required for server operation
- **community**: Community features (Discord, economy, placeholders)
- **optional**: Performance and visualization tools
- **competitions**: Build competition management
- **cosmetics**: Player cosmetics and visual effects
- **welcome**: New player experience
- **creator-tools**: Content creator utilities

#### Example Entries

**GitHub Plugin with Fallback**:
```json
{
  "name": "LuckPerms",
  "enabled": true,
  "category": "essential",
  "source": "github",
  "repo": "LuckPerms/LuckPerms",
  "asset_pattern": "LuckPerms-Bukkit-.*\\.jar$",
  "fallback_source": "modrinth",
  "fallback_project_id": "Vebnzrzj",
  "description": "Advanced permissions management system"
}
```

**Modrinth Plugin**:
```json
{
  "name": "CoreProtect",
  "enabled": true,
  "category": "essential",
  "source": "modrinth",
  "project_id": "lu3oWuz1",
  "fallback_source": "github",
  "fallback_repo": "PlayPro/CoreProtect",
  "fallback_asset_pattern": "CoreProtect.*\\.jar$",
  "description": "Block logging and rollback tool"
}
```

**Manual Download Plugin**:
```json
{
  "name": "HeadDatabase",
  "enabled": false,
  "category": "cosmetics",
  "source": "manual",
  "download_url": "https://www.spigotmc.org/resources/head-database.14280/",
  "description": "Access to 40,000+ custom player heads - MANUAL DOWNLOAD from SpigotMC required"
}
```

## 🔧 Managing Plugins

### Enable/Disable a Plugin

1. Open `config/server/plugins.json`
2. Find the plugin entry
3. Change `"enabled": true` or `"enabled": false`
4. Save the file
5. Use the web console to install/remove, or restart the server

### Add a New Plugin

#### Option 1: Auto-Discovery (Recommended)

Use the plugin discovery feature in the web console:

```bash
# Create wishlist file
echo "Vault" >> plugins-wishlist.txt
echo "ChestShop" >> plugins-wishlist.txt

# Run discovery
# Via console: Plugins > Discover > Upload wishlist file
```

The system will:
- Search GitHub and Modrinth for each plugin
- Find the correct repository and project ID
- Detect the asset pattern automatically
- Add to plugins.json with proper configuration

#### Option 2: Manual Addition

1. Find the plugin on GitHub or Modrinth
2. Determine the repository/project ID
3. Test the asset pattern against recent releases
4. Add entry to `plugins.json`:

```json
{
  "name": "NewPlugin",
  "enabled": true,
  "category": "optional",
  "source": "github",
  "repo": "Author/PluginRepo",
  "asset_pattern": "NewPlugin-[0-9]+\\.[0-9]+.*\\.jar$",
  "description": "What this plugin does"
}
```

5. Validate JSON syntax: `jq empty config/server/plugins.json`
6. Install via console or restart server

### Update Plugin Configuration

Plugin-specific configuration files are in [`../plugins/`](../plugins/). See the [Plugin Configuration Guide](../plugins/README.md) for details.

## 🧪 Testing Plugin Definitions

### Validate JSON Syntax

```bash
# Check JSON is valid
jq empty config/server/plugins.json

# Pretty-print the file
jq '.' config/server/plugins.json

# List all enabled plugins
jq '.plugins[] | select(.enabled == true) | .name' config/server/plugins.json

# Check plugin by name
jq '.plugins[] | select(.name == "LuckPerms")' config/server/plugins.json
```

### Test Asset Pattern

```bash
# Get latest release from GitHub
curl -s https://api.github.com/repos/LuckPerms/LuckPerms/releases/latest | \
  jq -r '.assets[].name'

# Test if pattern matches
echo "LuckPerms-Bukkit-5.4.102.jar" | grep -P "LuckPerms-Bukkit-.*\.jar$"
```

### Verify Plugin Source

```bash
# Check GitHub repo exists
curl -s https://api.github.com/repos/LuckPerms/LuckPerms | jq '.name'

# Check Modrinth project exists
curl -s https://api.modrinth.com/v2/project/Vebnzrzj | jq '.title'
```

## 🚨 Troubleshooting

### Plugin Not Installing

**Check plugin is enabled**:
```bash
jq '.plugins[] | select(.name == "PluginName") | .enabled' config/server/plugins.json
```

**Check source is valid**:
```bash
# For GitHub plugins
jq '.plugins[] | select(.name == "PluginName") | .repo' config/server/plugins.json

# For Modrinth plugins
jq '.plugins[] | select(.name == "PluginName") | .project_id' config/server/plugins.json
```

**Check asset pattern**:
- Review recent GitHub releases
- Verify pattern matches actual file names
- Test regex pattern with online tools

**Check logs**:
- Console logs: Check web console for errors
- Server logs: Check `logs/latest.log` for plugin errors
- Install logs: Check `console/backend/data/install-errors.log`

### Invalid JSON Syntax

**Common errors**:
```json
// ❌ Wrong - trailing comma
{
  "name": "Plugin",
  "enabled": true,  // <- No comma on last item
}

// ✅ Correct
{
  "name": "Plugin",
  "enabled": true
}

// ❌ Wrong - missing quotes
{
  name: "Plugin"
}

// ✅ Correct
{
  "name": "Plugin"
}

// ❌ Wrong - single quotes
{
  'name': 'Plugin'
}

// ✅ Correct
{
  "name": "Plugin"
}
```

**Fix automatically**:
```bash
# Format JSON properly
jq '.' config/server/plugins.json > /tmp/plugins.json
mv /tmp/plugins.json config/server/plugins.json
```

### Asset Pattern Not Matching

**Debug steps**:

1. Get actual asset names from latest release:
```bash
curl -s https://api.github.com/repos/OWNER/REPO/releases/latest | \
  jq -r '.assets[].name'
```

2. Test your regex pattern:
```bash
echo "ActualFileName.jar" | grep -P "YourPattern.*\.jar$"
```

3. Common patterns:
```javascript
// Match version numbers
"Plugin-[0-9]+\\.[0-9]+\\.[0-9]+\\.jar$"

// Match with build numbers
"Plugin-[0-9]+\\.[0-9]+-b[0-9]+\\.jar$"

// Match Bukkit variant
"Plugin.*bukkit.*\\.jar$"
"Plugin.*Bukkit.*\\.jar$"  // Case sensitive

// Match anything
"Plugin.*\\.jar$"
```

## 🔐 Security Best Practices

- **Validate Sources**: Only use trusted plugin sources
- **Review Permissions**: Check plugin permissions in server logs
- **Regular Updates**: Keep plugins updated for security patches
- **Backup First**: Always backup before changing plugin configuration
- **Test Changes**: Test plugin changes in development environment first

## 📚 Related Documentation

- [Plugin Configuration Guide](../plugins/README.md) - Configure individual plugins
- [Plugin Management](../../docs/admin/plugins.md) - Install and manage plugins via console
- [Admin Guide](../../docs/admin/admin-guide.md) - General server administration
- [Console Setup](../../docs/admin/console-setup.md) - Configure the web console

## 🔗 External Resources

- [Modrinth API Documentation](https://docs.modrinth.com/api-spec/)
- [GitHub Releases API](https://docs.github.com/en/rest/releases/releases)
- [JSON Schema Validator](https://www.jsonschemavalidator.net/)
- [RegEx Testing](https://regex101.com/)

## 🆘 Getting Help

- **Plugin Installation Issues**: See [Plugin Installation Diagnostics](../../docs/troubleshooting/common-issues.md#plugin-issues)
- **Configuration Problems**: Check [Troubleshooting Guide](../../docs/troubleshooting/common-issues.md)
- **GitHub Issues**: Report bugs at https://github.com/Festas/Minecraft-Server/issues
- **Community Support**: Join our Discord server

---

**Last Updated**: December 2025  
**Maintainer**: Festas Build Server Team
