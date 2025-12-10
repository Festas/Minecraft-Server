# Configuration Directory

**Central location for all server configuration files**

This directory contains all configuration files for the Minecraft server, plugins, and related services. All configurations have been consolidated here for better organization and maintainability.

## 📁 Directory Structure

```
config/
├── README.md                          # This file - configuration overview
├── plugins/                           # Plugin-specific configurations
│   ├── README.md                     # Plugin configuration guide
│   ├── PLUGIN-CONFIG-TEMPLATE.md    # Template for documenting new plugins
│   ├── .plugin_versions              # Version tracking for installed plugins
│   ├── bluemap/                      # BlueMap 3D web map configuration
│   ├── cosmetics/                    # Cosmetics system configuration
│   ├── creator-tools/                # Content creator tools configuration
│   ├── plotsquared/                  # PlotSquared build competition configuration
│   ├── welcome/                      # Welcome system configuration
│   ├── floodgate-config.yml          # Floodgate (Bedrock support) configuration
│   └── geyser-config.yml             # Geyser (Bedrock bridge) configuration
├── server/                           # Server-level configurations
│   ├── README.md                     # Server configuration guide
│   └── plugins.json                  # Plugin definitions and metadata
└── templates/                        # Templates for competitions and events
    ├── README.md                     # Template usage guide
    └── competitions/                 # Build competition templates
        └── weekly-themes.md          # Competition theme library
```

## 🎯 Quick Start

### For Administrators

1. **Managing Plugins**: See [`server/plugins.json`](server/plugins.json) to enable/disable plugins
2. **Plugin Configuration**: Browse [`plugins/`](plugins/) directory for plugin-specific settings
3. **Competition Themes**: See [`templates/competitions/weekly-themes.md`](templates/competitions/weekly-themes.md)

### For Developers

1. **Adding New Plugins**: 
   - Add plugin definition to [`server/plugins.json`](server/plugins.json)
   - Add configuration files to [`plugins/`](plugins/) directory
   - Document using [`plugins/PLUGIN-CONFIG-TEMPLATE.md`](plugins/PLUGIN-CONFIG-TEMPLATE.md)

2. **Updating Configurations**:
   - All plugin configs are in [`plugins/`](plugins/)
   - Test changes in development environment first
   - Document significant changes in plugin READMEs

## 📖 Configuration Guides

### Plugin Configurations
See [plugins/README.md](plugins/README.md) for:
- How to configure each plugin
- Common settings and options
- Plugin-specific troubleshooting

### Server Configuration
See [server/README.md](server/README.md) for:
- Managing plugins.json
- Plugin metadata schema
- Plugin installation and updates

### Templates
See [templates/README.md](templates/README.md) for:
- Competition theme creation
- Template usage guidelines
- Custom template development

## 🔗 Related Documentation

- [Plugin Management Guide](../docs/admin/plugins.md) - Installing and managing plugins
- [Admin Guide](../docs/admin/admin-guide.md) - Server administration
- [Build Competitions](../docs/features/build-competitions.md) - Competition management
- [Console Setup](../docs/admin/console-setup.md) - Web console configuration

## 🚀 Common Tasks

### Enable a Plugin

1. Edit `server/plugins.json`
2. Set `"enabled": true` for the plugin
3. Restart the server or use the console to hot-load

### Configure Bedrock Support

1. Edit `plugins/geyser-config.yml` - protocol translation settings
2. Edit `plugins/floodgate-config.yml` - authentication settings
3. Restart server to apply changes

### Add Competition Theme

1. Edit `templates/competitions/weekly-themes.md`
2. Add your theme to the appropriate category
3. Use `scripts/competition-manager.sh` to select and announce themes

## ⚠️ Important Notes

- **Backup Before Changes**: Always backup configurations before making changes
- **Test in Development**: Test configuration changes in a development environment first
- **Docker Volumes**: Configuration files may be mounted in Docker containers - check volume mounts
- **File Permissions**: Ensure files are readable by the server process (usually user `deploy`)
- **JSON Syntax**: Validate JSON files before saving (use `jq` or an IDE)
- **YAML Syntax**: Validate YAML files before saving (use `yamllint` or an IDE)

## 🔧 Environment Variables

Some configurations can be overridden via environment variables:

- `PLUGINS_JSON` - Path to plugins.json (default: `config/server/plugins.json`)
- `PLUGINS_DIR` - Path to plugins directory (default: `plugins/`)

See individual configuration guides for plugin-specific environment variables.

## 📝 File Format Standards

- **JSON Files**: Use 2-space indentation, validate with `jq`
- **YAML Files**: Use 2-space indentation, validate with `yamllint`
- **Markdown Files**: Follow standard markdown conventions
- **Line Endings**: Use Unix line endings (LF)

## 🆘 Getting Help

- **Issues**: Report configuration problems via [GitHub Issues](https://github.com/Festas/Minecraft-Server/issues)
- **Documentation**: See [docs/](../docs/) directory for comprehensive guides
- **Community**: Join our Discord server for community support

---

**Last Updated**: December 2025  
**Maintainer**: Festas Build Server Team
