# Backup, Restore & Migration Guide

Complete guide for managing server backups, restoring from backups, and migrating your Minecraft server to new hosts or environments.

## Table of Contents

1. [Overview](#overview)
2. [Backup Types](#backup-types)
3. [Creating Backups](#creating-backups)
4. [Scheduling Automated Backups](#scheduling-automated-backups)
5. [Restoring from Backups](#restoring-from-backups)
6. [Migration Guide](#migration-guide)
7. [Retention Policies](#retention-policies)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)
10. [API Reference](#api-reference)

## Overview

The Backup, Restore & Migration system provides comprehensive data protection and portability for your Minecraft server. It enables you to:

- Create manual and scheduled backups
- Restore server state from any successful backup
- Export complete server configurations for migration
- Import server data from migration packages
- Manage backup retention automatically
- Preview backup contents before restoration
- Track all backup and restore operations

### Key Features

- **Multiple Backup Types**: Choose what to backup (world, plugins, config, or all)
- **Automatic Retention**: Old backups are automatically cleaned up based on retention policies
- **Safe Restoration**: Automatic pre-restore backups prevent data loss
- **Migration Support**: Complete server export/import for changing hosts
- **Progress Tracking**: Monitor backup and restore jobs in real-time
- **Compression**: All backups are compressed to save storage space

## Backup Types

The system supports five types of backups:

### Full Backup
- **Contents**: World data, plugins, and configuration files
- **Use Case**: Complete server snapshot for disaster recovery
- **File Size**: Largest (includes everything)
- **Restore Impact**: Complete server restoration

### World Only
- **Contents**: World folder only (world, world_nether, world_the_end)
- **Use Case**: Saving world state before major changes or experiments
- **File Size**: Medium to large (depends on world size)
- **Restore Impact**: Replaces only world data

### Plugins Only
- **Contents**: All plugin JAR files and their data folders
- **Use Case**: Testing plugin configurations or preparing for plugin updates
- **File Size**: Small to medium
- **Restore Impact**: Replaces plugin files and configurations

### Config Only
- **Contents**: Server configuration files (server.properties, bukkit.yml, spigot.yml, paper.yml)
- **Use Case**: Quick configuration snapshots
- **File Size**: Very small
- **Restore Impact**: Replaces only configuration files

### Migration
- **Contents**: Complete server package (world, plugins, configs, metadata)
- **Use Case**: Moving server to new host or environment
- **File Size**: Largest (includes everything plus metadata)
- **Restore Impact**: Complete server replacement with version checks

## Creating Backups

### Manual Backups via Web UI

1. Navigate to **Backups** page in the console
2. Click on **Backups** tab
3. Fill in the backup form:
   - **Backup Name**: Descriptive name (e.g., "Pre-1.20-Update")
   - **Backup Type**: Choose from Full, World, Plugins, Config
   - **Retention Policy**: Select how long to keep the backup
4. Click **Create Backup**

The backup will be created asynchronously. You can monitor its progress in the backups list.

### Manual Backups via API

```bash
curl -X POST http://localhost:3000/api/backups/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Manual Backup",
    "type": "full",
    "retentionPolicy": "weekly"
  }'
```

### What Happens During Backup

1. **Server Pause**: World auto-save is temporarily disabled
2. **Save Flush**: All pending changes are written to disk
3. **File Collection**: Selected files are gathered based on backup type
4. **Compression**: Files are compressed into a ZIP archive
5. **Metadata**: Backup information is stored in database
6. **Resume**: World auto-save is re-enabled

**Note**: The server continues running during backups, but a brief performance impact may occur during the save flush.

## Scheduling Automated Backups

Automated backups can be scheduled using the Automation & Scheduler feature.

### Using the Automation System

1. Navigate to **Automation** page
2. Click **Create Task**
3. Configure the task:
   - **Name**: "Daily Backup"
   - **Type**: Backup
   - **Schedule**: Use cron expression (e.g., `0 2 * * *` for 2 AM daily)
   - **Backup Type**: Select backup type
   - **Retention Policy**: Choose appropriate retention

### Common Cron Schedules

```
# Every 6 hours
0 */6 * * *

# Daily at 2 AM
0 2 * * *

# Weekly on Sunday at 3 AM
0 3 * * 0

# Monthly on the 1st at 4 AM
0 4 1 * *
```

### Recommended Backup Schedule

For most servers, we recommend:

- **Full Backup**: Daily at 2 AM (7-day retention)
- **World Backup**: Every 6 hours (24-hour retention)
- **Weekly Archive**: Sunday at 3 AM (monthly retention)

## Restoring from Backups

### Safety Features

The restoration process includes several safety features:

1. **Pre-Restore Backup**: Automatically created before restoration begins
2. **Server Shutdown**: Server is gracefully stopped during restoration
3. **Backup Validation**: Backup integrity is verified before restoration
4. **Preview**: View backup contents before committing to restore
5. **Rollback Capability**: The pre-restore backup can be used to rollback if needed

### Restoration Process

#### Via Web UI

1. Navigate to **Backups** page
2. Click on **Restore** tab
3. Select the backup you want to restore
4. Click **Preview** to view backup contents (optional)
5. Click **Restore**
6. Confirm the restoration warning
7. Wait for restoration to complete (monitor in History tab)

#### Via API

```bash
curl -X POST http://localhost:3000/api/backups/restore \
  -H "Content-Type: application/json" \
  -d '{
    "backupId": "backup-1234567890-abcd",
    "createPreBackup": true
  }'
```

### What Happens During Restoration

1. **Pre-Backup**: Current state is backed up automatically
2. **Server Stop**: Server is gracefully shutdown
3. **File Extraction**: Backup is extracted to temporary directory
4. **File Replacement**: Old files are moved to `.old` suffix, new files are copied
5. **Verification**: Basic integrity checks are performed
6. **Server Start**: Server is restarted (if it was running before)

**Estimated Time**: 2-10 minutes depending on backup size

### Post-Restore Steps

After restoration:

1. **Verify World**: Check that the world loaded correctly
2. **Check Plugins**: Ensure all plugins are working
3. **Test Gameplay**: Perform basic gameplay tests
4. **Monitor Logs**: Watch for any errors in server logs

If issues are found, you can restore from the pre-restore backup.

## Migration Guide

### Exporting for Migration

#### When to Export

- Moving to a new hosting provider
- Changing server hardware
- Creating a development copy
- Archiving a server long-term

#### Export Process

1. Navigate to **Backups** → **Migration** tab
2. Click **Export Server**
3. Enter an export name (optional)
4. Click **Create Export**
5. Wait for export to complete
6. Download the export file

The export creates a complete server package with metadata including server version, plugin list, and configuration details.

### Importing a Migration

#### Prerequisites

- Clean server installation
- Matching or compatible Minecraft version
- Sufficient disk space
- Database backup (if using external database)

#### Import Process

1. Upload migration backup to new server
2. Navigate to **Backups** → **Migration** tab
3. Click **Import Server**
4. Select the migration backup
5. Read and acknowledge the warning
6. Click **Import**
7. Wait for import to complete (may take 10-30 minutes)

#### Post-Import Steps

1. **Update Server Configuration**
   - Verify server IP/port in server.properties
   - Update any absolute file paths
   - Configure firewall rules

2. **Plugin Configuration**
   - Update database connection strings
   - Verify external service integrations
   - Check license keys for commercial plugins

3. **Test Everything**
   - Start server and check for errors
   - Test player login
   - Verify world integrity
   - Test plugin functionality

### Migration Checklist

Before migration:
- [ ] Create migration export
- [ ] Download export file
- [ ] Verify file integrity (check file size)
- [ ] Document current IP/domain
- [ ] Document plugin versions
- [ ] Export player data from external databases (if any)

After migration:
- [ ] Import migration backup
- [ ] Update DNS records
- [ ] Update server IP in configurations
- [ ] Test player connectivity
- [ ] Verify plugin functionality
- [ ] Update Discord/website links
- [ ] Notify players of new IP (if changed)

## Retention Policies

Backups are automatically deleted based on their retention policy:

| Policy | Duration | Use Case |
|--------|----------|----------|
| Daily | 7 days | Regular automated backups |
| Weekly | 30 days | Weekly archival backups |
| Monthly | 90 days | Monthly long-term backups |
| Permanent | Never deleted | Critical milestones, migrations |

### Cleanup Process

- Runs automatically every time backup service initializes
- Checks backup age against retention policy
- Deletes both database record and backup file
- Logs deletion for audit trail

### Managing Retention

To change a backup's retention policy:
1. Currently not supported via UI (coming soon)
2. Can be done via database update or API

## Best Practices

### Backup Strategy

1. **3-2-1 Rule**: Keep 3 copies, on 2 different media, with 1 offsite
   - On-server automated backups
   - Downloaded copies on local machine
   - Cloud storage (Google Drive, Dropbox, etc.)

2. **Regular Testing**: Periodically test backup restoration
   - Create a test environment
   - Restore backups to verify integrity
   - Practice migration procedures

3. **Before Major Changes**: Always create a backup before:
   - Minecraft version updates
   - Major plugin installations
   - World edits or large builds
   - Configuration changes

4. **Monitor Disk Space**: Ensure adequate space for backups
   - Each full backup = approximately server size
   - Keep 20-30% free space minimum
   - Monitor and clean old backups

### Performance Considerations

1. **Backup Timing**: Schedule during low-activity periods
   - Late night or early morning
   - Avoid peak player hours
   - Consider timezone of player base

2. **Backup Frequency**: Balance safety with performance
   - Too frequent: Disk I/O impact
   - Too infrequent: More data loss risk
   - Typical: Every 6-12 hours for world

3. **Backup Types**: Use appropriate types
   - Full backups: Less frequent (daily)
   - World backups: More frequent (6 hours)
   - Config backups: Before changes only

### Security

1. **Backup Storage**: Protect backup files
   - Store in secure location
   - Limit access permissions
   - Encrypt sensitive backups

2. **Access Control**: Use RBAC permissions
   - Limit who can create backups
   - Restrict restore operations
   - Audit backup deletions

3. **Offsite Copies**: Protect against:
   - Server hardware failure
   - Datacenter issues
   - Ransomware attacks
   - Accidental deletion

## Troubleshooting

### Backup Creation Issues

#### "Failed to create backup: save-off command failed"
- **Cause**: Server is not running or RCON is not configured
- **Solution**: Check server status and RCON configuration
- **Workaround**: Backup will still be created, but may include in-progress changes

#### "Backup failed: Insufficient disk space"
- **Cause**: Not enough free space for backup
- **Solution**: Free up disk space or clean old backups
- **Prevention**: Monitor disk usage regularly

#### "Backup stuck in 'running' status"
- **Cause**: Process crashed or was interrupted
- **Solution**: Check server logs for errors
- **Manual Fix**: Update database to mark as failed

### Restoration Issues

#### "Restore failed: Backup file not found"
- **Cause**: Backup file was moved or deleted
- **Solution**: Check backups directory for file
- **Recovery**: Use another backup or restore from offsite copy

#### "Server won't start after restore"
- **Cause**: Incompatible versions or corrupted files
- **Solution**: Restore from pre-restore backup
- **Check**: Verify Minecraft version compatibility

#### "Plugins missing after restore"
- **Cause**: Used world-only backup instead of full backup
- **Solution**: Restore from full backup or manually reinstall plugins

### Migration Issues

#### "Import failed: Version mismatch"
- **Cause**: Different Minecraft versions between export and import
- **Solution**: Ensure matching versions or update server
- **Alternative**: Manual migration with version conversion

#### "Plugins not loading after migration"
- **Cause**: Plugin dependencies or configuration issues
- **Solution**: Check plugin logs, verify dependencies
- **Fix**: Update plugin configurations for new environment

#### "World corruption after migration"
- **Cause**: Interrupted transfer or disk issues
- **Solution**: Re-download and re-import migration backup
- **Prevention**: Verify file checksums before import

### General Troubleshooting

1. **Check Logs**: Always check server logs first
   ```bash
   tail -f /path/to/server/logs/latest.log
   ```

2. **Verify Permissions**: Ensure proper file permissions
   ```bash
   ls -la /path/to/backups/
   ```

3. **Check Disk Space**: Monitor available space
   ```bash
   df -h
   ```

4. **Database Check**: Verify database integrity
   - Check backup_jobs table for errors
   - Look for stuck jobs in 'running' status

## API Reference

### Endpoints

#### Create Backup
```http
POST /api/backups/create
Content-Type: application/json

{
  "name": "Backup Name",
  "type": "full|world|plugins|config",
  "retentionPolicy": "daily|weekly|monthly|permanent"
}
```

#### List Backup Jobs
```http
GET /api/backups/jobs?limit=50&offset=0
```

#### Get Backup Job
```http
GET /api/backups/jobs/:id
```

#### Preview Backup
```http
GET /api/backups/preview/:id
```

#### Restore Backup
```http
POST /api/backups/restore
Content-Type: application/json

{
  "backupId": "backup-id",
  "createPreBackup": true
}
```

#### Delete Backup
```http
DELETE /api/backups/:id
```

#### Download Backup
```http
GET /api/backups/download/:id
```

#### Export for Migration
```http
POST /api/backups/migrate/export
Content-Type: application/json

{
  "name": "Migration Export Name"
}
```

#### Import from Migration
```http
POST /api/backups/migrate/import
Content-Type: application/json

{
  "backupId": "backup-id"
}
```

### RBAC Permissions

Required permissions for backup operations:

- `backup:create` - Create new backups
- `backup:view` - View backup list and details
- `backup:restore` - Restore from backups
- `backup:delete` - Delete backups
- `backup:download` - Download backup files
- `backup:schedule` - Schedule automated backups
- `backup:migrate:export` - Create migration exports
- `backup:migrate:import` - Import migration backups

### Role Permissions

| Role | Create | View | Restore | Delete | Download | Migrate |
|------|--------|------|---------|--------|----------|---------|
| Owner | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Moderator | ✗ | ✓ | ✗ | ✗ | ✓ | ✗ |
| Viewer | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |

## Support

For issues or questions:

1. Check this documentation
2. Review server logs
3. Check GitHub issues
4. Contact server administrator

---

**Last Updated**: December 2025
**Version**: 1.0.0
