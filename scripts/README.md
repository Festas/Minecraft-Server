# Diagnostic Scripts

This directory contains various scripts for diagnosing and troubleshooting the Minecraft server console and plugin manager.

## Scripts Overview

### Browser Automation

#### `browser-diagnostics.js`

Automated browser testing using Puppeteer to diagnose frontend issues.

**Purpose**: Capture frontend errors, network requests, performance metrics, and visual state

**Usage**:
```bash
export CONSOLE_URL="http://localhost:3000"
export ADMIN_USERNAME="admin"
export ADMIN_PASSWORD="your-password"
export OUTPUT_DIR="/tmp/browser-diagnostics"

node scripts/browser-diagnostics.js
```

**Outputs**:
- Console errors and warnings
- Network request logs with timings
- Performance metrics
- DOM complexity analysis
- Screenshots at key stages

**Documentation**: [BROWSER-DIAGNOSTICS.md](../docs/BROWSER-DIAGNOSTICS.md)

---

### API Testing

#### `api-profiler.sh`

Comprehensive API endpoint testing and profiling.

**Purpose**: Test all API endpoints with timing data and error cases

**Usage**:
```bash
export CONSOLE_URL="http://localhost:3000"
export ADMIN_USERNAME="admin"
export ADMIN_PASSWORD="your-password"
export OUTPUT_DIR="/tmp/api-profiler"

./scripts/api-profiler.sh
```

**Tests**:
- Authentication flow (login, session, CSRF)
- Plugin manager APIs (list, history, install)
- RCON APIs (status, players)
- Error cases (invalid credentials, missing CSRF)

**Outputs**:
- Response times for each endpoint
- Request/response samples
- HTTP headers and cookies
- Error case results

