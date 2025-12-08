# Comprehensive Diagnostics Guide

## Overview

This repository includes a comprehensive suite of diagnostic tools designed to troubleshoot issues across the entire stack - from frontend rendering to backend APIs, RCON connectivity, and Minecraft server health.

## ✨ NEW: Enhanced Comprehensive Diagnostics (v3.0 - Script-Based)

The Comprehensive Plugin Manager Diagnostics workflow has been completely refactored for maintainability and extensibility:

**🚀 Fully Self-Dispatchable**
- Run directly from GitHub Actions UI - no manual file edits required
- No `if: secrets.*` errors that prevent workflow execution
- Graceful handling of missing secrets with clear explanations

**🔐 Smart Secret Detection**
- Runtime detection of available secrets using shell logic
- Automatic fallback for missing credentials
- Detailed reporting of which secrets are configured/missing
- Step-by-step guide for adding missing secrets securely

**📊 Enhanced Reporting (Now Script-Based!)**
- All summary generation logic moved to `scripts/generate-diagnostics-summary.sh`
- Workflow reduced by 775+ lines - much cleaner and maintainable
- Never hits YAML expression limits
- Comprehensive MASTER-SUMMARY.txt with secrets status
- Dedicated SECRETS-GUIDE.txt with detailed setup instructions
- Clear indication of which diagnostics ran vs. skipped
- Explanations for each skipped component

**🛠️ Extensible & Scriptable**
- All diagnostic logic in standalone scripts (no inline YAML)
- Easy to test, modify, and extend
- Environment-based configuration
- Can be run locally or in CI/CD
- Modular design allows adding new diagnostic types

**🔒 Security Best Practices**
- Secrets used safely via shell/env runtime (never in YAML conditions)
- SSH key generation and management guidance
- Password strength recommendations
- Access monitoring and rotation advice

**Documentation**: See enhanced workflow at `.github/workflows/comprehensive-plugin-manager-diagnostics.yml` and script at `scripts/generate-diagnostics-summary.sh`

---

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
- **NEW**: Secrets configuration status and usage documentation
- **NEW**: Detailed SECRETS-GUIDE.txt with setup instructions

**Smart Defaults**:
- All diagnostics enabled by default
- Headless browser mode
- 90-second resource monitoring
- Diagnose-only backend mode (safe)

**🆕 Self-Dispatchable (v2.0)**:
- **No manual workflow file changes required**
- **No `if: secrets.*` errors preventing execution**
- Runtime secret detection with graceful fallback
- Clear explanations for skipped steps
- Secure secrets management guidance

### Secrets Configuration

The workflow requires certain GitHub repository secrets for full functionality:

**For Browser & API Diagnostics**:
- `CONSOLE_ADMIN_USER` (optional - defaults to "admin")
- `CONSOLE_ADMIN_PASSWORD` (optional - defaults to "admin")

**For Backend & Resource Monitoring**:
- `SERVER_HOST` (required for remote access)
- `SERVER_USER` (required for remote access)
- `SSH_PRIVATE_KEY` (required for remote access)

**What happens without secrets?**
- Workflow still runs successfully ✅
- Local diagnostics (browser, API) work with defaults
- Remote diagnostics (backend, resources) are skipped
- Summary explains what was skipped and why
- SECRETS-GUIDE.txt provides step-by-step setup instructions

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
├── README.md                    # Markdown version for GitHub
└── SECRETS-GUIDE.txt            # 🆕 Detailed secrets configuration guide

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

## Extending the Diagnostics Platform

The diagnostics workflow is designed to be easily extensible. All diagnostic logic is in standalone scripts, making it simple to add new diagnostic types or modify existing ones.

### Architecture Overview

```
.github/workflows/
  └── comprehensive-plugin-manager-diagnostics.yml  # Main workflow (orchestration only)

scripts/
  ├── browser-diagnostics.js                       # Browser automation
  ├── api-profiler.sh                              # API endpoint testing
  ├── resource-monitor.sh                          # System resource monitoring
  ├── diagnose-plugins.sh                          # Basic plugin diagnostics
  ├── diagnose-plugins-advanced.sh                 # Advanced plugin diagnostics
  └── generate-diagnostics-summary.sh              # Summary/report generation
```

**Key Principles**:
1. **Workflow = Orchestration**: The YAML file only coordinates, never contains business logic
2. **Scripts = Logic**: All diagnostic and reporting logic lives in scripts
3. **Environment = Configuration**: Scripts read config from environment variables
4. **Shell = Secret Checks**: Runtime secret detection in shell, never in YAML `if:` conditions

