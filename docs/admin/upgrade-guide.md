← [Back to Admin Guide](./README.md) | [Documentation Home](../README.md)

---

# Upgrade Guide

This guide helps you upgrade your Minecraft Server Console installation safely.

## Table of Contents

- [Before You Upgrade](#before-you-upgrade)
- [Upgrade Strategies](#upgrade-strategies)
- [Version-Specific Upgrades](#version-specific-upgrades)
- [Rolling Back](#rolling-back)
- [Troubleshooting](#troubleshooting)

## Before You Upgrade

### 1. Backup Everything

**Critical: Always backup before upgrading!**

```bash
# Backup Minecraft world data
docker run --rm \
  -v minecraft_data:/data \
  -v ~/minecraft-backups:/backup \
  alpine tar czf /backup/pre-upgrade-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .

# Backup console database
docker run --rm \
  -v console_data:/data \
  -v ~/console-backups:/backup \
  alpine tar czf /backup/console-pre-upgrade-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .
```

### 2. Review the Changelog

Check [CHANGELOG.md](../../CHANGELOG.md) for:
- Breaking changes
- New features
- Security fixes
- Migration requirements

### 3. Check System Requirements

Ensure your system meets the requirements:
- Docker Engine 20.10+
- Docker Compose v2+
- Sufficient disk space (10GB+ free)
- RAM: 4GB minimum, 6GB+ recommended

### 4. Schedule Downtime

Notify players of maintenance window:
- Use `/broadcast` command in-game
- Post in Discord
- Update MOTD

## Upgrade Strategies

### Strategy 1: In-Place Upgrade (Recommended)

Best for: Minor updates, patch releases

```bash
# 1. Notify players
docker exec -i minecraft-server rcon-cli "say Server upgrading in 5 minutes!"

# 2. Stop services gracefully
docker compose down

# 3. Pull latest code
git pull origin main

# 4. Pull latest Docker images
docker compose pull

# 5. Start services
docker compose up -d

# 6. Monitor logs
docker compose logs -f
```

### Strategy 2: Blue-Green Deployment

Best for: Major updates, when zero downtime is critical

```bash
# 1. Set up new environment alongside existing
docker compose -f docker-compose.yml -f docker-compose.new.yml up -d

# 2. Test new environment thoroughly
# 3. Switch traffic to new environment
# 4. Keep old environment for rollback
# 5. Decommission old environment after validation
```

### Strategy 3: Backup and Restore

Best for: Major version changes, Minecraft version upgrades

```bash
# 1. Create full backup
./scripts/backup-all.sh

# 2. Stop and remove containers
docker compose down -v

# 3. Update configuration
# Edit docker-compose.yml with new versions

# 4. Start fresh
docker compose up -d

# 5. Restore data if needed
./scripts/restore-backup.sh
```

## Version-Specific Upgrades

### Upgrading Minecraft Version

When updating the Minecraft version (e.g., 1.20.4 → 1.21.0):

```bash
# 1. Backup world
docker run --rm \
  -v minecraft_data:/data \
  -v ~/backups:/backup \
  alpine tar czf /backup/world-pre-1.21.0.tar.gz -C /data .

# 2. Update docker-compose.yml
# Change VERSION: "1.21.0"

# 3. Update plugins compatibility
# Check each plugin supports new version
# Update PLUGINS environment variable

# 4. Deploy
docker compose down
docker compose pull
docker compose up -d

# 5. Monitor startup
docker compose logs -f minecraft-server

# Note: Container auto-backs up on major version changes
```

### Upgrading Console Application

When updating the console web interface:

```bash
# 1. Backup console database
docker run --rm \
  -v console_data:/data \
  -v ~/backups:/backup \
  alpine tar czf /backup/console-db.tar.gz -C /data .

# 2. Pull latest changes
git pull origin main

# 3. Check for new environment variables
diff .env .env.example

# 4. Update dependencies
cd console/backend
npm audit fix

# 5. Run database migrations (if any)
# Check for migration scripts in console/backend/migrations/

# 6. Restart console
docker compose -f docker-compose.console.yml restart
```

### Upgrading Plugins

When updating individual plugins:

```bash
# Option 1: Via Console Web UI
# 1. Go to Plugins page
# 2. Click "Update Available" button
# 3. Confirm update
# 4. Restart server

# Option 2: Via Environment Variable
# 1. Update PLUGINS URL in docker-compose.yml
# 2. Restart container
docker compose restart minecraft-server

# Option 3: Manual
# 1. Download new plugin JAR
# 2. Upload via Console or copy to volume
docker cp NewPlugin.jar minecraft-server:/data/plugins/
# 3. Restart server
docker compose restart minecraft-server
```

## Database Migrations

### Console Database Schema Updates

If a new version requires database changes:

```bash
# 1. Backup database
docker exec console-backend sqlite3 /data/console.db ".backup /data/console-backup.db"

# 2. Check for migration scripts
ls console/backend/migrations/

# 3. Run migrations (if migration tool exists)
docker exec console-backend npm run migrate

# Or manually:
docker exec -it console-backend sqlite3 /data/console.db
# Execute SQL commands from migration file
```

## Configuration Updates

### Updating Environment Variables

```bash
# 1. Compare current .env with .env.example
diff .env .env.example

# 2. Add new required variables
nano .env

# 3. Restart affected services
docker compose restart
```

### Updating Server Properties

```bash
# 1. Edit server.properties via Console File Browser
# Or manually:
docker exec -it minecraft-server nano /data/server.properties

# 2. Restart server to apply
docker compose restart minecraft-server
```

## Testing After Upgrade

### Smoke Tests

```bash
# 1. Check container health
docker compose ps

# 2. Verify logs for errors
docker compose logs --tail=100

# 3. Test RCON connectivity
docker exec -i minecraft-server rcon-cli list

# 4. Test console login
curl -k https://your-server:3001/console/

# 5. Test player connection
# Connect with Minecraft client

# 6. Run automated tests (if available)
cd console/backend
npm test
```

### Functional Tests

- [ ] Players can join server
- [ ] Console authentication works
- [ ] RCON commands execute
- [ ] Backups can be created
- [ ] Plugins are loaded correctly
- [ ] Automation tasks run
- [ ] Webhooks fire correctly

## Rolling Back

If the upgrade fails or causes issues:

### Quick Rollback

```bash
# 1. Stop services
docker compose down

# 2. Restore from backup
docker run --rm \
  -v minecraft_data:/data \
  -v ~/backups:/backup \
  alpine sh -c "cd /data && tar xzf /backup/pre-upgrade-YYYYMMDD.tar.gz"

# 3. Revert code changes
git reset --hard HEAD~1

# 4. Start services
docker compose up -d
```

### Detailed Rollback Procedure

```bash
# 1. Document the issue
# Save logs: docker compose logs > rollback-logs.txt

# 2. Stop all services
docker compose down
docker compose -f docker-compose.console.yml down

# 3. Restore world data
docker run --rm \
  -v minecraft_data:/data \
  -v ~/backups:/backup \
  alpine sh -c "rm -rf /data/* && cd /data && tar xzf /backup/pre-upgrade-*.tar.gz"

# 4. Restore console database
docker run --rm \
  -v console_data:/data \
  -v ~/backups:/backup \
  alpine sh -c "rm -rf /data/* && cd /data && tar xzf /backup/console-pre-upgrade-*.tar.gz"

# 5. Revert to previous version
git log --oneline -10  # Find previous commit
git reset --hard <commit-hash>

# 6. Restart services
docker compose up -d
docker compose -f docker-compose.console.yml up -d

# 7. Verify rollback success
docker compose ps
docker compose logs --tail=50
```

## Troubleshooting Upgrades

### Container Won't Start

```bash
# Check logs
docker compose logs minecraft-server

# Common issues:
# - Port already in use
# - Insufficient memory
# - Volume permissions
# - Configuration syntax errors
```

### Database Migration Failed

```bash
# Restore database from backup
docker run --rm \
  -v console_data:/data \
  -v ~/backups:/backup \
  alpine cp /backup/console-backup.db /data/console.db

# Check migration logs
docker compose logs console-backend | grep -i migration
```

### Plugins Not Loading

```bash
# Check plugin compatibility
docker exec minecraft-server ls -la /data/plugins/

# Review startup logs
docker compose logs minecraft-server | grep -i plugin

# Test with minimal plugins
# Temporarily remove all plugins and add back one by one
```

### Performance Degradation

```bash
# Check resource usage
docker stats

# Review JVM flags
docker exec minecraft-server ps aux | grep java

# Monitor TPS
docker exec -i minecraft-server rcon-cli tps

# Check for plugin conflicts
# Review server logs for warnings
```

## Best Practices

### Before Every Upgrade

1. **Read the changelog** - Understand what's changing
2. **Test in development** - Never upgrade production first
3. **Backup everything** - World, database, configurations
4. **Schedule maintenance** - Notify players in advance
5. **Have rollback plan** - Know how to revert quickly

### During Upgrade

1. **Monitor closely** - Watch logs in real-time
2. **Test incrementally** - Verify each component works
3. **Document issues** - Note any problems encountered
4. **Keep backups safe** - Don't delete until stable

### After Upgrade

1. **Monitor for 24 hours** - Watch for delayed issues
2. **Collect feedback** - Ask players about experience
3. **Review metrics** - Check performance hasn't degraded
4. **Update documentation** - Note any config changes

## Automated Upgrade Script

Save as `scripts/upgrade.sh`:

```bash
#!/bin/bash
set -e

echo "Starting upgrade process..."

# Create backup
echo "Creating backup..."
BACKUP_FILE="pre-upgrade-$(date +%Y%m%d-%H%M%S).tar.gz"
docker run --rm \
  -v minecraft_data:/data \
  -v ~/minecraft-backups:/backup \
  alpine tar czf /backup/$BACKUP_FILE -C /data .

echo "Backup created: $BACKUP_FILE"

# Pull latest code
echo "Pulling latest code..."
git pull origin main

# Update containers
echo "Updating containers..."
docker compose pull
docker compose up -d

# Wait for startup
echo "Waiting for services to start..."
sleep 30

# Check health
echo "Checking service health..."
docker compose ps

echo "Upgrade complete! Monitor logs with: docker compose logs -f"
```

## Support

If you encounter issues during upgrade:

1. Check [Troubleshooting Guide](../getting-started/deployment.md#troubleshooting)
2. Review [GitHub Issues](https://github.com/Festas/Minecraft-Server/issues)
3. Join our [Discord](https://discord.gg/your-server) for support
4. Post detailed logs and steps to reproduce

## Version History

| Version | Release Date | Key Changes |
|---------|--------------|-------------|
| 1.0.0   | 2024-01-01   | Initial release |
| Current | TBD          | See CHANGELOG.md |

---

**Remember:** The safest upgrade is one you can safely roll back from. Always backup first!

---

## Related Documents

- [Admin Guide](./admin-guide.md) - Daily administration tasks
- [Server Management](./server-management.md) - Technical operations
- [Onboarding Guide](./onboarding.md) - New admin training
- [Quick Reference](./cheatsheet.md) - Command cheat sheet
- [Documentation Hub](../README.md) - All documentation

[← Back to Admin Guide](./README.md)