**Documentation**: [BROWSER-DIAGNOSTICS.md](../docs/BROWSER-DIAGNOSTICS.md#api-profiling)

---

### Resource Monitoring

#### `resource-monitor.sh`

System and Docker container resource monitoring.

**Purpose**: Track CPU, memory, and network usage during operations

**Usage**:
```bash
export OUTPUT_DIR="/tmp/resource-monitor"
export MONITOR_DURATION=60  # seconds
export MONITOR_INTERVAL=2   # seconds
export CONTAINER_NAME="minecraft-console"

./scripts/resource-monitor.sh
```

**Monitors**:
- System CPU and memory usage
- Docker container statistics
- Network connections
- Process lists

**Outputs**:
- Time-series resource usage logs
- Summary statistics
- Peak usage metrics

**Documentation**: [BROWSER-DIAGNOSTICS.md](../docs/BROWSER-DIAGNOSTICS.md#resource-monitoring)

---

### Plugin Diagnostics

#### `diagnose-plugins.sh`

Basic plugin manager diagnostics.

**Purpose**: Check plugin files, permissions, and basic functionality

**Usage**:
```bash
./scripts/diagnose-plugins.sh [diagnose|fix]
```

**Documentation**: See [PLUGIN-INSTALL-DIAGNOSTICS.md](../docs/PLUGIN-INSTALL-DIAGNOSTICS.md)

#### `diagnose-plugins-advanced.sh`

Advanced plugin diagnostics with detailed analysis.

**Purpose**: Deep analysis of plugin system state

**Usage**:
```bash
./scripts/diagnose-plugins-advanced.sh
```

**Documentation**: See [PLUGIN-INSTALL-DIAGNOSTICS.md](../docs/PLUGIN-INSTALL-DIAGNOSTICS.md)

---

### Plugin Install Testing

#### `plugin-install-diagnostics-lib.sh`

Library functions for plugin install diagnostics workflow.

**Purpose**: Shared functions used by plugin install diagnostics

**Note**: Not meant to be run directly; used by workflow

#### `plugin-install-test-scenarios.sh`

Test scenarios for plugin installation validation.

**Purpose**: Comprehensive test scenarios for plugin install flow

**Note**: Not meant to be run directly; used by workflow

**Documentation**: See [PLUGIN-INSTALL-DIAGNOSTICS.md](../docs/PLUGIN-INSTALL-DIAGNOSTICS.md)

---

### API Testing

#### `test-api-auth.sh`

Quick API authentication test.

**Purpose**: Test login and session functionality

**Usage**:
```bash
./scripts/test-api-auth.sh
```

#### `test-api-integration.sh`

Comprehensive API integration testing.

**Purpose**: Test complete authentication flow and protected endpoints

**Usage**:
```bash
./scripts/test-api-integration.sh
```

**Documentation**: See [API-AUTHENTICATION-GUIDE.md](../docs/API-AUTHENTICATION-GUIDE.md)

#### `test-csrf-double-submit.sh`

CSRF double-submit pattern testing.

**Purpose**: Validate CSRF protection implementation

**Usage**:
```bash
./scripts/test-csrf-double-submit.sh
```

---

### Validation

#### `validate-rcon-password.sh`

RCON password validation and sync.

**Purpose**: Verify RCON passwords match across server and console

**Usage**:
```bash
./scripts/validate-rcon-password.sh
```

---

### Utilities

#### `competition-manager.sh`

Build competition management utilities.

**Purpose**: Manage build competitions

**Usage**:
```bash
./scripts/competition-manager.sh [command]
```

---

### Diagnostics

#### `diagnose.sh`

General server diagnostics.

**Purpose**: Basic server health checks

**Usage**:
```bash
./scripts/diagnose.sh
```

---

## Common Use Cases

### Debugging Unresponsive Plugin Manager

```bash
# 1. Run browser diagnostics
CONSOLE_URL="http://localhost:3000" \
ADMIN_USERNAME="admin" \
ADMIN_PASSWORD="password" \
node scripts/browser-diagnostics.js

# 2. Check for JavaScript errors
cat /tmp/browser-diagnostics/errors.json

# 3. Review network requests
cat /tmp/browser-diagnostics/network-requests.json

# 4. Check screenshots
ls /tmp/browser-diagnostics/screenshot-*.png
```

### Testing API Performance

```bash
# 1. Run API profiler
CONSOLE_URL="http://localhost:3000" \
./scripts/api-profiler.sh

# 2. Review timing summary
cat /tmp/api-profiler/SUMMARY.txt

# 3. Check specific endpoint responses
cat /tmp/api-profiler/*-response.json
```

### Monitoring Resource Usage

```bash
# 1. Start monitoring (in background or separate terminal)
MONITOR_DURATION=60 ./scripts/resource-monitor.sh &

# 2. Perform operations (e.g., load page, install plugin)

# 3. Wait for monitoring to complete, then review
cat /tmp/resource-monitor/SUMMARY.txt
```

### Complete Diagnostic Suite

```bash
# Run all diagnostics together for comprehensive analysis

# Terminal 1: Start resource monitoring
MONITOR_DURATION=120 ./scripts/resource-monitor.sh &

# Terminal 2: Run API profiling
./scripts/api-profiler.sh

# Terminal 3: Run browser diagnostics
node scripts/browser-diagnostics.js

# Review all outputs
ls -lR /tmp/browser-diagnostics /tmp/api-profiler /tmp/resource-monitor
```

## Environment Variables

Common environment variables used across scripts:

| Variable | Description | Default | Used By |
|----------|-------------|---------|---------|
| `CONSOLE_URL` | Console base URL | `http://localhost:3000` | All |
| `ADMIN_USERNAME` | Admin username | `admin` | Auth scripts |
| `ADMIN_PASSWORD` | Admin password | Required | Auth scripts |
| `OUTPUT_DIR` | Output directory | `/tmp/[script-name]` | All |
| `TIMEOUT` | Request timeout (ms) | `30000` | Browser diagnostics |
| `HEADLESS` | Run browser headless | `true` | Browser diagnostics |
| `MONITOR_DURATION` | Monitor duration (s) | `30` | Resource monitor |
| `MONITOR_INTERVAL` | Monitor interval (s) | `1` | Resource monitor |
| `CONTAINER_NAME` | Docker container name | `minecraft-console` | Resource monitor |

## Output Directory Structure

Standard output directory structure:

```
/tmp/[diagnostic-name]-[timestamp]/
├── SUMMARY.txt              # Start here - overview of results
├── *.json                   # Structured data files
├── *.log                    # Log files with time-series data
├── *.txt                    # Text reports and analysis
└── screenshots/             # Visual snapshots (browser diagnostics)
    └── *.png
```

## Exit Codes

Scripts follow standard exit code conventions:

- `0` - Success, no issues found
- `1` - Errors detected or diagnostics failed
- `2` - Invalid arguments or configuration
- Other - Script-specific error codes

## Prerequisites

### System Requirements

- **OS**: Linux (Ubuntu/Debian recommended)
- **Shell**: Bash 4.0+
- **Node.js**: 18+ (for browser diagnostics)
- **Docker**: For container monitoring

### Tool Requirements

Different scripts require different tools:

**Browser Diagnostics**:
- Node.js and npm
- Puppeteer (installed via npm)
- System libraries (see [BROWSER-DIAGNOSTICS.md](../docs/BROWSER-DIAGNOSTICS.md))

**API Scripts**:
- curl
- jq (optional, for JSON parsing)
- grep, awk, sed

**Resource Monitoring**:
- top
- free
- netstat
- docker (for container monitoring)

### Installation

```bash
# Install Node.js and npm (if not present)
sudo apt-get update
sudo apt-get install -y nodejs npm

# Install Puppeteer
cd console/backend
npm install puppeteer

# Install system dependencies for Puppeteer
sudo apt-get install -y \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
  libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2

# Verify installation
node scripts/browser-diagnostics.js --help || echo "Ready to use"
```

## Troubleshooting

### Script Won't Execute

```bash
# Make sure script is executable
chmod +x scripts/*.sh

# Check shebang line
head -1 scripts/script-name.sh
```

### Browser Diagnostics Fails

```bash
# Check Puppeteer installation
cd console/backend
npm list puppeteer

# Test browser launch
node -e "const puppeteer = require('puppeteer'); (async () => { const browser = await puppeteer.launch(); await browser.close(); })();"

# Install missing dependencies
sudo apt-get install -y libnss3 libatk1.0-0 libatk-bridge2.0-0
```

### Permission Denied

```bash
# Check output directory permissions
ls -ld /tmp/

# Create directory with proper permissions
mkdir -p /tmp/diagnostics
chmod 777 /tmp/diagnostics

# Use custom output directory
export OUTPUT_DIR="/home/user/diagnostics"
```

### No Data Collected

```bash
# Verify console is running
curl http://localhost:3000/api/status

# Check credentials
echo $ADMIN_USERNAME $ADMIN_PASSWORD

# Enable verbose output
set -x
./scripts/script-name.sh
```

## Contributing

When adding new diagnostic scripts:

1. Follow naming convention: `action-target.sh` or `test-feature.sh`
2. Add comprehensive documentation header
3. Support standard environment variables
4. Generate SUMMARY.txt in output directory
5. Use consistent exit codes
6. Update this README

## Related Documentation

- [Diagnostics Guide](../docs/DIAGNOSTICS-GUIDE.md) - Overview of all diagnostic tools
- [Browser Diagnostics](../docs/BROWSER-DIAGNOSTICS.md) - Frontend and API diagnostics
- [Plugin Install Diagnostics](../docs/PLUGIN-INSTALL-DIAGNOSTICS.md) - Plugin system testing
- [API Authentication Guide](../docs/API-AUTHENTICATION-GUIDE.md) - API and CSRF flow
