[← Back to Troubleshooting](./README.md) | [Documentation Hub](../README.md)

---

# Browser Diagnostics Guide

## Overview

The Browser Diagnostics system provides comprehensive debugging and monitoring capabilities for the Plugin Manager frontend. It combines browser automation, API profiling, resource monitoring, and frontend instrumentation to help diagnose unresponsive pages, JavaScript errors, network issues, and performance bottlenecks.

## Components

### 1. Browser Automation (Puppeteer)

Automated browser testing that captures:
- **Console Errors & Warnings**: All JavaScript errors, warnings, and exceptions
- **Network Requests**: Complete request/response logs with timing data
- **Performance Metrics**: Page load times, DOM ready, time to interactive
- **DOM Complexity**: Element counts, nesting depth, plugin/history element tracking
- **Screenshots**: Visual snapshots at key stages (login, page load, interactions)

### 2. Frontend Diagnostics Module

JavaScript module (`diagnostics.js`) that provides:
- **Global Error Trapping**: Catches all unhandled errors and promise rejections
- **Console Interception**: Records all console.log/warn/error calls
- **Fetch Monitoring**: Tracks all API requests with timing data
- **DOM Analysis**: Periodic snapshots of DOM complexity
- **Manual Debug Dump**: Export diagnostics via UI button or console command

### 3. API Profiling

Shell script that tests all major API endpoints:
- **Authentication Flow**: Login, session check, CSRF token
- **Plugin APIs**: List plugins, history, install operations
- **RCON APIs**: Server status, players list
- **Error Cases**: Invalid credentials, missing CSRF, malformed requests
- **Timing Data**: Response times for each endpoint

### 4. Resource Monitoring

Tracks system resources during page load:
- **CPU Usage**: System-wide and container-specific
- **Memory Usage**: Total, used, free, and percentage
- **Docker Stats**: Container resource consumption
- **Network Connections**: Active connections and listening ports
- **Process List**: Top CPU and memory consumers

## Running Diagnostics

### Via GitHub Actions Workflow

The most comprehensive way to run diagnostics:

1. Go to **Actions** → **Browser Diagnostics - Plugin Manager**
2. Click **Run workflow**
3. Configure options:
   - **console_url**: URL to test (defaults to deployed console)
   - **run_resource_monitor**: Enable resource monitoring (default: true)
   - **run_api_profiler**: Enable API profiling (default: true)
   - **headless**: Run browser in headless mode (default: true)
4. Click **Run workflow**

The workflow will:
- Install Puppeteer and dependencies
- Run browser automation tests
- Profile all API endpoints
- Monitor system resources during page load
- Generate comprehensive summary report
- Upload all artifacts for download

### Manual Browser Diagnostics

Run the browser diagnostics script locally:

```bash
# Set environment variables
export CONSOLE_URL="http://localhost:3000"
export ADMIN_USERNAME="admin"
export ADMIN_PASSWORD="your-password"
export OUTPUT_DIR="/tmp/browser-diagnostics"
export HEADLESS="true"

# Install dependencies
cd console/backend
npm install puppeteer

# Run diagnostics
node ../../scripts/diagnostics/browser-diagnostics.js
```

### Manual API Profiling

Run the API profiler script:

```bash
# Set environment variables
export CONSOLE_URL="http://localhost:3000"
export ADMIN_USERNAME="admin"
export ADMIN_PASSWORD="your-password"
export OUTPUT_DIR="/tmp/api-profiler"

# Run profiler
./scripts/api-testing/api-profiler.sh
```

### Manual Resource Monitoring

Run the resource monitor during testing:

```bash
# Set environment variables
export OUTPUT_DIR="/tmp/resource-monitor"
export MONITOR_DURATION=60  # seconds
export MONITOR_INTERVAL=2   # seconds
export CONTAINER_NAME="minecraft-console"

# Run monitor
./scripts/diagnostics/resource-monitor.sh
```

### Frontend Debug Button

Use the debug button in the Plugin Manager UI:

1. Open `/console/plugins.html`
2. Click the **🐛 Debug** button in the bottom-right corner
3. View diagnostics in browser console
4. Optionally download as JSON file

### Console Commands

Access diagnostics programmatically in browser console:

```javascript
// Export full diagnostics report to console
window.PluginManagerDiagnostics.export();

// Download diagnostics as JSON file
window.PluginManagerDiagnostics.download();

// Analyze current DOM complexity
window.PluginManagerDiagnostics.analyzeDOMComplexity();

// Get current performance metrics
window.PluginManagerDiagnostics.measurePerformance();

// Mark a performance point
window.PluginManagerDiagnostics.mark('custom-marker');

// Access raw diagnostic data
console.log(window.PluginManagerDiagnostics.errors);
console.log(window.PluginManagerDiagnostics.networkRequests);
console.log(window.PluginManagerDiagnostics.consoleHistory);
```

## Diagnostic Artifacts

### Browser Diagnostics Artifact

Contains:
- `SUMMARY.txt` - Overview of errors, warnings, performance
- `console-messages.json` - All console logs
- `network-requests.json` - All network activity with timings
- `errors.json` - All JavaScript errors and exceptions
- `warnings.json` - All warnings
- `performance-metrics.json` - Page load and timing data
- `dom-complexity.json` - DOM structure analysis
- `element-checks.json` - Plugin-specific element verification
- `screenshot-*.png` - Visual snapshots

### API Profiling Artifact

Contains:
- `SUMMARY.txt` - Response times and status codes
- `*-response.json` - API response bodies
- `*-headers.txt` - HTTP headers
- `*-timing.txt` - Detailed curl timing data
- `cookies.txt` - Session cookie data

### Resource Monitoring Artifact

Contains:
- `SUMMARY.txt` - Average and peak resource usage
- `system-resources.log` - CPU, memory, load average over time
- `docker-stats.log` - Container resource consumption
- `network-connections.log` - Network activity
- `process-list.txt` - Running processes snapshot

## Root Cause Analysis

### For Unresponsive Pages

1. **Check browser-diagnostics SUMMARY.txt** for JavaScript errors
2. **Review screenshots** to see if page rendered
3. **Examine performance-metrics.json** for excessive load times
4. **Check dom-complexity.json** for abnormally high element counts
5. **Review console-messages.json** for infinite loops or repeated errors

### For API Failures

1. **Check api-profiling SUMMARY.txt** for failed requests
2. **Review specific *-response.json** files for error messages
3. **Examine *-timing.txt** for slow responses
4. **Check CSRF token flow** in authentication test scenarios
5. **Review network-requests.json** in browser diagnostics

### For Performance Issues

1. **Check performance-metrics.json** for page load breakdown
2. **Review resource-monitoring SUMMARY.txt** for CPU/memory spikes
3. **Examine docker-stats.log** for container resource limits
4. **Check network-requests.json** for slow API calls
5. **Review dom-complexity.json** for excessive DOM size

### For Network Issues

1. **Check network-requests.json** for failed requests
2. **Review network-connections.log** for connection problems
3. **Examine api-profiling timing** for network latency
4. **Check screenshot-*.png** for loading states

## Common Issues and Solutions

### Issue: Page Load Never Completes

**Symptoms:**
- Screenshots show loading spinner
- Performance metrics show very high load time
- DOM complexity shows minimal elements

**Debug:**
1. Check `errors.json` for JavaScript exceptions during load
2. Review `network-requests.json` for hanging API calls
3. Examine `console-messages.json` for error loops

**Solutions:**
- Fix JavaScript errors preventing page initialization
- Check API endpoint availability
- Verify CSRF token is being fetched

### Issue: High Memory Usage

**Symptoms:**
- Resource monitoring shows increasing memory
- Browser becomes slow or crashes
- DOM complexity shows thousands of elements

**Debug:**
1. Check `dom-complexity.json` for element count growth
2. Review `console-messages.json` for repeated operations
3. Examine `performance-metrics.json` for memory stats

**Solutions:**
- Fix memory leaks in JavaScript
- Reduce DOM manipulation frequency
- Implement virtual scrolling for large lists

### Issue: API Calls Failing

**Symptoms:**
- Network requests show 403/401 errors
- Plugin operations don't work
- Console shows CSRF errors

**Debug:**
1. Check `api-profiling/*-response.json` for error details
2. Review CSRF token in `03-csrf-token-response.json`
3. Examine session cookies in `cookies.txt`

