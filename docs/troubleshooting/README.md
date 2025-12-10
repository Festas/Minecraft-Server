# 🔍 Troubleshooting

Welcome to the Troubleshooting section! This section contains diagnostic tools, common issues, debugging guides, and problem resolution documentation.

---

## 🎯 Decision Tree: What Kind of Problem Are You Experiencing?

Follow this decision tree to find the right diagnostic tool or solution:

```
Start Here: What's the problem?
│
├─ 🎮 Players can't connect to server
│  ├─ Check: Server running? → docker ps | grep minecraft
│  ├─ Check: Ports open? → sudo netstat -tulpn | grep 25565
│  └─ See: [Network Issues](./common-issues.md#network-issues)
│
├─ 🔐 Can't login to web console
│  ├─ Clear browser cookies and cache
│  ├─ Check: Container running? → docker ps | grep console
│  └─ See: [Authentication Issues](./common-issues.md#authentication-issues)
│
├─ 🔌 Plugin not working
│  ├─ Check: Plugin loaded? → docker logs minecraft-server | grep PluginName
│  ├─ Check: Dependencies installed?
│  └─ See: [Plugin Issues](./common-issues.md#plugin-issues)
│     or: [Plugin Diagnostics](./plugin-diagnostics.md)
│
├─ 📦 Plugin installation fails
│  ├─ Run: [Plugin Diagnostics](./plugin-diagnostics.md)
│  └─ See: [Plugin Issues](./common-issues.md#plugin-issues)
│
├─ 📊 Dashboard shows incorrect stats
│  ├─ Check: RCON connection → Test RCON password
│  └─ See: [Console Issues](./common-issues.md#console-issues)
│
├─ 🐌 Server lag / Low TPS
│  ├─ Check: TPS → /tps command
│  ├─ Check: Resources → docker stats
│  └─ See: [Performance Issues](./common-issues.md#performance-issues)
│
├─ 🌐 Web console page not loading
│  ├─ Run: [Browser Diagnostics](./browser-diagnostics.md)
│  └─ See: [Console Issues](./common-issues.md#console-issues)
│
├─ 💾 Backup/Restore failing
│  ├─ Check: Disk space → df -h
│  └─ See: [Backup Issues](./common-issues.md#backup--restore-issues)
│
└─ ❓ Something else / Multiple issues
   └─ Run: [Comprehensive Diagnostics](./diagnostics-guide.md)
```

---

## ⚡ Quick Fixes Table