### Adding a New Diagnostic Type

**Example**: Adding database diagnostics

**Step 1: Create the diagnostic script**

```bash
# scripts/database-diagnostics.sh
#!/bin/bash
set -euo pipefail

# Configuration from environment
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
OUTPUT_DIR="${OUTPUT_DIR:-/tmp/database-diagnostics-${RUN_NUMBER}}"

mkdir -p "${OUTPUT_DIR}"

# Run diagnostics
echo "Testing database connection..."
pg_isready -h "${DB_HOST}" -p "${DB_PORT}" > "${OUTPUT_DIR}/connection-test.txt"

echo "Checking database size..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -c "SELECT pg_database_size('minecraft');" \
  > "${OUTPUT_DIR}/database-size.txt"

# Generate summary
{
  echo "Database Diagnostics Summary"
  echo "============================="
  echo ""
  echo "Connection: $(cat "${OUTPUT_DIR}/connection-test.txt")"
  echo "Size: $(cat "${OUTPUT_DIR}/database-size.txt")"
} > "${OUTPUT_DIR}/SUMMARY.txt"

echo "✓ Database diagnostics complete"
```

**Step 2: Add workflow input**

```yaml
# In comprehensive-plugin-manager-diagnostics.yml
on:
  workflow_dispatch:
    inputs:
      # ... existing inputs ...
      
      run_database_diagnostics:
        description: 'Run database diagnostics'
        required: true
        type: boolean
        default: true
```

**Step 3: Add workflow step**

```yaml
# In workflow jobs
- name: Run database diagnostics
  if: github.event.inputs.run_database_diagnostics == 'true'
  env:
    DB_HOST: ${{ secrets.DB_HOST || 'localhost' }}
    DB_PORT: ${{ secrets.DB_PORT || '5432' }}
    OUTPUT_DIR: /tmp/comprehensive-database-diagnostics-${{ github.run_number }}
  run: |
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                 DATABASE DIAGNOSTICS                           ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    
    chmod +x scripts/database-diagnostics.sh
    scripts/database-diagnostics.sh || true
    
    echo "✓ Database diagnostics completed"
```

**Step 4: Add artifact upload**

```yaml
- name: Upload database diagnostics artifact
  uses: actions/upload-artifact@v4
  if: always() && github.event.inputs.run_database_diagnostics == 'true'
  with:
    name: database-diagnostics-${{ github.run_number }}
    path: /tmp/comprehensive-database-diagnostics-${{ github.run_number }}/
    retention-days: 30
```

**Step 5: Update summary script**

Edit `scripts/generate-diagnostics-summary.sh`:

```bash
# Add environment variable
RUN_DATABASE_DIAGNOSTICS="${RUN_DATABASE_DIAGNOSTICS:-true}"
DATABASE_DIAGNOSTICS_DIR="${DATABASE_DIAGNOSTICS_DIR:-/tmp/comprehensive-database-diagnostics-${RUN_NUMBER}}"

# In generate_master_summary():
if [ "${RUN_DATABASE_DIAGNOSTICS}" = "true" ]; then
    echo "✓ Database Diagnostics" >> "${output_file}"
else
    echo "○ Database Diagnostics (skipped)" >> "${output_file}"
fi

# Include database summary
if [ -f "${DATABASE_DIAGNOSTICS_DIR}/SUMMARY.txt" ]; then
    cat >> "${output_file}" << 'EOF'
┌─ DATABASE DIAGNOSTICS ────────────────────────────────────────┐
EOF
    cat "${DATABASE_DIAGNOSTICS_DIR}/SUMMARY.txt" >> "${output_file}"
    cat >> "${output_file}" << 'EOF'
└───────────────────────────────────────────────────────────────┘

EOF
fi
```

### Customizing Summary Generation

The `scripts/generate-diagnostics-summary.sh` script is modular and easy to customize:

**Add custom sections**:
```bash
# In generate_master_summary()
cat >> "${output_file}" << 'EOF'
════════════════════════════════════════════════════════════════
CUSTOM ANALYSIS SECTION
════════════════════════════════════════════════════════════════

Your custom analysis here...

EOF
```

**Add conditional content**:
```bash
# Only include if certain condition met
if [ "${CUSTOM_FEATURE_ENABLED}" = "true" ]; then
    echo "Custom feature results..." >> "${output_file}"
fi
```

**Include external data**:
```bash
# Pull data from external sources
curl -s "https://api.example.com/status" >> "${output_file}"
```

### Running Diagnostics Locally

All diagnostic scripts can be run locally for testing:

