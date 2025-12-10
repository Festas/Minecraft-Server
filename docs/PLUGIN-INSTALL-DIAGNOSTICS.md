# Plugin Install Diagnostics Workflow

## Overview

The Plugin Install Diagnostics workflow provides comprehensive testing and debugging capabilities for the plugin installation API. It captures detailed diagnostic information at every step to help identify and troubleshoot any issues with CSRF tokens, session management, authentication, permissions, or plugin manager functionality.

## Running the Workflow

### Trigger via GitHub UI

1. Go to **Actions** → **Plugin Install Diagnostics (Comprehensive)**
2. Click **Run workflow**
3. Configure options:
   - **test_plugin_url**: URL of plugin JAR to test (default: Pl3xMap)
   - **skip_cleanup**: Leave plugin installed for manual inspection (default: false)
   - **run_all_scenarios**: Run all test scenarios vs. basic valid test only (default: true)
4. Click **Run workflow**

### Workflow Inputs

| Input | Description | Default | Required |
|-------|-------------|---------|----------|
| `test_plugin_url` | Plugin JAR URL to test | Pl3xMap v1.20.4-477 | No |
| `skip_cleanup` | Skip cleanup (leave plugin installed) | false | No |
| `run_all_scenarios` | Run all test scenarios (recommended) | true | No |

## Test Scenarios

When `run_all_scenarios` is enabled (default), the workflow tests:

### 1. Valid CSRF and Session (Expected: Success)
- Full authentication flow
- CSRF token acquisition
- Plugin install with valid credentials
- **Expected Result**: 200/201 status, plugin installed

### 2. Missing CSRF Token (Expected: 403)
- Valid session but no CSRF token sent
- **Expected Result**: 403 Forbidden

### 3. Invalid CSRF Token (Expected: 403)
- Valid session but corrupted CSRF token
- **Expected Result**: 403 Forbidden

### 4. Missing Session Cookie (Expected: 401)
- No session cookie sent
- **Expected Result**: 401 Unauthorized

### 5. Invalid Session Cookie (Expected: 401)
- Corrupted session cookie
- **Expected Result**: 401 Unauthorized

### 6. Expired Session (Best Effort)
- Marked as SKIP (requires time manipulation)

## Diagnostic Output

### Artifact Structure

The workflow uploads a comprehensive artifact named `plugin-install-diagnostics-comprehensive-{run_number}` containing:

```
plugin-install-diagnostics-comprehensive-{run_number}/
├── COMPREHENSIVE-SUMMARY.txt           # Start here!
├── pre-install/                        # Pre-installation state
│   ├── system-state.txt               # User, UID/GID, env, clock
│   ├── environment.txt                # Environment variables, disk usage
│   ├── clock-sync.txt                 # Time sync and drift check
│   ├── plugins-json-permissions.txt   # File permission test results
│   ├── plugins-dir-permissions.txt    # Directory permission test results
│   ├── plugins-json-before.txt        # Initial plugins.json state
│   ├── plugins-dir-before.txt         # Initial directory listing
│   ├── docker-diagnostics.txt         # Container health and status
│   ├── docker-compose-config.yml      # Compose configuration
│   ├── docker-network.txt             # Network inspection
│   ├── container-resources.txt        # CPU/memory/IO stats
│   ├── backend-logs-pre.txt           # Initial backend logs
│   └── debug-logs-pre.txt             # Initial debug logs
├── test-scenarios/                     # Test execution results
│   ├── scenario-01-valid/             # Valid test scenario
│   │   ├── login-request.json         # Login request body
│   │   ├── login-response.json        # Login response
│   │   ├── login-response-headers.txt # Response headers
│   │   ├── post-login-cookies.txt     # Cookie jar after login
│   │   ├── csrf-response.json         # CSRF token response
│   │   ├── csrf-validation.txt        # Token validation details
│   │   ├── post-csrf-cookies.txt      # Cookie jar after CSRF
│   │   ├── install-request.json       # Install request body
│   │   ├── install-response.json      # Install response
│   │   ├── post-install-cookies.txt   # Cookie jar after install
│   │   └── scenario-result.txt        # PASS/FAIL/SKIP
│   ├── scenario-02-missing-csrf/      # Similar structure
│   ├── scenario-03-invalid-csrf/
│   ├── scenario-04-missing-session/
│   ├── scenario-05-invalid-session/
│   └── scenario-06-expired-session/
├── post-install/                       # Post-installation state
│   ├── plugins-json-after.txt         # Final plugins.json state
│   ├── plugins-dir-after.txt          # Final directory listing
│   ├── test-plugin-verification.txt   # Plugin verification
│   ├── install-errors.log             # Plugin manager error log
│   ├── plugin-history.json            # Plugin operation history
│   ├── backend-logs-post.txt          # Final backend logs
│   ├── api-debug-full.log             # Complete API debug log
│   ├── plugins-json-comparison.txt    # Before/after diff
│   ├── plugins-dir-comparison.txt     # Directory diff
│   ├── system-state-final.txt         # Final system state
│   └── docker-diagnostics-final.txt   # Final container state
```

