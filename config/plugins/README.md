# Plugin Configuration Guide

**Comprehensive guide to configuring Minecraft server plugins**

This directory contains configuration files for all server plugins. Each plugin has its own subdirectory or configuration file(s).

## 📁 Plugin Configurations

### Essential Plugins

#### Geyser & Floodgate (Bedrock Support)
- **Files**: `geyser-config.yml`, `floodgate-config.yml`
- **Purpose**: Enable Bedrock Edition players to join Java Edition server
- **Key Settings**:
  - **geyser-config.yml**: Protocol translation, port settings, authentication
  - **floodgate-config.yml**: Bedrock player authentication, username prefixes

**Example Configuration (geyser-config.yml)**:
```yaml
bedrock:
  address: 0.0.0.0
  port: 19132
  
remote:
  address: auto
  port: 25565
  auth-type: online
```

**Example Configuration (floodgate-config.yml)**:
```yaml
username-prefix: "."
replace-spaces: true
```

**Common Issues**:
- **Port 19132 already in use**: Change `bedrock.port` in geyser-config.yml
- **Bedrock players can't join**: Verify `auth-type: online` in geyser-config.yml
- **Username conflicts**: Adjust `username-prefix` in floodgate-config.yml

---

### Optional Plugins

#### BlueMap (3D Web Map)
- **Directory**: `bluemap/`
- **Purpose**: Generates 3D web-based map of your world
- **Key Files**:
  - `core.conf` - Core BlueMap settings
  - `webserver.conf` - Web server configuration
  - `maps/world.conf` - World-specific map settings

**Common Settings**:
```hocon
# core.conf
metrics: true
accept-download: false

# webserver.conf
enabled: true
port: 8100
```

**Troubleshooting**:
- **Map not updating**: Check render settings in `core.conf`
- **Web interface not accessible**: Verify `webserver.conf` port settings
- **Performance issues**: Adjust render thread count and update intervals

---

#### PlotSquared (Build Competitions)
- **Directory**: `plotsquared/`
- **Purpose**: Manages plots for build competitions
- **Key Files**:
  - `settings.yml` - Global PlotSquared settings
  - `worlds.yml` - World-specific plot configurations

**Example Configuration (worlds.yml)**:
```yaml
worlds:
  competition:
    plot:
      size: 64
      auto_merge: true
    road:
      width: 7
```

**Common Tasks**:
- **Change plot size**: Edit `plot.size` in `worlds.yml`
- **Enable auto-merge**: Set `plot.auto_merge: true`
- **Customize road width**: Adjust `road.width`

---

#### Cosmetics System
- **Directory**: `cosmetics/`
- **Purpose**: Manage player cosmetics, ranks, and rewards
- **Key Files**:
  - `cosmetics-config.yml` - Main cosmetic settings
  - `ranks-rewards.yml` - Rank progression and rewards
  - `particle-effects.yml` - Particle effect definitions

**Configuration Example**:
```yaml
# cosmetics-config.yml
enabled: true
default-cosmetics:
  - basic_trail
  - starter_hat
```

---

#### Welcome System
- **Directory**: `welcome/`
- **Purpose**: Welcome new players and provide starter resources
- **Key Files**:
  - `join-messages.yml` - Join/leave messages
  - `tutorial-config.yml` - Tutorial system settings
  - `starter-kit.yml` - Items given to new players
  - `rules.yml` - Server rules display

**Starter Kit Example**:
```yaml
# starter-kit.yml
items:
  - material: DIAMOND_SWORD
    amount: 1
    name: "§6Starter Sword"
  - material: COOKED_BEEF
    amount: 64
```

---

#### Creator Tools
- **Directory**: `creator-tools/`
- **Purpose**: Tools for content creators (filming, replay, etc.)
- **Key Files**:
  - `vanish-config.yml` - Invisibility settings
  - `replay-config.yml` - Replay recording settings
  - `filming-kit.yml` - Equipment for content creators
  - `creator-permissions.yml` - Permission overrides for creators

---

## 🔧 General Configuration Guidelines

### YAML Best Practices

