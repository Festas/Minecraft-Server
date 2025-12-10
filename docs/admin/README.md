# 🔧 Administration Guide

Complete administration documentation for the festas_builds Minecraft Server. This section provides everything server administrators need for daily operations, configuration, security, and maintenance.

---

## 📋 Quick Navigation

| Category | Documents | For Role |
|----------|-----------|----------|
| **Getting Started** | [Onboarding](#getting-started) | New Admins |
| **Daily Operations** | [Console](#daily-operations), [Server Management](#daily-operations) | All Admins |
| **Configuration** | [Plugins](#configuration), [Localization](#configuration) | Admin+ |
| **Security** | [Security Policy](#security) | Owner/Admin |
| **Maintenance** | [Backups](#maintenance), [Upgrades](#maintenance), [Migration](#maintenance) | Admin+ |

---

## 📚 Documents by Category

### Getting Started

**Start here if you're new to server administration!**

- **[Onboarding Guide](./onboarding.md)** - Essential training for new administrators
  - First day checklist
  - Learning the console
  - Understanding permissions
  - Admin best practices
  - *Time: 2-3 hours to complete*

### Daily Operations

**Documents you'll use every day:**

- **[Console Setup](./console-setup.md)** - Web console installation and configuration
  - Docker deployment
  - SSL/HTTPS setup
  - Authentication configuration
  - Troubleshooting
  
- **[Console Implementation](./console-implementation.md)** - Technical details of the web console
  - Architecture overview
  - Feature documentation
  - API reference
  - Development guide

- **[Server Management](./server-management.md)** - Day-to-day server operations
  - Quick reference commands
  - GitHub secrets configuration
  - Deployment workflows
  - Player management
  - Troubleshooting

- **[Admin Guide](./admin-guide.md)** - Comprehensive administration procedures
  - Daily tasks checklist
  - Weekly maintenance
  - Managing competitions
  - Handling reports
  - Performance monitoring

### Configuration

**Configure and customize the server:**

- **[Plugins Guide](./plugins.md)** - Complete plugin documentation
  - Plugin list and descriptions
  - Installation instructions
  - Configuration guides
  - Recommended settings

- **[Plugin Manager](./plugin-manager.md)** - Plugin management system
  - Web-based plugin installer
  - API documentation
  - Version management
  - Troubleshooting

- **[Localization](./localization.md)** - Multi-language support
  - Adding new languages
  - Translation workflow
  - Testing translations
  - Locale configuration

### Security

**Keep the server secure:**

- **[Security Policy](./security.md)** - Comprehensive security documentation
  - Security features overview
  - Authentication and authorization
  - RBAC implementation
  - Audit logging
  - Incident response
  - Security best practices

### Maintenance

**Backups, upgrades, and migrations:**

- **[Upgrade Guide](./upgrade-guide.md)** - Safe upgrade procedures
  - Pre-upgrade checklist
  - Automated upgrade script
  - Manual upgrade steps
  - Rollback procedures
  - Testing and validation

- **[Migration Guide](./migration.md)** - Server migration procedures
  - Export/import procedures
  - Data transfer
  - Bedrock migration
  - World migration
  - Configuration migration

- **[Quick Reference](./cheatsheet.md)** - Command cheat sheet
  - Docker commands
  - RCON commands
  - Backup commands
  - Common tasks

---

## 👥 Role-Based Recommendations

### New Administrators (First Week)

**Start with these documents in order:**

1. **[Onboarding Guide](./onboarding.md)** - Complete the full training
2. **[Console Setup](./console-setup.md)** - Learn the web console
3. **[Admin Guide](./admin-guide.md)** - Understand daily tasks
4. **[Cheat Sheet](./cheatsheet.md)** - Bookmark for quick reference

**Time commitment:** 4-6 hours

### Moderators

**Focus on these documents:**

- **[Admin Guide](./admin-guide.md)** - Daily operations
- **[Server Management](./server-management.md)** - Player management section
- **[Cheat Sheet](./cheatsheet.md)** - Quick command reference

### Server Administrators

**You'll need all documents, prioritize:**

1. **[Security Policy](./security.md)** - Understand security model
2. **[Server Management](./server-management.md)** - Master operations
3. **[Plugins Guide](./plugins.md)** - Manage server features
4. **[Upgrade Guide](./upgrade-guide.md)** - Safe upgrades

### Server Owners

**Critical documents:**

- **[Security Policy](./security.md)** - Security architecture
- **[Upgrade Guide](./upgrade-guide.md)** - Production upgrades
- **[Migration Guide](./migration.md)** - Disaster recovery
- **[Console Implementation](./console-implementation.md)** - Technical architecture

---

## 🚀 Quick Command Reference

### Essential Docker Commands

```bash
# View server status
docker ps

# View server logs
docker logs -f minecraft-server

# Restart server
docker restart minecraft-server

# Stop server gracefully
docker stop minecraft-server

# Start server
docker start minecraft-server
```

### Essential RCON Commands

```bash
# Check player count
/list

# Save the world
/save-all

# Check TPS
/tps

# Broadcast message
/say [message]

# View server version
/version
```

### Backup Commands

```bash
# Manual backup via script
./scripts/backup.sh

# List backups
ls -lh /home/deploy/minecraft-backups/

# Restore from backup
./scripts/restore.sh backup-filename.tar.gz
```

### Common Admin Tasks

```bash
# Grant operator status
/op <player>

# Remove operator status
/deop <player>

# Ban player
/ban <player> [reason]

# Pardon player
/pardon <player>

# Teleport to player
/tp <your_name> <player>

# Change weather
/weather clear|rain|thunder
```

**For complete command reference, see [Cheat Sheet](./cheatsheet.md)**

---

## 📊 Document Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| Onboarding Guide | ✅ Complete | Latest |
| Console Setup | ✅ Complete | Latest |
| Console Implementation | ✅ Complete | Latest |
| Server Management | ✅ Complete | Latest |
| Admin Guide | ✅ Complete | Latest |
| Plugins Guide | ✅ Complete | Latest |
| Plugin Manager | ✅ Complete | Latest |
| Localization | ✅ Complete | Latest |
| Security Policy | ✅ Complete | Latest |
| Upgrade Guide | ✅ Complete | Latest |
| Migration Guide | ✅ Complete | Latest |
| Cheat Sheet | 🚧 In Progress | Latest |

---

## 🔗 Related Sections

- **[Getting Started](../getting-started/)** - Initial deployment and setup
- **[Features](../features/)** - Plugin features and gameplay systems
- **[Development](../development/)** - Technical documentation and APIs
- **[Troubleshooting](../troubleshooting/)** - Problem resolution guides
- **[Reference](../reference/)** - Quick reference materials

---

## 💡 Tips for Administrators

### Best Practices

- ✅ **Always** create backups before major changes or upgrades
- ✅ **Review** the security policy and follow best practices
- ✅ **Test** changes on a development server first when possible
- ✅ **Document** any custom configurations or procedures
- ✅ **Monitor** server performance and logs regularly

### Common Mistakes to Avoid

- ❌ Don't skip backups before upgrades
- ❌ Don't grant operator status without proper vetting
- ❌ Don't edit live config files without backing up first
- ❌ Don't restart the server during peak hours without warning
- ❌ Don't ignore security alerts or audit logs

### Emergency Procedures

**Server is down?** → [Troubleshooting Guide](../troubleshooting/)  
**Need to rollback?** → [Upgrade Guide - Rollback](./upgrade-guide.md#rollback-procedures)  
**Security incident?** → [Security Policy - Incident Response](./security.md#incident-response)  
**Data corruption?** → [Upgrade Guide - Rollback](./upgrade-guide.md#rollback-procedures)

---

## 📞 Getting Help

If you need assistance:

1. Check the relevant document in this section
2. Review [Troubleshooting guides](../troubleshooting/)
3. Check the [CHANGELOG](../../CHANGELOG.md) for recent changes
4. Consult the [ROADMAP](../../ROADMAP.md) for planned features
5. Review [GitHub Issues](https://github.com/Festas/Minecraft-Server/issues)

---

[← Back to Documentation Hub](../README.md)
