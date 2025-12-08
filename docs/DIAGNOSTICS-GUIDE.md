# Comprehensive Diagnostics Guide

## Overview

This repository includes a comprehensive suite of diagnostic tools designed to troubleshoot issues across the entire stack - from frontend rendering to backend APIs, RCON connectivity, and Minecraft server health.

## Diagnostic Tools Matrix

| Tool | Purpose | Scope | When to Use |
|------|---------|-------|-------------|
| **Comprehensive Diagnostics** | **All-in-one testing** | **Full stack** | **Complex issues, complete health checks, production validation** |
| **Browser Diagnostics** | Frontend debugging | Plugin Manager UI | Unresponsive pages, JS errors, rendering issues |
| **API Profiling** | Backend API testing | REST endpoints | API failures, slow responses, CSRF issues |
| **Plugin Install Diagnostics** | Plugin system testing | Plugin installation | Plugin install failures, permission issues |
| **Console Diagnostics** | RCON & session testing | Console backend | RCON failures, session issues, auth problems |
| **Resource Monitoring** | System resource tracking | Infrastructure | Performance issues, resource exhaustion |

## Quick Start

### For Complete System Diagnostics (Recommended)

**Symptoms**: Any issue, production health check, post-deployment validation, complex problems

**Use**: Comprehensive Plugin Manager Diagnostics ⭐ **NEW**
```bash
# Via GitHub Actions (Recommended)
Actions → Comprehensive Plugin Manager Diagnostics → Run workflow

# Toggleable features:
# - Browser diagnostics (Puppeteer automation)
# - Backend diagnostics (plugin manager checks)
# - API profiling (endpoint performance)
# - Resource monitoring (CPU, memory, Docker)
```

**What it provides**:
- Master summary with rapid triage guide
- All diagnostic artifacts in one run
- Cross-referenced findings
- Actionable debugging recommendations
- Complete health snapshot

**When to use**:
- You're not sure where the problem is
- Need comprehensive production validation
- Post-deployment health check
- Before major changes
- Complex issues requiring multiple perspectives

**Documentation**: See workflow at `.github/workflows/comprehensive-plugin-manager-diagnostics.yml`

---

### For Frontend/Plugin Manager Issues

**Symptoms**: Page won't load, JavaScript errors, unresponsive UI, plugin list not showing

**Use**: Browser Diagnostics
```bash
# Via GitHub Actions
Actions → Browser Diagnostics - Plugin Manager → Run workflow

# Or manually
CONSOLE_URL="http://localhost:3000" \
ADMIN_USERNAME="admin" \
ADMIN_PASSWORD="your-password" \
node scripts/browser-diagnostics.js
```

**Documentation**: [BROWSER-DIAGNOSTICS.md](./BROWSER-DIAGNOSTICS.md)

### For API/Backend Issues

**Symptoms**: 403 errors, CSRF failures, API timeouts, authentication problems

**Use**: API Profiling
```bash
# Via script
CONSOLE_URL="http://localhost:3000" \
ADMIN_USERNAME="admin" \
ADMIN_PASSWORD="your-password" \
./scripts/api-profiler.sh
```

