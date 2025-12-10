# Admin Onboarding Guide

Welcome to the Minecraft Server Console admin team! This guide will help you get started with managing the server.

## Table of Contents

- [Getting Started](#getting-started)
- [Console Access](#console-access)
- [First Login](#first-login)
- [Understanding Roles](#understanding-roles)
- [Essential Features](#essential-features)
- [Common Tasks](#common-tasks)
- [Best Practices](#best-practices)
- [Getting Help](#getting-help)

## Getting Started

### Prerequisites

Before you begin, make sure you have:

- [ ] Console login credentials (username and password)
- [ ] Access to the server URL
- [ ] Basic understanding of Minecraft server administration
- [ ] Discord access for team communication (if applicable)

### Console Access

1. **Navigate to Console**
   - Open your browser
   - Go to: `https://your-server-address:3001/console/`
   - Bookmark this URL for easy access

2. **Login**
   - Enter your username
   - Enter your password
   - Click "Login"

3. **Security Note**
   - Always use a strong password
   - Never share your credentials
   - Log out when finished
   - Report suspicious activity immediately

## First Login

### Dashboard Tour

When you first log in, you'll see the Dashboard with:

1. **Server Status** - Shows if server is online/offline
2. **Player Count** - Number of players currently online
3. **System Stats** - CPU, RAM, TPS, disk usage
4. **Quick Actions** - Start, stop, restart, backup buttons
5. **Recent Events** - Log of recent server activities

### Navigation Menu

Familiarize yourself with the navigation:

- 📊 **Dashboard** - Overview of server status
- 💻 **Console** - Execute commands and view logs
- 👥 **Players** - Manage online players
- ⚙️ **Controls** - Server control panel
- 📦 **Backups** - Backup management
- 🗺️ **Map** - Live map integration
- 🔌 **Plugins** - Plugin management
- ⏰ **Automation** - Scheduled tasks
- 🔗 **Webhooks** - Event notifications
- 🔑 **API Portal** - API key management
- 👤 **User Management** - Admin users (if you have access)
- 📊 **Analytics** - Server analytics
- 🔄 **CI/CD** - Deployment dashboard

## Understanding Roles

The console has four role levels:

### Viewer
**Permissions:**
- View dashboard and statistics
- View player list
- View logs
- View backups
- View automation history

**Cannot:**
- Execute commands
- Modify settings
- Manage users

### Moderator
**Additional Permissions:**
- Execute most commands
- Kick/ban players
- Teleport players
- Trigger webhooks
- View player info on map

**Cannot:**
- Delete backups
- Modify automation tasks
- Manage users
- Access API keys

### Admin
**Additional Permissions:**
- Full backup management
- Create/edit automation tasks
- Manage webhooks
- Manage plugins
- Access CI/CD features
- Create API keys

**Cannot:**
- Delete users
- Modify owner permissions

### Owner
**Full Access:**
- All administrative functions
- User management
- System configuration
- Critical operations

**Your Role:** Check with your team lead to confirm your role.

## Essential Features

### 1. Server Console

Access real-time server logs and execute commands:

```
Navigation → Console

Common Commands:
/list                 - List online players
/say <message>        - Broadcast message
/tp <player1> <player2> - Teleport player
/gamemode <mode> <player> - Change gamemode
/kick <player> <reason> - Kick player
/ban <player> <reason> - Ban player
```

### 2. Player Management

Manage online players:

```
Navigation → Players

Actions Available:
- Kick - Remove player from server
- Ban - Permanently ban player
- OP/Deop - Grant/remove operator status
- Teleport - Move player to coordinates
- Gamemode - Change player's gamemode
```

### 3. Backup Management

Create and restore backups:

```
Navigation → Backups

Features:
- Create Manual Backup - Save current world state
- Download Backup - Download backup to local machine
- Restore Backup - Restore from previous backup
- Delete Backup - Remove old backups
- Schedule Backups - Set up automatic backups
```

**Important:** Always create a backup before:
- Making major changes
- Updating plugins
- Updating Minecraft version
- Testing new features

### 4. Automation

Set up scheduled tasks:

```
Navigation → Automation

Task Types:
- Backup - Automatic backups
- Restart - Scheduled restarts
- Command - Execute commands on schedule
- Broadcast - Send scheduled messages

Example: Daily 4 AM backup
Name: "Daily Backup"
Type: Backup
Schedule: 0 4 * * * (cron format)
```

## Common Tasks

### Task 1: Kick a Player

1. Go to **Players** page
2. Find the player in the list
3. Click **Kick** button
4. Enter reason (optional)
5. Confirm action

### Task 2: Create a Backup

1. Go to **Backups** page
2. Click **Create Backup** button
3. Enter backup name (optional)
4. Wait for completion
5. Verify backup appears in list

### Task 3: Restart the Server

1. Go to **Dashboard**
2. Click **Restart Server** in Quick Actions
3. Confirm restart
4. Wait for server to come back online
5. Verify players can reconnect

**Best Practice:** Warn players before restarting:
```
Go to Console → Type: /say Server restarting in 5 minutes!
```

### Task 4: View Server Logs

1. Go to **Console** page
2. Logs appear in real-time
3. Use **Clear Log** to clear display
4. Look for errors or warnings
5. Report issues to team lead

### Task 5: Execute a Command

1. Go to **Console** page
2. Type command in input box
3. Press **Send** or Enter
4. View command output in logs
5. Verify command executed successfully

## Best Practices

### General Guidelines

1. **Backup First**
   - Always backup before major changes
   - Test in creative mode when possible
   - Have a rollback plan ready

2. **Communicate**
   - Warn players before restarts
   - Announce maintenance windows
   - Document changes in team chat

3. **Monitor**
   - Check logs regularly
   - Watch for performance issues
   - Report unusual activity

4. **Security**
   - Use strong passwords
   - Log out when done
   - Don't share credentials
   - Report security concerns

### Player Interaction

1. **Be Professional**
   - Stay calm and neutral
   - Explain decisions clearly
   - Document rule violations

2. **Be Fair**
   - Apply rules consistently
   - Investigate before acting
   - Give warnings when appropriate

3. **Be Helpful**
   - Answer questions patiently
   - Guide new players
   - Foster positive community

### Command Safety

**Safe Commands** (use freely):
- `/list`, `/say`, `/tell`
- `/tp` (teleport)
- `/gamemode`

**Caution Required:**
- `/give` - Can unbalance economy
- `/setblock` - Can cause grief
- `/kill` - Affects player inventory

**Admin Only:**
- `/stop` - Stops server
- `/op` - Grants admin powers
- `/deop` - Removes admin powers

### Emergency Procedures

**Server Crash:**
1. Check logs for error
2. Notify team lead
3. Restart if appropriate
4. Document incident

**Grief Attack:**
1. Take screenshots
2. Note player names
3. Use CoreProtect to rollback
4. Ban offending players
5. Document incident

**Performance Issues:**
1. Check TPS in dashboard
2. Check player count
3. Review recent changes
4. Notify technical admin
5. Consider restart if severe

## Keyboard Shortcuts

- **Ctrl + K** - Focus command input
- **↑/↓ Arrow Keys** - Navigate command history
- **Esc** - Close modals
- **Ctrl + R** - Refresh page
- **Ctrl + /** - Clear console log

## Useful Resources

### Documentation
- [Full Admin Guide](ADMIN-GUIDE.md) - Comprehensive administration guide
- [Server Management](SERVER-MANAGEMENT.md) - Technical server management
- [Plugin Guide](PLUGINS.md) - Plugin documentation
- [Troubleshooting](./getting-started/deployment.md#troubleshooting) - Common issues

### Quick References
- [Launch Checklist](./getting-started/launch-checklist.md) - Pre-launch validation
- [QA Checklist](./getting-started/qa-checklist.md) - Quality assurance
- [Security Policy](SECURITY.md) - Security guidelines

### Support Channels
- Team Discord - Real-time help from other admins
- GitHub Issues - Report bugs or feature requests
- Documentation - Check guides first

## Training Checklist

Complete these tasks to become familiar with the console:

- [ ] Successfully log in to console
- [ ] Navigate to all main pages
- [ ] View server logs in Console
- [ ] Create a test backup
- [ ] Execute `/list` command
- [ ] View player information
- [ ] Check server statistics
- [ ] Review automation tasks
- [ ] Read security policy
- [ ] Join team Discord/communication channel

## Getting Help

### Who to Ask

**Technical Issues:**
- Contact: Technical Admin/Server Owner
- Discord: #admin-support channel
- When: Server errors, crashes, performance issues

**Player Issues:**
- Contact: Head Moderator
- Discord: #moderation channel
- When: Rule violations, disputes, bans

**Console Issues:**
- Contact: Console Administrator
- GitHub: Create issue
- When: Console bugs, access problems

### Reporting Issues

When reporting a problem, include:

1. **What happened** - Clear description
2. **When** - Date and time
3. **Where** - Which page/feature
4. **Steps to reproduce** - How to recreate issue
5. **Screenshots** - Visual evidence if applicable
6. **Error messages** - Exact text of errors

### Example Report

```
Issue: Cannot create backup

What: Clicking "Create Backup" shows error message
When: Today at 14:30 UTC
Where: Backups page
Steps: 
  1. Go to Backups page
  2. Click "Create Backup"
  3. Error appears: "Insufficient permissions"
Error Message: "Error: User does not have BACKUP_CREATE permission"
Screenshot: [attached]
```

## Next Steps

After completing this onboarding:

1. **Read Policies**
   - Server rules
   - Admin guidelines
   - Security policy

2. **Shadow Experienced Admin**
   - Watch how they handle issues
   - Ask questions
   - Take notes

3. **Start Small**
   - Begin with read-only tasks
   - Gradually take on more responsibility
   - Ask before making big changes

4. **Continue Learning**
   - Read documentation
   - Stay updated on changes
   - Share knowledge with team

## Conclusion

Welcome to the team! Remember:

- **Communication is key** - Ask questions, share information
- **Safety first** - Backup before changes, think before acting
- **Community matters** - Treat players with respect
- **We're here to help** - Don't hesitate to ask for support

Good luck, and enjoy being part of the admin team! 🎮

---

**Last Updated:** December 2024  
**Questions?** Contact your team lead or check documentation
