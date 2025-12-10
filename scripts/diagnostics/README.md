# Diagnostics Scripts

This directory contains scripts for diagnosing and troubleshooting the Minecraft server console and plugin manager.

## Quick Start

**Using the wrapper script (recommended):**
```bash
# Run browser diagnostics
./scripts/run.sh diagnostics browser

# Run plugin diagnostics
./scripts/run.sh diagnostics plugins diagnose

# Run advanced plugin diagnostics
./scripts/run.sh diagnostics plugins-advanced
```

**Direct execution:**
```bash
# Browser diagnostics
node scripts/diagnostics/browser-diagnostics.js

# Plugin diagnostics
./scripts/diagnostics/diagnose-plugins.sh diagnose
```

## Scripts Overview

### browser-diagnostics.js

Browser automation diagnostics using Puppeteer to test the frontend.

**When to use:**
- Frontend not loading or displaying errors
- JavaScript errors in console
- Network request failures
- Performance issues
- UI rendering problems

**What it does:**
- Captures console errors and warnings
- Records network requests with timings
- Measures page performance metrics
- Analyzes DOM complexity
- Takes screenshots at key stages

**Environment Variables:**
- `CONSOLE_URL` - Console URL (default: http://localhost:3000)
- `ADMIN_USERNAME` - Admin username (default: admin)
- `ADMIN_PASSWORD` - Admin password
- `OUTPUT_DIR` - Output directory (default: /tmp/browser-diagnostics)
- `HEADLESS` - Run headless (default: true)
- `TIMEOUT` - Request timeout in ms (default: 30000)

**Example:**
```bash
export CONSOLE_URL="http://localhost:3000"
export ADMIN_USERNAME="admin"
export ADMIN_PASSWORD="mypassword"
export OUTPUT_DIR="/tmp/browser-diagnostics"
node scripts/diagnostics/browser-diagnostics.js
```

### diagnose-plugins.sh

Basic plugin manager diagnostics and auto-fix.

**When to use:**
- Plugin manager not working
- Plugins not installing or uninstalling
- Plugin file or directory issues
- Need to fix common problems automatically

**What it does:**
- Checks plugins.json existence and validity
- Validates JSON syntax
- Checks plugins directory and permissions
- Validates plugin-history.json
- Tests API backend reachability
- Auto-fixes missing or corrupt files (in fix mode)

**Usage:**
```bash
# Diagnose only (no changes)
./scripts/diagnostics/diagnose-plugins.sh diagnose

# Diagnose and auto-fix issues
./scripts/diagnostics/diagnose-plugins.sh fix
```

**Output:**
Creates timestamped directory: `/tmp/plugin-diagnostics-YYYYMMDD-HHMMSS/`

### diagnose-plugins-advanced.sh

Advanced plugin diagnostics with detailed analysis.

**When to use:**
- Need deep analysis of plugin system
- Investigating complex plugin issues
- Troubleshooting after basic diagnostics
- Need detailed state information

**What it does:**
- All basic diagnostic checks
- Detailed plugin metadata analysis
- Plugin dependency checking
- Version conflict detection
- Detailed permission analysis
- History analysis

**Usage:**
```bash
./scripts/diagnostics/diagnose-plugins-advanced.sh
```

### diagnose.sh

General server diagnostics.

**When to use:**
- General server health check
- Docker container issues
- Configuration problems
- Need overview of server state

**What it does:**
- Checks Docker containers
- Validates configuration files
- Checks file permissions
- Tests network connectivity
- Validates environment

**Usage:**
```bash
./scripts/diagnostics/diagnose.sh
```

### resource-monitor.sh

System and Docker container resource monitoring.

**When to use:**
- Performance issues
- High CPU or memory usage
- Need to track resource usage over time
- Profiling operations

**What it does:**
- Monitors CPU and memory usage
- Tracks Docker container stats
- Records network connections
- Logs process information
- Generates usage statistics

**Environment Variables:**
- `OUTPUT_DIR` - Output directory (default: /tmp/resource-monitor)
- `MONITOR_DURATION` - Duration in seconds (default: 30)
- `MONITOR_INTERVAL` - Sample interval in seconds (default: 1)
- `CONTAINER_NAME` - Docker container to monitor (default: minecraft-console)

**Example:**
```bash
export MONITOR_DURATION=60
export MONITOR_INTERVAL=2
./scripts/diagnostics/resource-monitor.sh
```

### generate-diagnostics-summary.sh

Generate master summary from all diagnostic results.

**When to use:**
- After running comprehensive diagnostics
- Need consolidated report
- Want triage guide
- Automated in workflows

**What it does:**
- Aggregates results from all diagnostic types
- Generates master summary with triage guide
- Creates GitHub-friendly markdown
- Documents secrets status
- Provides troubleshooting recommendations

**Usage:**
```bash
# Usually called by workflows, but can run manually:
export OUTPUT_DIR="./comprehensive-summary"
export RUN_NUMBER="123"
export CONSOLE_URL="http://localhost:3000"
export TIMESTAMP="$(date -u '+%Y-%m-%d %H:%M:%S UTC')"
./scripts/diagnostics/generate-diagnostics-summary.sh
```

## Common Workflows

### Quick Frontend Diagnostics

```bash
# Run browser diagnostics
./scripts/run.sh diagnostics browser

# Check the output
cat /tmp/browser-diagnostics/SUMMARY.txt
ls /tmp/browser-diagnostics/screenshot-*.png
```

### Complete Plugin System Check

```bash
# 1. Basic diagnostics first
./scripts/run.sh diagnostics plugins diagnose

# 2. If issues found, try auto-fix
./scripts/run.sh diagnostics plugins fix

# 3. For complex issues, run advanced
./scripts/run.sh diagnostics plugins-advanced

# 4. Review outputs
cat /tmp/plugin-diagnostics-*/SUMMARY.txt
```

### Performance Profiling

```bash
# 1. Start monitoring in background
export MONITOR_DURATION=120
./scripts/run.sh diagnostics resource-monitor &

# 2. Perform operations you want to profile
# (e.g., load page, install plugin, etc.)

# 3. Wait for monitoring to complete
wait

# 4. Review results
cat /tmp/resource-monitor/SUMMARY.txt
```

### Complete System Diagnostics

```bash
# Run all diagnostic scripts
./scripts/run.sh diagnostics diagnose
./scripts/run.sh diagnostics plugins diagnose
./scripts/run.sh diagnostics browser

# Or use the comprehensive GitHub Actions workflow:
# Actions → Comprehensive Plugin Manager Diagnostics
```

## Output Structure

All scripts create structured output directories:

```
/tmp/[script-name]-[timestamp]/
├── SUMMARY.txt              # Start here - overview and key findings
├── *.json                   # Structured data (errors, requests, etc.)
├── *.log                    # Time-series logs
├── *.txt                    # Text reports and analysis
└── screenshots/             # Visual snapshots (browser diagnostics)
    └── *.png
```

## Troubleshooting

### Script Won't Execute

```bash
# Make sure script is executable
chmod +x scripts/diagnostics/*.sh

# Check shebang line
head -1 scripts/diagnostics/diagnose-plugins.sh
```

### Browser Diagnostics Fails

```bash
# Check Puppeteer installation
cd console/backend
npm list puppeteer

# Test browser launch
node -e "const puppeteer = require('puppeteer'); (async () => { const browser = await puppeteer.launch(); await browser.close(); })();"

# Install missing dependencies (Linux)
sudo apt-get install -y libnss3 libatk1.0-0 libatk-bridge2.0-0
```

### Permission Denied

```bash
# Check output directory permissions
ls -ld /tmp/

# Use custom output directory
export OUTPUT_DIR="/home/user/diagnostics"
mkdir -p "$OUTPUT_DIR"
```

### No Data Collected

```bash
# Verify console is running
curl http://localhost:3000/api/status

# Check credentials
echo $ADMIN_USERNAME $ADMIN_PASSWORD

# Enable verbose output
set -x
./scripts/diagnostics/diagnose-plugins.sh diagnose
```

## Exit Codes

All scripts follow standard exit code conventions:

- `0` - Success, no issues found
- `1` - Errors detected or diagnostics failed
- `2` - Invalid arguments or configuration

## Related Documentation

- [../README.md](../README.md) - Main scripts documentation
- [../../docs/troubleshooting/diagnostics-guide.md](../../docs/troubleshooting/diagnostics-guide.md) - Complete diagnostics guide
- [../../docs/troubleshooting/browser-diagnostics.md](../../docs/troubleshooting/browser-diagnostics.md) - Browser diagnostics details
- [../../docs/troubleshooting/plugin-diagnostics.md](../../docs/troubleshooting/plugin-diagnostics.md) - Plugin diagnostics details