**Solutions:**
- Verify CSRF token is included in requests
- Check session cookie is valid
- Ensure backend is healthy

### Issue: Slow Page Load

**Symptoms:**
- Performance metrics show >3s load time
- Users report delays
- Screenshots show gradual rendering

**Debug:**
1. Check `performance-metrics.json` for timing breakdown
2. Review `network-requests.json` for slow API calls
3. Examine `api-profiling SUMMARY.txt` for endpoint speeds

**Solutions:**
- Optimize slow API endpoints
- Reduce initial data loading
- Implement lazy loading
- Add caching

## Best Practices

### When to Run Diagnostics

- **After frontend changes**: Verify no new errors introduced
- **Performance issues reported**: Identify bottlenecks
- **Unresponsive page**: Capture state for debugging
- **Before releases**: Ensure stability
- **CI/CD pipeline**: Automated regression testing

### Diagnostic Frequency

- **Development**: Run on each major change
- **Staging**: Run daily or on deployment
- **Production**: Run on user reports or weekly health check

### Data Retention

- **GitHub Actions**: Artifacts retained for 30 days
- **Local runs**: Archive important diagnostics
- **Critical issues**: Save full artifact set for analysis

### Privacy Considerations

- Diagnostics may contain sensitive data (cookies, session IDs)
- Only share artifacts with authorized team members
- Redact passwords if present in logs
- Use artifacts for debugging only, not monitoring
- Clean up diagnostic artifacts after issue resolution
- Never commit diagnostic artifacts to version control

**Security Notes**:
- Browser diagnostics disable Puppeteer sandbox for CI compatibility
- API profiling creates temporary files with credentials (cleaned automatically)
- Frontend diagnostics module overwrites global `fetch` function
- Ensure diagnostic tools are only accessible to administrators

## Integration with Existing Diagnostics

The browser diagnostics complement existing diagnostic workflows:

- **Plugin Install Diagnostics**: Tests backend plugin installation
- **Console Diagnostics**: Tests RCON and server connectivity
- **Server Diagnostics**: Tests Minecraft server health

Together, they provide full-stack visibility:
- **Frontend**: Browser diagnostics
- **Backend API**: API profiling
- **Backend Services**: Console diagnostics
- **Infrastructure**: Resource monitoring
- **Game Server**: Server diagnostics

## Troubleshooting the Diagnostics

### Browser Automation Fails

```bash
# Check Puppeteer installation
cd console/backend
npm list puppeteer

# Install system dependencies (Ubuntu/Debian)
sudo apt-get install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
  libxfixes3 libxrandr2 libgbm1 libasound2

# Test browser launch
node -e "const puppeteer = require('puppeteer'); (async () => { const browser = await puppeteer.launch(); await browser.close(); })();"
```

**Security Note**: Browser diagnostics run with `--no-sandbox` flag for Docker/CI compatibility. In production environments, consider running Puppeteer with proper user permissions instead of disabling the sandbox.

### No Screenshots Generated

- Check `OUTPUT_DIR` has write permissions
- Verify browser successfully launched
- Review browser-diagnostics script output for errors

### Resource Monitor Returns No Data

- Verify Docker is installed and accessible
- Check container name matches `CONTAINER_NAME` variable
- Ensure `netstat` and `free` commands available

### API Profiler Shows All Failures

- Verify console URL is accessible
- Check credentials are correct
- Ensure console is running and healthy

## Future Enhancements

Planned improvements:
- Real-time monitoring dashboard
- Automated regression testing
- Performance budgets and alerts
- Comparison reports between runs
- Integration with monitoring tools
- Lighthouse performance audits
- Accessibility testing
- Visual regression testing

## Support

For issues with browser diagnostics:
1. Check this guide first
2. Review workflow run logs
3. Download and examine artifacts
4. File issue with diagnostic data attached

---

## Related Documents

- [Diagnostics Guide](./diagnostics-guide.md) - Overview of all diagnostic tools
- [Plugin Diagnostics](./plugin-diagnostics.md) - Plugin system testing
- [Common Issues](./common-issues.md) - Quick solutions
- [Scripts README](../../scripts/README.md) - Diagnostic scripts overview

---

[← Back to Troubleshooting](./README.md) | [Documentation Hub](../README.md)