```bash
# Browser diagnostics
cd /path/to/repo
export CONSOLE_URL="http://localhost:3000"
export ADMIN_USERNAME="admin"
export ADMIN_PASSWORD="admin"
export OUTPUT_DIR="/tmp/my-diagnostics"
export HEADLESS="true"
node scripts/browser-diagnostics.js

# API profiling
export CONSOLE_URL="http://localhost:3000"
export ADMIN_USERNAME="admin"
export ADMIN_PASSWORD="admin"
export OUTPUT_DIR="/tmp/my-api-tests"
bash scripts/api-profiler.sh

# Summary generation
export OUTPUT_DIR="/tmp/my-summary"
export RUN_NUMBER="local-test"
export CONSOLE_URL="http://localhost:3000"
export RUN_BROWSER_DIAGNOSTICS="true"
export RUN_BACKEND_DIAGNOSTICS="false"
export RUN_API_PROFILING="true"
bash scripts/generate-diagnostics-summary.sh
```

### Testing Script Changes

Before committing changes to diagnostic scripts:

1. **Test locally**: Run the script with various configurations
2. **Verify output**: Check that all expected files are generated
3. **Test error cases**: Ensure graceful handling of failures
4. **Check summary**: Verify the summary includes your changes

```bash
# Example test sequence
cd /path/to/repo

# Test with full config
export RUN_NUMBER="test-001"
export OUTPUT_DIR="/tmp/test-diagnostics-001"
bash scripts/generate-diagnostics-summary.sh

# Verify files created
ls -lh "${OUTPUT_DIR}"

# Check summary content
cat "${OUTPUT_DIR}/MASTER-SUMMARY.txt"

# Test with minimal config
unset RUN_BROWSER_DIAGNOSTICS
export RUN_NUMBER="test-002"
export OUTPUT_DIR="/tmp/test-diagnostics-002"
bash scripts/generate-diagnostics-summary.sh
```

### Best Practices for Extensibility

1. **Keep scripts independent**: Each script should work standalone
2. **Use environment variables**: All config via env vars, no hardcoded values
3. **Generate structured output**: JSON/YAML for machine-readable, TXT for human-readable
4. **Include summaries**: Every diagnostic should produce a SUMMARY.txt
5. **Handle errors gracefully**: Use `|| true` for non-critical failures
6. **Document environment variables**: Comment required/optional vars in script headers
7. **Follow naming conventions**:
   - Scripts: `kebab-case.sh` or `.js`
   - Output dirs: `/tmp/comprehensive-{type}-diagnostics-${RUN_NUMBER}`
   - Artifacts: `{type}-diagnostics-${RUN_NUMBER}`
8. **Version your changes**: Update version in script comments when making changes

### Example: Custom Report Format

Want PDF reports? JSON export? Email notifications? Easy!

```bash
# scripts/generate-diagnostics-pdf.sh
#!/bin/bash
set -euo pipefail

# Read the text summary
SUMMARY="/tmp/comprehensive-summary/MASTER-SUMMARY.txt"

# Convert to PDF using pandoc or similar
pandoc "${SUMMARY}" -o "/tmp/diagnostics-report.pdf" \
  --pdf-engine=wkhtmltopdf \
  --variable geometry:margin=1in

echo "✓ PDF report generated: /tmp/diagnostics-report.pdf"
```

```yaml
# Add to workflow
- name: Generate PDF report
  if: always()
  run: |
    sudo apt-get update && sudo apt-get install -y pandoc wkhtmltopdf
    chmod +x scripts/generate-diagnostics-pdf.sh
    scripts/generate-diagnostics-pdf.sh

- name: Upload PDF report
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: diagnostics-report-pdf-${{ github.run_number }}
    path: /tmp/diagnostics-report.pdf
```

### Integrating with External Tools

**Send to Slack**:
```bash
# In workflow or script
curl -X POST -H 'Content-type: application/json' \
  --data "{\"text\":\"Diagnostics completed: View at ${WORKFLOW_URL}\"}" \
  "${SLACK_WEBHOOK_URL}"
```

**Upload to S3**:
```bash
# Archive and upload
aws s3 cp ./comprehensive-summary/ \
  "s3://diagnostics-bucket/run-${RUN_NUMBER}/" \
  --recursive
```

**Create GitHub Issue**:
```bash
# If critical errors found
if grep -q "CRITICAL" "${OUTPUT_DIR}/SUMMARY.txt"; then
  gh issue create \
    --title "Critical diagnostic findings in run #${RUN_NUMBER}" \
    --body-file "${OUTPUT_DIR}/SUMMARY.txt" \
    --label "bug,diagnostics"
fi
```

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
