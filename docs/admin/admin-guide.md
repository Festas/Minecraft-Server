← [Back to Admin Guide](./README.md) | [Documentation Home](../README.md)

---

# Server Administration Guide for festas_builds

Complete guide for server administrators and staff members.

---

## Table of Contents

1. [Daily Tasks](#daily-tasks)
2. [Weekly Maintenance](#weekly-maintenance)
3. [Managing Competitions](#managing-competitions)
4. [Handling Reports & Issues](#handling-reports--issues)
5. [Backup Procedures](#backup-procedures)
6. [Performance Monitoring](#performance-monitoring)
7. [Staff Permissions](#staff-permissions)
8. [Plugin Management](#plugin-management)

---

## Daily Tasks

### Morning Checklist

```bash
# 1. Check server status
sudo systemctl status minecraft.service

# 2. Review logs for errors
sudo journalctl -u minecraft.service -n 100 --no-pager

# 3. Check disk space
df -h /home/deploy/minecraft-server

# 4. Check player count
# Via RCON or in-game: /list
```

### Throughout the Day

- Monitor chat for rule violations
- Respond to `/helpop` requests
- Check CoreProtect for grief reports
- Welcome new players
- Answer questions in chat

### Evening Tasks

- Review the day's activity
- Handle any pending bans/warnings
- Clear temporary files if needed
- Plan next day's events

---

## Weekly Maintenance

### Every Monday

**Competition Management**:
```bash
# Announce new competition theme
./scripts/competition-manager.sh start

# Clear previous competition plots (if ended)
./scripts/competition-manager.sh reset
```

### Every Wednesday

**Plugin Updates**:
```bash
cd /home/deploy/minecraft-server
./update-plugins.sh
```

### Every Friday

**Backups**:
```bash
# Manual backup before weekend
./backup.sh

# Verify backup completed
ls -lh /home/deploy/minecraft-server/backups/
```

### Every Sunday

**Competition Voting**:
```bash
# End building period, start voting
./scripts/competition-manager.sh end
```

---

## Managing Competitions

### Starting a Competition

```bash
# Option 1: Automated with random theme
./scripts/competition-manager.sh start

# Option 2: Manual
# 1. Choose theme from competition-templates/weekly-themes.md
# 2. Announce in-game and Discord
# 3. Enable plot claiming
```

**Announcement Template**:
```
§6§l✦ NEW BUILD COMPETITION! ✦
§eTheme: [THEME NAME]
§7Build Period: 1 week (until [DATE])
§aClaim your plot: /plots auto
§7Good luck builders!
```

### Monitoring Competition

- Check plots periodically
- Ensure no inappropriate builds
- Help players with plot issues
- Screenshot notable builds for Discord

### Ending Competition

```bash
# Close submissions, start voting
./scripts/competition-manager.sh end
```

- Post builds to Discord #competition channel
- Create voting poll
- Monitor voting for 3 days

### Announcing Winners

```bash
#Input: 1st, 2nd, 3rd place
./scripts/competition-manager.sh winners
```

**Give Rewards**:
```bash
# 1st Place
lp user <winner> parent add legend
lp user <winner> permission set cosmetics.hat.winner true
lp user <winner> permission set playerparticles.effect.electric_spark true

# 2nd Place
lp user <player> permission set cosmetics.hat.crown_silver true
lp user <player> permission set playerparticles.effect.firework true

# 3rd Place
lp user <player> permission set cosmetics.hat.crown_basic true
lp user <player> permission set playerparticles.effect.totem_of_undying true
```

### Resetting for Next Competition

```bash
# ⚠️ WARNING: Clears ALL plots
./scripts/competition-manager.sh reset
```

---

## Handling Reports & Issues

### Grief Reports

```bash
# 1. Inspect the area
/co inspect

# 2. View recent changes
# Click on blocks to see who placed/broke them

# 3. Rollback if grief confirmed
/co rollback u:<griefer> t:24h r:100
# u:username, t:time, r:radius

# 4. Take action
/tempban <griefer> 7d Griefing - CoreProtect evidence
```

### Chat Violations

**First Offense**: Warning
```bash
/warn <player> Chat violation: [reason]
```

**Second Offense**: Mute
```bash
/mute <player> 1h Repeated chat violations
```

**Third Offense**: Temporary Ban
```bash
/tempban <player> 24h Multiple chat violations after warnings
```

### Hacking/Cheating

**Immediate Action**: Permanent Ban
```bash
/ban <player> Cheating/Hacking - Zero tolerance
```

**Evidence**: Screenshot or video if possible

### Player Disputes

1. Listen to both sides
2. Check CoreProtect logs
3. Review chat logs
4. Make fair judgment
5. Document decision

---

## Backup Procedures

### Automated Daily Backups

Set up cron job:
```bash
crontab -e
# Add:
0 3 * * * /home/deploy/minecraft-server/backup.sh
```

### Manual Backup

```bash
cd /home/deploy/minecraft-server
./backup.sh
```

Creates: `backups/minecraft-backup-YYYY-MM-DD.tar.gz`

### Backup Verification

```bash
# List backups
ls -lh backups/

# Test restore (to temp directory)
mkdir /tmp/test-restore
tar -xzf backups/minecraft-backup-YYYY-MM-DD.tar.gz -C /tmp/test-restore
```

### Restore from Backup

```bash
# 1. Stop server
sudo systemctl stop minecraft.service

# 2. Backup current state (just in case)
mv world world.old

# 3. Restore from backup
tar -xzf backups/minecraft-backup-YYYY-MM-DD.tar.gz

# 4. Start server
sudo systemctl start minecraft.service
```

---

## Performance Monitoring

### Check Server TPS

```bash
# In-game or console
/tps
```

**Goal**: 20 TPS (ticks per second)
- 19-20: Excellent
- 17-19: Good
- 15-17: Moderate lag
- <15: Significant lag

### Memory Usage

```bash
# Check RAM usage
free -h

# Check Java heap usage (in-game)
/spark heapsummary
```

### CPU Usage

```bash
top -u minecraft
```

### Diagnose Lag

```bash
# Performance profiling
/spark profiler start
# Wait 1-2 minutes
/spark profiler stop
```

Creates report with lag sources.

### Optimization Actions

If TPS drops:
1. Check for lag machines
2. Reduce entity count
3. Clear dropped items: `/kill @e[type=item]`
4. Restart server if needed
5. Review Paper configuration

---

## Staff Permissions

### Rank Structure

**Helper** → **Moderator** → **Admin** → **Owner**

### Helper Permissions

- Kick players
- Warn players
- Mute players (temp)
- Check CoreProtect
- Answer `/helpop`

```bash
lp group helper permission set essentials.kick true
lp group helper permission set essentials.warn true
lp group helper permission set essentials.mute true
lp group helper permission set coreprotect.inspect true
```

### Moderator Permissions

All Helper permissions, plus:
- Temporary ban
- Rollback grief
- Manage claims
- Vanish mode

```bash
lp group moderator parent set helper
lp group moderator permission set essentials.tempban true
lp group moderator permission set coreprotect.rollback true
lp group moderator permission set griefprevention.deleteclaims true
lp group moderator permission set supervanish.vanish true
```

### Admin Permissions

All Moderator permissions, plus:
- Permanent ban
- Server management
- Plugin configuration
- WorldEdit

```bash
lp group admin parent set moderator
lp group admin permission set essentials.ban true
lp group admin permission set worldedit.* true
lp group admin permission set luckperms.* true
```

---

## Plugin Management

### Installing New Plugins

```bash
# 1. Edit plugins.json
nano plugins.json

# 2. Add plugin entry
{
  "name": "PluginName",
  "enabled": true,
  "source": "github",
  "repo": "Author/PluginName",
  "asset_pattern": "PluginName"
}

# 3. Run installer
./install-plugins.sh

# 4. Restart server
sudo systemctl restart minecraft.service
```

### Updating Plugins

```bash
# Update all enabled plugins
./update-plugins.sh

# Or manually update specific plugin
./install-plugins.sh  # Re-run to update
```

### Disabling Plugins

**Temporary** (until restart):
```bash
/plugman disable PluginName
```

**Permanent**:
```bash
# Edit plugins.json
"enabled": false

# Remove JAR file
rm plugins/PluginName.jar
```

### Plugin Configuration

```bash
# Plugin configs are in:
cd plugins/PluginName/

# Edit main config
nano config.yml

# Restart server to apply
sudo systemctl restart minecraft.service
```

---

## Emergency Procedures

### Server Crash

```bash
# 1. Check status
sudo systemctl status minecraft.service

# 2. Check crash report
cat crash-reports/crash-*.txt

# 3. Restart server
sudo systemctl restart minecraft.service

# 4. Monitor logs
sudo journalctl -u minecraft.service -f
```

### Rollback Massive Grief

```bash
# Rollback by time and radius
/co rollback t:1h r:global

# Rollback specific player
/co rollback u:<player> t:24h r:global

# Undo rollback if mistake
/co undo
```

### Database Corruption

```bash
# 1. Stop server
sudo systemctl stop minecraft.service

# 2. Restore from backup
tar -xzf backups/minecraft-backup-YYYY-MM-DD.tar.gz

# 3. Start server
sudo systemctl start minecraft.service
```

---

## Useful Commands Reference

### Server Management

```bash
sudo systemctl start minecraft.service   # Start
sudo systemctl stop minecraft.service    # Stop
sudo systemctl restart minecraft.service # Restart
sudo systemctl status minecraft.service  # Status
sudo journalctl -u minecraft.service -f  # Live logs
```

### Player Management

```bash
/kick <player> <reason>
/warn <player> <reason>
/mute <player> <time> <reason>
/tempban <player> <time> <reason>
/ban <player> <reason>
/pardon <player>
```

### CoreProtect

```bash
/co inspect      # Inspect mode
/co lookup       # Search logs
/co rollback     # Rollback changes
/co restore      # Restore changes
/co purge        # Delete old data
```

### WorldEdit

```bash
//wand           # Get selection tool
//set <block>    # Set blocks
//replace        # Replace blocks
//undo           # Undo last action
//redo           # Redo last action
```

### LuckPerms

```bash
/lp user <player> info
/lp user <player> parent add <group>
/lp user <player> permission set <perm> <true|false>
/lp group <group> permission set <perm> <true|false>
```

---

## Best Practices

### Staff Conduct

✅ **Do**:
- Be fair and consistent
- Document all actions
- Communicate with other staff
- Help players patiently
- Follow server rules yourself

❌ **Don't**:
- Abuse permissions
- Show favoritism
- Make hasty decisions
- Ignore player reports
- Discuss bans publicly

### Decision Making

1. Gather all evidence
2. Consult CoreProtect logs
3. Discuss with other staff if needed
4. Make fair judgment
5. Document decision
6. Inform player of reason

### Communication

- Use staff Discord channel
- Log major events
- Coordinate competitions
- Share player feedback
- Plan events together

---

## Resources

- **Plugin Docs**: See PLUGINS.md
- **Competition Guide**: [../features/build-competitions.md](../features/build-competitions.md)
- **Feature Docs**: [../features/overview.md](../features/overview.md)
- **Troubleshooting**: docs/getting-started/deployment.md

---

## Staff Training Checklist

New staff should learn:
- [ ] Server rules and how to enforce them
- [ ] CoreProtect inspection and rollback
- [ ] Warning/ban commands
- [ ] Competition management
- [ ] Backup procedures
- [ ] Player assistance basics
- [ ] Discord integration
- [ ] LuckPerms basics

---

**Questions?** Contact senior staff or check documentation.

*Keep festas_builds running smoothly!*

---

## Related Documents

- [Server Management](./server-management.md) - Technical server operations
- [Console Setup](./console-setup.md) - Web console configuration
- [Plugins Guide](./plugins.md) - Plugin documentation
- [Security Policy](./security.md) - Security guidelines
- [Onboarding Guide](./onboarding.md) - New admin training
- [Quick Reference](./cheatsheet.md) - Command cheat sheet

[← Back to Admin Guide](./README.md)