**Documentation**: [BROWSER-DIAGNOSTICS.md](./BROWSER-DIAGNOSTICS.md#api-profiling)

### For Plugin Installation Issues

**Symptoms**: Plugins won't install, permission errors, corrupted plugins.json

**Use**: Plugin Install Diagnostics
```bash
# Via GitHub Actions
Actions → Plugin Install Diagnostics (Comprehensive) → Run workflow
```

**Documentation**: [PLUGIN-INSTALL-DIAGNOSTICS.md](./PLUGIN-INSTALL-DIAGNOSTICS.md)

### For RCON/Console Backend Issues

**Symptoms**: Can't send commands, RCON password errors, console disconnected

**Use**: Console Diagnostics
```bash
# Via GitHub Actions
Actions → Console & RCON Diagnostics → Run workflow
# Select: rcon-test, console-health, or full-diagnostics
```

**Documentation**: See workflow `.github/workflows/console-diagnostics.yml`

### For Performance/Resource Issues

**Symptoms**: High CPU/memory, container crashes, slow page loads

**Use**: Resource Monitoring
```bash
# During page load or testing
MONITOR_DURATION=60 \
CONTAINER_NAME="minecraft-console" \
./scripts/resource-monitor.sh
```

**Documentation**: [BROWSER-DIAGNOSTICS.md](./BROWSER-DIAGNOSTICS.md#resource-monitoring)

## Diagnostic Workflow Decision Tree

```
Issue reported
    │
    ├─ Frontend/UI issue? ──→ Browser Diagnostics
    │   ├─ Page won't load
    │   ├─ JavaScript errors
    │   ├─ Unresponsive buttons
    │   └─ Visual glitches
    │
    ├─ API/Backend issue? ──→ API Profiling + Console Diagnostics
    │   ├─ 403/401 errors
    │   ├─ CSRF failures
    │   ├─ Session problems
    │   └─ Slow responses
    │
    ├─ Plugin issue? ──→ Plugin Install Diagnostics
    │   ├─ Install failures
    │   ├─ Corrupted data
    │   ├─ Permission errors
    │   └─ Plugin not appearing
    │
    ├─ RCON issue? ──→ Console Diagnostics
    │   ├─ Can't send commands
    │   ├─ Password mismatch
    │   ├─ Connection refused
    │   └─ Container unhealthy
    │
    └─ Performance issue? ──→ Resource Monitoring + Browser Diagnostics
        ├─ High CPU
        ├─ High memory
        ├─ Slow page load
        └─ Container crashes
```

## NEW: Comprehensive Diagnostics Workflow

The **Comprehensive Plugin Manager Diagnostics** workflow (`.github/workflows/comprehensive-plugin-manager-diagnostics.yml`) combines all diagnostic tools into a single, coordinated run. This is the **recommended starting point** for most troubleshooting scenarios.

### Features

**Unified Execution**:
- All diagnostics run in a coordinated sequence
- Resource monitoring captures activity from all tests
- Single workflow run = complete diagnostic picture

**Toggleable Components**:
- Enable/disable individual diagnostic types via workflow inputs
- Customize monitoring duration and intervals
- Choose backend diagnostic mode (diagnose vs fix)

**Master Aggregation**:
- Comprehensive master summary combining all results
- Rapid triage guide with prioritized debugging steps
- Common problem patterns with solutions
- Cross-referenced artifacts

**Smart Defaults**:
- All diagnostics enabled by default
- Headless browser mode
- 90-second resource monitoring
- Diagnose-only backend mode (safe)

### How to Use

1. **Navigate to GitHub Actions**
   - Go to repository → Actions tab
   - Select "Comprehensive Plugin Manager Diagnostics"
   - Click "Run workflow"

2. **Configure Options** (optional)
   - Console URL (defaults to deployed console)
   - Toggle diagnostic components (browser, backend, API, resources)
   - Set backend mode (diagnose or fix)
   - Configure monitoring duration/interval

3. **Review Results**
   - Download `comprehensive-summary-{run-number}` artifact first
   - Read `MASTER-SUMMARY.txt` for rapid triage guide
   - Follow debugging recommendations
   - Review specific artifacts as directed

### Artifact Structure

When the comprehensive workflow completes, you'll get these artifacts:

```
comprehensive-summary-{run-number}/
├── MASTER-SUMMARY.txt          # Start here - complete overview
└── README.md                    # Markdown version for GitHub

browser-diagnostics-{run-number}/
├── SUMMARY.txt                  # Browser test results
├── console-errors.json          # JavaScript errors
├── network-requests.json        # API calls and timing
├── performance-metrics.json     # Load times, FPS
├── dom-analysis.json            # DOM complexity
└── screenshots/                 # Visual state captures

backend-diagnostics-basic-{run-number}/
├── summary.log                  # Basic diagnostic results
├── issues.log                   # Detected problems
├── fixes.log                    # Auto-fixes applied (if mode=fix)
└── manual-actions.log           # Manual steps required

backend-diagnostics-advanced-{run-number}/
├── summary.log                  # Advanced diagnostic results
├── dependency-analysis.json     # Plugin dependencies
└── config-validation.log        # Configuration checks

api-profiling-{run-number}/
├── SUMMARY.txt                  # API performance overview
├── *-response.json              # Endpoint responses
├── *-timing.txt                 # Timing breakdowns
└── cookies.txt                  # Session/CSRF state

resource-monitoring-{run-number}/
├── SUMMARY.txt                  # Resource usage overview
├── system-resources.log         # CPU/memory over time
├── container-stats.log          # Docker container metrics
└── network-connections.log      # Network activity
```

### Rapid Triage Guide

The master summary includes a prioritized debugging workflow:

1. **Frontend Issues** → Start with browser-diagnostics
2. **Backend Issues** → Start with backend-diagnostics-basic
3. **API Issues** → Start with api-profiling
4. **Resource Issues** → Start with resource-monitoring

Each section provides:
- What to check first
- What to look for
- Where to find the data
- How to interpret results

### Example Scenarios

**Scenario 1: Complete Production Health Check**
```yaml
Inputs:
  - run_browser_diagnostics: true
  - run_backend_diagnostics: true
  - run_api_profiling: true
  - run_resource_monitoring: true
  - backend_mode: diagnose
  - monitor_duration: 120

Result: Complete system snapshot with no modifications
```

**Scenario 2: Fix Backend Issues**
```yaml
Inputs:
  - run_browser_diagnostics: false
  - run_backend_diagnostics: true
  - run_api_profiling: false
  - run_resource_monitoring: false
  - backend_mode: fix

Result: Backend diagnostics with auto-fix applied
```

**Scenario 3: Performance Investigation**
```yaml
Inputs:
  - run_browser_diagnostics: true
  - run_backend_diagnostics: false
  - run_api_profiling: true
  - run_resource_monitoring: true
  - monitor_duration: 180
  - monitor_interval: 1

Result: Detailed performance and resource data
```

## Integration Between Tools

The diagnostic tools work together to provide full-stack visibility:

### Example: Debugging Plugin Install Failure

1. **Start with Plugin Install Diagnostics**
   - Captures full backend flow
   - Tests CSRF, session, permissions
   - Shows exact failure point

2. **If frontend issue suspected**
   - Run Browser Diagnostics
   - Check for JavaScript errors
   - Verify API calls being made

3. **If performance related**
   - Run Resource Monitoring
   - Check CPU/memory during install
   - Verify no resource exhaustion

4. **If RCON involved**
   - Run Console Diagnostics
   - Verify RCON connectivity
   - Check server restart capability

### Example: Debugging Unresponsive Page

1. **Start with Browser Diagnostics**
   - Capture console errors
   - Check network requests
   - Analyze DOM complexity
   - Review performance metrics

2. **If API calls failing**
   - Run API Profiling
   - Test CSRF token flow
   - Verify session validity

3. **If resources exhausted**
   - Run Resource Monitoring
   - Check CPU/memory spikes
   - Review container stats

## Common Diagnostic Patterns

### Pattern 1: 403 CSRF Errors

**Run**:
1. Browser Diagnostics (check token fetch)
2. API Profiling (verify CSRF flow)
3. Plugin Install Diagnostics (test install with CSRF)

**Look for**:
- Missing `x-csrf-token` header in requests
- CSRF token not being fetched
- Cookie not being set
- Session cookie missing

### Pattern 2: Page Load Timeout

**Run**:
1. Browser Diagnostics (capture load state)
2. Resource Monitoring (check system resources)
3. API Profiling (identify slow endpoints)

**Look for**:
- JavaScript errors preventing initialization
- API calls hanging
- High CPU/memory usage
- Network timeouts

### Pattern 3: Plugin Install Fails

**Run**:
1. Plugin Install Diagnostics (comprehensive test)
2. Browser Diagnostics (check frontend errors)
3. Console Diagnostics (verify backend health)

**Look for**:
- Permission errors on files/directories
- CSRF validation failures
- Session expiration
- Backend crashes

## Artifact Analysis Guide

### Browser Diagnostics Artifacts

**Start with**: `SUMMARY.txt`
- Shows error count, failed requests, performance overview
- Points to specific issues

**Then check**:
- `errors.json` → JavaScript exceptions
- `network-requests.json` → API call failures
- `screenshot-*.png` → Visual state
- `performance-metrics.json` → Load times

### API Profiling Artifacts

**Start with**: `SUMMARY.txt`
- Shows response times for all endpoints
- Identifies slow or failing APIs

**Then check**:
- `*-response.json` → Error messages
- `*-timing.txt` → Timing breakdown
- `cookies.txt` → Session/CSRF cookies

### Resource Monitoring Artifacts

**Start with**: `SUMMARY.txt`
- Shows average and peak usage
- Identifies resource spikes

**Then check**:
- `system-resources.log` → CPU/memory over time
- `docker-stats.log` → Container resources
- `network-connections.log` → Network activity

## Automation & CI/CD

### Scheduled Diagnostics

Consider running diagnostics on a schedule:

```yaml
# Add to workflow
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
```

### Pre-Deployment Validation

Run diagnostics before deployments:

```yaml
# Add as required check
jobs:
  validate:
    steps:
      - name: Run browser diagnostics
        uses: ./.github/workflows/browser-diagnostics.yml
```

### Regression Testing

Use diagnostics for regression testing:
- Save baseline diagnostics after each release
- Compare new runs against baseline
- Alert on performance degradation

## Troubleshooting the Diagnostics

### Browser Diagnostics Won't Run

**Check**:
- Puppeteer installed: `npm list puppeteer`
- System dependencies installed (see BROWSER-DIAGNOSTICS.md)
- Console URL accessible
- Valid credentials

### API Profiling Shows All Failures

**Check**:
- Console is running
- URL is correct
- Credentials are valid
- Network connectivity

### Resource Monitoring Returns No Data

**Check**:
- Docker is installed
- Container name is correct
- Required commands available (top, free, netstat)
- Permissions to access Docker

### No Artifacts Uploaded

**Check**:
- Workflow completed successfully
- OUTPUT_DIR has write permissions
- Files were actually generated
- Artifact upload step ran

## Best Practices

### When to Run Diagnostics

- **After code changes**: Verify no regressions
- **Before releases**: Ensure stability
- **On user reports**: Reproduce and debug issues
- **Periodic health checks**: Catch issues early

### Data Retention

- **Keep**: Critical issue diagnostics indefinitely
- **Archive**: Weekly health check results for 90 days
- **Delete**: Development test runs after 7 days

### Security Considerations

- Never commit diagnostic artifacts to git
- Redact sensitive data before sharing
- Use artifacts only for authorized debugging
- Clean up artifacts after issue resolution

## Future Enhancements

Planned improvements:
- [ ] Real-time monitoring dashboard
- [ ] Automated regression testing
- [ ] Performance budgets and alerts
- [ ] Comparison reports between runs
- [ ] Integration with external monitoring
- [ ] Lighthouse performance audits
- [ ] Accessibility testing
- [ ] Visual regression testing
- [ ] Load testing integration
- [ ] APM (Application Performance Monitoring)

## Support & Contributing

### Getting Help

1. Check this guide and specific tool documentation
2. Review relevant artifacts from diagnostic runs
3. Search existing issues for similar problems
4. File new issue with diagnostic data attached

### Contributing Improvements

- Add new diagnostic scenarios
- Improve artifact analysis automation
- Enhance documentation
- Report bugs in diagnostic tools

## Related Documentation

- [Browser Diagnostics Guide](./BROWSER-DIAGNOSTICS.md) - Frontend and API diagnostics
- [Plugin Install Diagnostics](./PLUGIN-INSTALL-DIAGNOSTICS.md) - Plugin system testing
- [API Authentication Guide](./API-AUTHENTICATION-GUIDE.md) - API and CSRF flow
- [Session & CSRF Debug](./SESSION-CSRF-DEBUG-IMPLEMENTATION.md) - Backend debugging

## Quick Reference Commands

```bash
# Browser diagnostics
node scripts/browser-diagnostics.js

# API profiling
./scripts/api-profiler.sh

# Resource monitoring
./scripts/resource-monitor.sh

# In browser console
window.PluginManagerDiagnostics.export()
window.PluginManagerDiagnostics.download()

# Check diagnostic status
ls -lh /tmp/browser-diagnostics-*/
ls -lh /tmp/api-profiler-*/
ls -lh /tmp/resource-monitor-*/
```