| Problem | Quick Fix | Details |
|---------|-----------|---------|
| **Can't login** | Clear cookies, try incognito mode | [Auth Issues](./common-issues.md#authentication-issues) |
| **Container won't start** | `docker logs <container>` to see errors | [Docker Issues](./common-issues.md#docker-issues) |
| **Port conflict** | Change port in docker-compose.yml | [Docker Issues](./common-issues.md#container-wont-start) |
| **Plugin not loading** | Check version compatibility, dependencies | [Plugin Issues](./common-issues.md#plugin-not-loading) |
| **Low TPS** | Reduce view distance, check /tps | [Performance](./common-issues.md#low-tps-server-lag) |
| **High memory** | Adjust MEMORY in .env, restart | [Performance](./common-issues.md#server-using-too-much-memory) |
| **RCON failed** | Verify password in .env matches server.properties | [RCON Issues](./common-issues.md#rcon-connection-refused) |
| **WebSocket error** | Check reverse proxy WebSocket config | [Console Issues](./common-issues.md#websocket-connection-failed) |
| **CSRF error** | Clear cookies, refresh page | [Auth Issues](./common-issues.md#csrf-token-mismatch) |
| **Backup failed** | Check disk space with `df -h` | [Backup Issues](./common-issues.md#backup-creation-fails) |

---

## 📚 Documents in This Section

### Diagnostic Tools

- **[Diagnostics Guide](./diagnostics-guide.md)** - Comprehensive diagnostic suite overview
- **[Browser Diagnostics](./browser-diagnostics.md)** - Frontend and API automated testing
- **[Plugin Diagnostics](./plugin-diagnostics.md)** - Plugin installation testing workflow

### Solutions & Guides

- **[Common Issues](./common-issues.md)** - Searchable FAQ with solutions to frequent problems

---

## 🛠️ Diagnostic Scripts & Usage

### Run Diagnostics via GitHub Actions

**Comprehensive Diagnostics** (All tools):
1. Go to: GitHub → Actions → "Comprehensive Plugin Manager Diagnostics"
2. Click "Run workflow"
3. Download artifact with full diagnostic report

**Individual Diagnostics**:
- Browser Diagnostics → GitHub Actions → "Browser Diagnostics"
- Plugin Diagnostics → GitHub Actions → "Plugin Install Diagnostics"

### Run Diagnostics Locally

```bash
# Browser diagnostics (frontend + API)
export CONSOLE_URL="http://localhost:3001"
export ADMIN_USERNAME="admin"
export ADMIN_PASSWORD="your-password"
node scripts/diagnostics/browser-diagnostics.js

# API profiling
export CONSOLE_URL="http://localhost:3001"
./scripts/api-testing/api-profiler.sh

# Resource monitoring
./scripts/diagnostics/resource-monitor.sh

# Plugin diagnostics
# See: .github/workflows/plugin-install-diagnose.yml
```

See [Diagnostics Guide](./diagnostics-guide.md) for detailed usage.

---

## 🚨 When to Escalate

Contact maintainers or open a GitHub issue if:

1. **Security Issue**: Suspected security vulnerability
   - Email: security@festas.com (if available)
   - Or: GitHub Security Advisory

2. **Data Loss**: Potential data corruption or loss
   - **STOP**: Don't make changes
   - Document state with logs and screenshots
   - Open urgent issue

3. **Repeated Failures**: Same issue after trying documented solutions
   - Include: Diagnostic outputs
   - Include: Steps attempted
   - Include: Error logs

4. **Undocumented Issue**: Problem not in Common Issues guide
   - Run: Comprehensive diagnostics
   - Attach: Diagnostic report
   - Open: New issue with details

---

## 📍 Log File Locations

### Docker Logs (Primary Source)

```bash
# Minecraft server logs
docker logs minecraft-server
docker logs minecraft-server --tail 100  # Last 100 lines
docker logs minecraft-server -f          # Follow live

# Console logs
docker logs minecraft-console

# Website logs
docker logs minecraft-website
```

### Container File Logs

```bash
# Minecraft server logs (in container)
docker exec minecraft-server cat /data/logs/latest.log

# Console application logs
docker exec minecraft-console cat /app/data/logs/console.log

# Plugin-specific logs
docker exec minecraft-server ls /data/plugins/*/logs/
```

### Host File Logs

```bash
# If volumes mounted to host
./minecraft-data/logs/latest.log           # Minecraft
./console/data/logs/console.log            # Console
./minecraft-data/plugins/*/logs/           # Plugins
```

### Diagnostic Output Locations

```bash
# GitHub Actions artifacts (download from workflow runs)
comprehensive-diagnostics-summary/
  ├── MASTER-SUMMARY.txt
  ├── README.md
  └── SECRETS-GUIDE.txt

# Local diagnostic outputs
/tmp/browser-diagnostics-*/
/tmp/api-profiler-*/
/tmp/resource-monitor-*/
```

---

## 🔗 Related Sections

- **[Getting Started](../getting-started/)** - Setup troubleshooting
- **[Administration](../admin/)** - Server management issues
- **[Features](../features/)** - Plugin-specific issues
- **[Development](../development/)** - Development environment issues

---

## 💡 Troubleshooting Best Practices

1. **Always check logs first**: `docker logs <container>`
2. **Test one thing at a time**: Isolate variables
3. **Use diagnostic tools**: Automated tools catch more issues
4. **Document your steps**: Record what you tried
5. **Check for updates**: Ensure software is current
6. **Search existing issues**: Problem may be known
7. **Backup before fixes**: Create backup before major changes
8. **Ask for help**: Don't hesitate to open an issue

---

[← Back to Documentation Hub](../)