1. **Indentation**: Use 2 spaces (not tabs)
2. **Quotes**: Use quotes for strings with special characters
3. **Comments**: Use `#` for comments
4. **Validation**: Test with `yamllint` before applying

### Common Settings Across Plugins

Most plugins share these common configuration patterns:

```yaml
# Enable/disable the plugin
enabled: true

# Debug mode for troubleshooting
debug: false

# Language/locale settings
language: en-US

# Database settings (if applicable)
database:
  type: sqlite  # or mysql
  host: localhost
  port: 3306
  name: database_name
```

## 📝 Adding New Plugin Configuration

When adding a new plugin, follow this process:

1. **Create Configuration Files**:
   - Add files to appropriate subdirectory or create new one
   - Follow existing naming conventions (kebab-case for directories)

2. **Document the Plugin**:
   - Use [`PLUGIN-CONFIG-TEMPLATE.md`](PLUGIN-CONFIG-TEMPLATE.md) as a template
   - Include purpose, common settings, and troubleshooting

3. **Update This README**:
   - Add entry to the appropriate section
   - Include key settings and examples

4. **Test Configuration**:
   - Validate YAML/JSON syntax
   - Test in development environment
   - Document any issues encountered

## 🔍 Finding Plugin Configuration Files

### By Plugin Name

- **BlueMap**: `bluemap/`
- **Citizens**: Not currently installed (would be in `citizens/`)
- **CoreProtect**: No config files (uses defaults)
- **Cosmetics**: `cosmetics/`
- **DeluxeHub**: Not currently installed (would be `deluxehub/`)
- **EssentialsX**: No custom config (uses defaults)
- **Floodgate**: `floodgate-config.yml`
- **Geyser**: `geyser-config.yml`
- **LuckPerms**: No custom config (uses defaults)
- **PlotSquared**: `plotsquared/`
- **Welcome System**: `welcome/`
- **WorldEdit/WorldGuard**: No custom config (uses defaults)

### By Feature Category

- **Bedrock Support**: `geyser-config.yml`, `floodgate-config.yml`
- **Build Competitions**: `plotsquared/`
- **Content Creation**: `creator-tools/`
- **Player Experience**: `welcome/`, `cosmetics/`
- **Visualization**: `bluemap/`

## 🚨 Troubleshooting

### Configuration Not Loading

1. **Check Syntax**: Validate YAML/JSON syntax
2. **Check File Permissions**: Ensure files are readable
3. **Check Plugin Enabled**: Verify plugin is enabled in `../server/plugins.json`
4. **Check Server Logs**: Look for configuration errors in server logs
5. **Restart Server**: Some plugins require restart to reload config

### Common YAML Errors

```yaml
# ❌ Wrong - tabs instead of spaces
settings:
	enabled: true

# ✅ Correct - 2 spaces
settings:
  enabled: true

# ❌ Wrong - missing space after colon
enabled:true

# ✅ Correct - space after colon
enabled: true

# ❌ Wrong - unquoted string with special chars
message: Hello: World

# ✅ Correct - quoted string
message: "Hello: World"
```

### Validation Commands

```bash
# Validate YAML syntax
yamllint config/plugins/

# Validate JSON syntax
jq empty config/server/plugins.json

# Check file permissions
ls -la config/plugins/
```

## 🔐 Security Considerations

- **Never commit secrets**: API keys, passwords should use environment variables
- **File Permissions**: Keep config files readable only by necessary users
- **Backup Regularly**: Backup configurations before making changes
- **Audit Changes**: Track configuration changes in version control

## 📚 Related Documentation

- [Server Configuration Guide](../server/README.md)
- [Plugin Management](../../docs/admin/plugins.md)
- [Admin Guide](../../docs/admin/admin-guide.md)
- [Console Setup](../../docs/admin/console-setup.md)

## 🆘 Getting Help

If you need help with plugin configuration:

1. **Check Plugin Documentation**: Most plugins have detailed docs
2. **Review Examples**: See existing configurations in this directory
3. **Server Logs**: Check logs for configuration errors
4. **Community Support**: Ask in Discord or GitHub Discussions
5. **Create Issue**: Report problems via GitHub Issues

---

**Last Updated**: December 2025  
**Maintainer**: Festas Build Server Team
