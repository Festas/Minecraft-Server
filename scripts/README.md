# Scripts Directory

This directory contains diagnostic, testing, and utility scripts for the Minecraft Server console and plugin manager.

## Quick Start

### Using the Wrapper Script (Recommended)

The easiest way to run scripts is through the unified wrapper:

```bash
# List all available scripts
./scripts/run.sh --list

# Get help
./scripts/run.sh --help

# Run a diagnostic script
./scripts/run.sh diagnostics browser
./scripts/run.sh diagnostics plugins diagnose

# Run an API test
./scripts/run.sh api-test profiler

# Run a utility
./scripts/run.sh utility rcon-validate
```

### Direct Execution

You can also run scripts directly:

```bash
# Bash scripts
./scripts/diagnostics/diagnose-plugins.sh diagnose

# JavaScript scripts
node scripts/diagnostics/browser-diagnostics.js
```

## Directory Organization

Scripts are organized into categories:

```
scripts/
├── run.sh                    # Unified wrapper script (use this!)
├── README.md                 # This file
├── DEVELOPMENT.md            # Script development guide
├── upgrade.sh                # Server upgrade automation
├── validate-launch.sh        # Pre-launch validation
├── diagnostics/              # Diagnostic and troubleshooting scripts
│   ├── README.md
│   ├── browser-diagnostics.js
│   ├── diagnose-plugins.sh
│   ├── diagnose-plugins-advanced.sh
│   ├── diagnose.sh
│   ├── resource-monitor.sh
│   └── generate-diagnostics-summary.sh
├── api-testing/              # API testing and profiling scripts
│   ├── README.md
│   ├── api-profiler.sh
│   ├── test-api-auth.sh
│   ├── test-api-integration.sh
│   └── test-csrf-double-submit.sh
├── utilities/                # Utility and management scripts
│   ├── README.md
│   ├── competition-manager.sh
│   ├── validate-rcon-password.sh
│   └── migrate-users.js
└── lib/                      # Shared libraries
    ├── README.md
    ├── plugin-install-diagnostics-lib.sh
    └── plugin-install-test-scenarios.sh
```

## Scripts by Category

### Diagnostic Scripts (`diagnostics/`)

Diagnostic and troubleshooting tools.

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `browser-diagnostics.js` | Browser automation testing with Puppeteer | Frontend errors, performance issues, JavaScript problems |
| `diagnose-plugins.sh` | Basic plugin manager diagnostics | Plugin installation issues, file permissions |
| `diagnose-plugins-advanced.sh` | Advanced plugin diagnostics | Complex plugin issues, detailed analysis |
| `diagnose.sh` | General server diagnostics | Docker issues, configuration problems |
| `resource-monitor.sh` | System resource monitoring | Performance profiling, resource usage tracking |
| `generate-diagnostics-summary.sh` | Master summary generation | Aggregating diagnostic results (used by workflows) |

**Quick Reference:**
```bash
# Browser diagnostics
./scripts/run.sh diagnostics browser

# Plugin diagnostics
./scripts/run.sh diagnostics plugins diagnose
./scripts/run.sh diagnostics plugins-advanced

# Resource monitoring
./scripts/run.sh diagnostics resource-monitor
```

See [diagnostics/README.md](diagnostics/README.md) for details.

### API Testing Scripts (`api-testing/`)

API endpoint testing and profiling.

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `api-profiler.sh` | Comprehensive API profiling | Performance testing, endpoint validation |
| `test-api-auth.sh` | Authentication flow testing | Login issues, session problems |
| `test-api-integration.sh` | End-to-end API testing | Integration testing, complete flow validation |
| `test-csrf-double-submit.sh` | CSRF protection testing | Security testing, CSRF debugging |

**Quick Reference:**
```bash
# API profiling
./scripts/run.sh api-test profiler

# Authentication test
./scripts/run.sh api-test auth

# Integration test
./scripts/run.sh api-test integration
```

See [api-testing/README.md](api-testing/README.md) for details.

### Utility Scripts (`utilities/`)

Management and administration utilities.

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `competition-manager.sh` | Build competition management | Managing competitions, themes |
| `validate-rcon-password.sh` | RCON password validation | RCON connectivity issues |
| `migrate-users.js` | User data migration | Database migrations, user operations |

**Quick Reference:**
```bash
# RCON validation
./scripts/run.sh utility rcon-validate

# Competition management
./scripts/run.sh utility competition

# User migration
./scripts/run.sh utility migrate-users
```

See [utilities/README.md](utilities/README.md) for details.

### Library Scripts (`lib/`)

Shared functions and test scenarios used by other scripts.

| Script | Purpose |
|--------|---------|
| `plugin-install-diagnostics-lib.sh` | Shared diagnostic functions |
| `plugin-install-test-scenarios.sh` | Plugin install test scenarios |

**Note:** Library scripts are not meant to be run directly.

See [lib/README.md](lib/README.md) for details.

### Top-Level Scripts

| Script | Purpose |
|--------|---------|
| `run.sh` | Unified wrapper for all scripts |
| `upgrade.sh` | Automated server upgrade with backup and rollback |
| `validate-launch.sh` | Pre-launch validation with comprehensive checks |

## Common Workflows

### Quick Diagnostics

For quick health checks:

```bash
# Check plugin manager
./scripts/run.sh diagnostics plugins diagnose

# Check API
./scripts/run.sh api-test auth
```

### Complete Diagnostics

