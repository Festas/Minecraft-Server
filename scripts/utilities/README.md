# Utility Scripts

This directory contains utility scripts for server management and administration.

## Quick Start

**Using the wrapper script (recommended):**
```bash
# Run competition manager
./scripts/run.sh utility competition

# Validate RCON password
./scripts/run.sh utility rcon-validate

# Migrate users
./scripts/run.sh utility migrate-users
```

**Direct execution:**
```bash
./scripts/utilities/competition-manager.sh
./scripts/utilities/validate-rcon-password.sh
node scripts/utilities/migrate-users.js
```

## Scripts Overview

### competition-manager.sh

Build competition management utility.

**When to use:**
- Setting up a new build competition
- Managing competition themes
- Switching between competition modes
- Automating competition workflows

**What it does:**
- Creates competition configurations
- Manages competition themes
- Sets up competition worlds
- Configures competition rules
- Automates competition lifecycle

**Usage:**
```bash
./scripts/utilities/competition-manager.sh [command] [options]

Commands:
  create    - Create a new competition
  start     - Start a competition
  end       - End a competition
  list      - List available competitions
  theme     - Manage competition themes
```

**Example:**
```bash
# Create a new competition
./scripts/utilities/competition-manager.sh create --theme "Medieval Castle"

# Start a competition
./scripts/utilities/competition-manager.sh start --id 123

# List active competitions
./scripts/utilities/competition-manager.sh list --status active
```

### validate-rcon-password.sh

RCON password validation and synchronization.

**When to use:**
- RCON connection issues
- After changing RCON password
- Verifying RCON configuration
- Debugging RCON connectivity

**What it does:**
- Validates RCON password in server.properties
- Checks console RCON configuration
- Tests RCON connectivity
- Compares passwords across configurations
- Identifies mismatches

**Usage:**
```bash
./scripts/utilities/validate-rcon-password.sh
```

**Output:**
```
Checking RCON configuration...
✓ Server RCON password found
✓ Console RCON password found
✓ Passwords match
✓ RCON connection successful
```

**Troubleshooting:**
If passwords don't match:
1. Check `server.properties` for `rcon.password`
2. Check console `.env` for `RCON_PASSWORD`
3. Update mismatched password
4. Restart affected services

### migrate-users.js

User data migration utility.

**When to use:**
- Migrating from old authentication system
- Bulk user operations
- Database migrations
- User data export/import

**What it does:**
- Migrates users from old to new schema
- Exports user data
- Imports user data
- Validates user records
- Handles role assignments

**Usage:**
```bash
node scripts/utilities/migrate-users.js [command] [options]

Commands:
  migrate   - Migrate users from old to new schema
  export    - Export user data to JSON
  import    - Import user data from JSON
  validate  - Validate user data integrity
```

**Example:**
```bash
# Migrate all users
node scripts/utilities/migrate-users.js migrate

# Export users to file
node scripts/utilities/migrate-users.js export --output users.json

# Import users from file
node scripts/utilities/migrate-users.js import --input users.json
```

## Common Workflows

### Setting Up a Competition

```bash
# 1. Create competition
./scripts/utilities/competition-manager.sh create \
  --theme "Underwater City" \
  --duration 7d \
  --max-participants 50

# 2. Verify configuration
./scripts/utilities/competition-manager.sh list

# 3. Start when ready
./scripts/utilities/competition-manager.sh start --id <competition-id>
```

### Fixing RCON Issues

```bash
# 1. Validate RCON setup
./scripts/utilities/validate-rcon-password.sh

# 2. If issues found, check configurations
cat server.properties | grep rcon
cat console/.env | grep RCON

# 3. Fix mismatches and restart
docker compose restart

# 4. Validate again
./scripts/utilities/validate-rcon-password.sh
```

### User Data Migration

```bash
# 1. Backup current users
node scripts/utilities/migrate-users.js export --output backup-$(date +%Y%m%d).json

# 2. Run migration
node scripts/utilities/migrate-users.js migrate --dry-run

# 3. If dry-run looks good, run for real
node scripts/utilities/migrate-users.js migrate

# 4. Validate migration
node scripts/utilities/migrate-users.js validate
```

## Environment Variables

### competition-manager.sh
- `COMPETITION_DIR` - Competition data directory
- `THEME_DIR` - Competition themes directory
- `WORLD_DIR` - Minecraft worlds directory

### validate-rcon-password.sh
- `SERVER_DIR` - Server directory (for server.properties)
- `CONSOLE_DIR` - Console directory (for .env)

### migrate-users.js
- `DB_PATH` - Database file path
- `BACKUP_DIR` - Backup directory for exports

## Troubleshooting

### Competition Manager Issues

```bash
# Check if competition directory exists
ls -la /path/to/competitions

# Verify theme files
ls -la /path/to/themes

# Check permissions
ls -ld /path/to/competitions
```

### RCON Validation Fails

```bash
# Check if server is running
docker ps | grep minecraft-server

# Test RCON manually
docker exec minecraft-server rcon-cli status

# Verify RCON port is accessible
netstat -tulpn | grep 25575
```

### Migration Errors

```bash
# Check database access
ls -la console/backend/data/database.db

# Verify Node.js version
node --version  # Should be 18+

# Check for database locks
lsof | grep database.db
```

## Exit Codes

- `0` - Success
- `1` - Execution error
- `2` - Invalid arguments or configuration
- `3` - Data validation error

## Safety Features

### Competition Manager
- Validates competition data before creation
- Prevents duplicate competitions
- Backs up existing data before changes
- Provides dry-run mode for testing

### RCON Validator
- Read-only operation (safe to run anytime)
- No configuration changes made
- Only reports mismatches

### User Migration
- Automatic backups before migration
- Dry-run mode for safe testing
- Validation step before committing
- Rollback capability on errors

## Best Practices

### Before Running Utilities

1. **Backup your data:**
   ```bash
   # Backup database
   cp console/backend/data/database.db console/backend/data/database.db.backup
   
   # Backup configurations
   tar -czf config-backup-$(date +%Y%m%d).tar.gz config/
   ```

2. **Test in dev environment first:**
   ```bash
   # Use dry-run modes when available
   ./script.sh --dry-run
   ```

3. **Check prerequisites:**
   ```bash
   # Verify required tools
   which docker node jq
   ```

### After Running Utilities

1. **Verify changes:**
   ```bash
   # Check relevant logs
   docker logs minecraft-console --tail 50
   
   # Test affected functionality
   ./scripts/api-testing/test-api-auth.sh
   ```

2. **Monitor for issues:**
   ```bash
   # Watch logs for errors
   docker logs -f minecraft-console
   ```

## Related Documentation

- [../README.md](../README.md) - Main scripts documentation
- [../../docs/admin/admin-guide.md](../../docs/admin/admin-guide.md) - Administration guide
- [../../docs/features/build-competitions.md](../../docs/features/build-competitions.md) - Build competitions feature