### Key Files for Debugging

1. **COMPREHENSIVE-SUMMARY.txt** - Start here for overview and test results
2. **test-scenarios/*/scenario-result.txt** - PASS/FAIL/SKIP for each test
3. **test-scenarios/*/install-response.json** - API error details
4. **post-install/install-errors.log** - Plugin manager errors
5. **test-scenarios/*/csrf-validation.txt** - CSRF token issues
6. **test-scenarios/*/post-*-cookies.txt** - Cookie state tracking
7. **pre-install/*-permissions.txt** - File permission problems

## Debugging Common Issues

### CSRF Errors (403 Forbidden)

**Symptoms:**
- 403 status on plugin install
- "invalid csrf token" or "csrf token missing" errors

**Debugging Steps:**
1. Check `test-scenarios/scenario-01-valid/csrf-validation.txt`
2. Verify token in JSON matches cookie: should see "✓ CSRF tokens MATCH"
3. Check `test-scenarios/scenario-01-valid/post-csrf-cookies.txt` - CSRF cookie should be present
4. Review `test-scenarios/scenario-01-valid/install-response-headers.txt` - verify CSRF-Token header was sent
5. Check backend logs for CSRF middleware errors

**Common Causes:**
- CSRF cookie not being set by `/api/csrf-token` endpoint
- Token value mismatch between cookie and JSON response
- Missing CSRF-Token header in install request
- Cookie security settings preventing cookie transmission

### Authentication Errors (401 Unauthorized)

**Symptoms:**
- 401 status on any authenticated endpoint
- "not authenticated" or "unauthorized" errors

**Debugging Steps:**
1. Check `test-scenarios/scenario-01-valid/login-response.json` - should show successful login
2. Verify session cookie in `test-scenarios/scenario-01-valid/post-login-cookies.txt`
3. Check if session cookie persists through CSRF and install steps
4. Review backend logs for session errors

**Common Causes:**
- Session cookie not being set on login
- Session cookie not being sent in subsequent requests
- Cookie security settings (httpOnly, secure, sameSite)
- Session expiration or invalidation

### Permission Errors

**Symptoms:**
- "EACCES" or "permission denied" errors
- Plugin JAR not created in plugins directory
- plugins.json not updated

**Debugging Steps:**
1. Check `pre-install/plugins-json-permissions.txt` - should show writable
2. Check `pre-install/plugins-dir-permissions.txt` - should show writable
3. Review write test results in permission files
4. Check ownership and group (UID/GID should match)
5. Review `post-install/install-errors.log` for permission errors

**Common Causes:**
- plugins.json owned by different user
- plugins directory not writable by container user
- Parent directory permission issues
- File system mount restrictions

### Plugin Manager Errors

**Symptoms:**
- Install fails with plugin-specific error
- Plugin JAR downloads but install fails
- Multiple JAR options but no selection made

**Debugging Steps:**
1. Review `post-install/install-errors.log` for detailed error messages
2. Check `test-scenarios/scenario-01-valid/install-response.json` for error details
3. Review `post-install/backend-logs-post.txt` for plugin manager logs
4. Verify plugin URL is accessible
5. Check for "multiple-options" status requiring JAR selection

**Common Causes:**
- Invalid plugin URL or unavailable release
- Plugin incompatible with server version
- Multiple JAR files in release requiring user selection
- Network issues downloading plugin
- Disk space issues

## Advanced Usage

### Testing Specific Plugins

```yaml
# Run workflow with custom plugin URL
test_plugin_url: 'https://github.com/user/plugin/releases/download/v1.0.0/plugin.jar'
```

### Debugging Without Cleanup

```yaml
# Leave plugin installed for manual inspection
skip_cleanup: true
```

This allows you to:
- SSH into server and inspect plugin files
- Check server logs for plugin load errors
- Verify plugin appears in `/plugins` API
- Test plugin functionality manually

### Running Basic Test Only

```yaml
# Skip multi-scenario testing, run only valid test
run_all_scenarios: false
```

Use this when:
- You only need to verify plugin install works
- Troubleshooting a specific plugin, not auth/CSRF issues
- Reducing workflow execution time

## Workflow Execution Time

- **Full multi-scenario run**: ~5-10 minutes (6 scenarios + diagnostics)
- **Basic test only**: ~2-3 minutes (1 scenario + diagnostics)

Times may vary based on:
- Backend startup time
- Plugin download size/speed
- Number of existing plugins
- Server load

## Interpreting Results

### Success Indicators

✓ Green checkmarks in output
✓ "All test scenarios passed" message
✓ Scenario result files show "PASS"
✓ Install response shows status: "installed" or "conflict"
✓ Plugin appears in final plugins.json
✓ Plugin JAR exists in plugins directory

### Failure Indicators

✗ Red X marks in output
✗ "Failures detected" message
✗ Scenario result files show "FAIL"
✗ Non-200 status codes on install
✗ Error messages in install response
✗ Plugin missing from final state
✗ Permission errors in logs

## Related Documentation

- [Plugin Manager Guide](./admin/plugin-manager.md) - Plugin management features
- [CSRF Fix Documentation](./CSRF-FIX-DOCUMENTATION.md) - CSRF implementation details
- [Session/CSRF Debug Implementation](./SESSION-CSRF-DEBUG-IMPLEMENTATION.md) - Debug logging details
- [API Documentation](./API.md) - API endpoint reference

## Troubleshooting

### Workflow Fails to Start

**Check:**
- Required secrets are configured (SSH_PRIVATE_KEY, SERVER_HOST, etc.)
- Server is accessible via SSH
- Backend container is running

### Incomplete Diagnostics

**Check:**
- Diagnostic scripts uploaded to server successfully
- /tmp directory has sufficient space
- Scripts have execute permissions

### Missing Artifact Files

**Check:**
- Workflow completed all steps (check "if: always()" conditions)
- Artifact upload step succeeded
- Files were created in expected locations on server

## Related Diagnostic Tools

The Plugin Install Diagnostics focus on backend plugin installation testing. For comprehensive debugging, consider using additional tools:

### Frontend/Browser Issues

If the Plugin Manager UI is unresponsive or showing JavaScript errors:

**Use**: [Browser Diagnostics](./BROWSER-DIAGNOSTICS.md)
```bash
# Via GitHub Actions
Actions → Browser Diagnostics - Plugin Manager → Run workflow
```

Browser Diagnostics provide:
- JavaScript error and exception capture
- Network request monitoring with timings
- Performance metrics and page load analysis
- DOM complexity analysis
- Visual screenshots at key stages

### API Performance Issues

For API response time analysis and endpoint testing:

**Use**: API Profiling (part of Browser Diagnostics)
```bash
./scripts/api-profiler.sh
```

API Profiling provides:
- Response times for all endpoints
- Valid and invalid request scenarios
- CSRF token flow testing
- Error case coverage

### Resource/Performance Issues

For CPU, memory, or resource exhaustion problems:

**Use**: Resource Monitoring
```bash
./scripts/resource-monitor.sh
```

Resource Monitoring provides:
- System CPU/memory usage over time
- Docker container resource consumption
- Network connection tracking
- Process list snapshots

### Comprehensive Diagnostics

For full-stack issue diagnosis, see:
- [Diagnostics Guide](./DIAGNOSTICS-GUIDE.md) - Overview of all diagnostic tools
- [Browser Diagnostics](./BROWSER-DIAGNOSTICS.md) - Frontend and API diagnostics
- [API Authentication Guide](./API-AUTHENTICATION-GUIDE.md) - CSRF and session flow

## Support

If you encounter issues not covered in this guide:

1. Review the COMPREHENSIVE-SUMMARY.txt in the artifact
2. Check individual scenario result files
3. Review backend logs for specific error messages
4. Consider running Browser Diagnostics for frontend issues
5. Consult related documentation listed above
6. Open an issue with:
   - Workflow run number
   - Test scenario that failed
   - Relevant log excerpts
   - Steps to reproduce