For comprehensive troubleshooting, use the GitHub Actions workflow:

```
Actions → Comprehensive Plugin Manager Diagnostics → Run workflow
```

This runs all diagnostic scripts in a coordinated manner and generates a master summary with triage guide.

Alternatively, run manually:

```bash
# 1. Start resource monitoring
./scripts/run.sh diagnostics resource-monitor &

# 2. Run browser diagnostics
./scripts/run.sh diagnostics browser

# 3. Run API profiling
./scripts/run.sh api-test profiler

# 4. Review results
cat /tmp/browser-diagnostics/SUMMARY.txt
cat /tmp/api-profiler/SUMMARY.txt
cat /tmp/resource-monitor/SUMMARY.txt
```

### Debugging Plugin Issues

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

### API Performance Testing

```bash
# Run comprehensive profiler
./scripts/run.sh api-test profiler

# Review timing results
cat /tmp/api-profiler/SUMMARY.txt
```

## Prerequisites

### System Requirements

- **OS:** Linux (Ubuntu/Debian recommended)
- **Shell:** Bash 4.0+
- **Node.js:** 18+ (for JavaScript scripts)
- **Docker:** For container operations

### Tool Requirements

Most scripts require standard Unix tools:

- `curl` - API requests and HTTP operations
- `jq` - JSON parsing (optional but recommended)
- `grep`, `awk`, `sed` - Text processing

Browser diagnostics additionally requires:

- Puppeteer (auto-installed via npm)
- System libraries (libnss3, libatk1.0-0, etc.)

### Installation

```bash
# Install Node.js and npm (if not present)
sudo apt-get update
sudo apt-get install -y nodejs npm

# Install Puppeteer for browser diagnostics
cd console/backend
npm install puppeteer

# Install system dependencies for Puppeteer
sudo apt-get install -y \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
  libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2
```

## Environment Variables

Common environment variables used across scripts:

| Variable | Description | Default | Used By |
|----------|-------------|---------|---------|
| `CONSOLE_URL` | Console base URL | `http://localhost:3000` | Most scripts |
| `ADMIN_USERNAME` | Admin username | `admin` | Auth/API scripts |
| `ADMIN_PASSWORD` | Admin password | Required | Auth/API scripts |
| `OUTPUT_DIR` | Output directory | `/tmp/[script-name]` | All scripts |
| `TIMEOUT` | Request timeout (ms) | `30000` | Browser/API scripts |
| `HEADLESS` | Run browser headless | `true` | Browser diagnostics |
| `MONITOR_DURATION` | Monitor duration (s) | `30` | Resource monitor |
| `MONITOR_INTERVAL` | Monitor interval (s) | `1` | Resource monitor |

## Output Structure

All diagnostic and test scripts create structured output:

```
/tmp/[script-name]-[timestamp]/
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
- `1` - Errors detected or operation failed
- `2` - Invalid arguments or configuration

## Troubleshooting

### Script Won't Execute

```bash
# Make scripts executable
chmod +x scripts/**/*.sh

# Verify shebang
head -1 scripts/diagnostics/diagnose-plugins.sh
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

### Permission Issues

```bash
# Check output directory permissions
ls -ld /tmp/

# Use custom output directory
export OUTPUT_DIR="/home/user/diagnostics"
mkdir -p "$OUTPUT_DIR"
```

### Connection Issues

```bash
# Verify console is running
curl http://localhost:3000/api/status

# Check environment variables
echo $CONSOLE_URL $ADMIN_USERNAME

# Test with explicit values
CONSOLE_URL="http://localhost:3000" ./scripts/run.sh diagnostics plugins diagnose
```

## Contributing

When adding new scripts:

1. Review [DEVELOPMENT.md](DEVELOPMENT.md) for standards
2. Choose appropriate category directory
3. Follow naming conventions
4. Add comprehensive header comments
5. Update category README
6. Add to wrapper script if user-facing
7. Test thoroughly
8. Submit pull request

See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed guidelines.

## Related Documentation

### Guides
- [DEVELOPMENT.md](DEVELOPMENT.md) - Script development guide
- [diagnostics/README.md](diagnostics/README.md) - Diagnostics scripts guide
- [api-testing/README.md](api-testing/README.md) - API testing scripts guide
- [utilities/README.md](utilities/README.md) - Utility scripts guide
- [lib/README.md](lib/README.md) - Library scripts guide

### Documentation
- [docs/troubleshooting/diagnostics-guide.md](../docs/troubleshooting/diagnostics-guide.md) - Complete diagnostics guide
- [docs/troubleshooting/browser-diagnostics.md](../docs/troubleshooting/browser-diagnostics.md) - Browser diagnostics details
- [docs/troubleshooting/plugin-diagnostics.md](../docs/troubleshooting/plugin-diagnostics.md) - Plugin diagnostics details
- [docs/admin/admin-guide.md](../docs/admin/admin-guide.md) - Administration guide

### Workflows
- [.github/workflows/comprehensive-plugin-manager-diagnostics.yml](../.github/workflows/comprehensive-plugin-manager-diagnostics.yml) - Comprehensive diagnostics workflow
- [.github/workflows/browser-diagnostics.yml](../.github/workflows/browser-diagnostics.yml) - Browser diagnostics workflow
- [.github/workflows/plugin-install-diagnose.yml](../.github/workflows/plugin-install-diagnose.yml) - Plugin install diagnostics workflow
