#!/bin/bash

################################################################################
# Comprehensive Diagnostics Summary Generator
#
# This script generates all diagnostic summary reports and documentation:
# - MASTER-SUMMARY.txt: Complete diagnostic results and triage guide
# - README.md: GitHub-friendly markdown summary
# - SECRETS-GUIDE.txt: Detailed secret configuration instructions
#
# Usage:
#   Called automatically by comprehensive-plugin-manager-diagnostics.yml workflow
#   Reads configuration from environment variables
#   Generates reports in OUTPUT_DIR
################################################################################

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

# Directories
OUTPUT_DIR="${OUTPUT_DIR:-./comprehensive-summary}"
BROWSER_DIAGNOSTICS_DIR="${BROWSER_DIAGNOSTICS_DIR:-/tmp/comprehensive-browser-diagnostics-${RUN_NUMBER}}"
API_PROFILER_DIR="${API_PROFILER_DIR:-/tmp/comprehensive-api-profiler-${RUN_NUMBER}}"
BACKEND_BASIC_DIR="${BACKEND_BASIC_DIR:-./diagnostics-backend-basic}"
BACKEND_ADVANCED_DIR="${BACKEND_ADVANCED_DIR:-./diagnostics-backend-advanced}"
RESOURCES_DIR="${RESOURCES_DIR:-./diagnostics-resources}"

# Workflow metadata
RUN_NUMBER="${RUN_NUMBER:-unknown}"
CONSOLE_URL="${CONSOLE_URL:-unknown}"
TIMESTAMP="${TIMESTAMP:-$(date -u '+%Y-%m-%d %H:%M:%S UTC')}"

# Features enabled flags
RUN_BROWSER_DIAGNOSTICS="${RUN_BROWSER_DIAGNOSTICS:-true}"
RUN_BACKEND_DIAGNOSTICS="${RUN_BACKEND_DIAGNOSTICS:-true}"
RUN_ADVANCED_BACKEND="${RUN_ADVANCED_BACKEND:-true}"
RUN_API_PROFILING="${RUN_API_PROFILING:-true}"
RUN_RESOURCE_MONITORING="${RUN_RESOURCE_MONITORING:-true}"
BACKEND_MODE="${BACKEND_MODE:-diagnose}"
MONITOR_DURATION="${MONITOR_DURATION:-90}"
MONITOR_INTERVAL="${MONITOR_INTERVAL:-2}"

# Secret status flags
HAS_SERVER_HOST="${HAS_SERVER_HOST:-false}"
HAS_SERVER_USER="${HAS_SERVER_USER:-false}"
HAS_SSH_KEY="${HAS_SSH_KEY:-false}"
HAS_CONSOLE_USER="${HAS_CONSOLE_USER:-false}"
HAS_CONSOLE_PASS="${HAS_CONSOLE_PASS:-false}"
CAN_SSH="${CAN_SSH:-false}"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

log_info() {
    echo "ℹ️  $*"
}

log_success() {
    echo "✅ $*"
}

log_warning() {
    echo "⚠️  $*"
}

log_error() {
    echo "❌ $*"
}

# ============================================================================
# MASTER SUMMARY GENERATION
# ============================================================================

generate_master_summary() {
    local output_file="${OUTPUT_DIR}/MASTER-SUMMARY.txt"
    
    log_info "Generating master summary: ${output_file}"
    
    cat > "${output_file}" << 'EOF_HEADER'
╔════════════════════════════════════════════════════════════════╗
║  COMPREHENSIVE PLUGIN MANAGER DIAGNOSTICS - MASTER SUMMARY     ║
╚════════════════════════════════════════════════════════════════╝
EOF_HEADER

    cat >> "${output_file}" << EOF

Generated: ${TIMESTAMP}
Workflow Run: #${RUN_NUMBER}
Console URL: ${CONSOLE_URL}

════════════════════════════════════════════════════════════════
DIAGNOSTIC COMPONENTS EXECUTED
════════════════════════════════════════════════════════════════

EOF

    # List what was executed
    if [ "${RUN_BROWSER_DIAGNOSTICS}" = "true" ]; then
        echo "✓ Browser Automation Diagnostics (Puppeteer)" >> "${output_file}"
    else
        echo "○ Browser Automation Diagnostics (skipped)" >> "${output_file}"
    fi

    if [ "${RUN_BACKEND_DIAGNOSTICS}" = "true" ]; then
        echo "✓ Backend/Plugin Diagnostics (mode: ${BACKEND_MODE})" >> "${output_file}"
        if [ "${RUN_ADVANCED_BACKEND}" = "true" ]; then
            echo "  ✓ Advanced backend diagnostics" >> "${output_file}"
        fi
    else
        echo "○ Backend/Plugin Diagnostics (skipped)" >> "${output_file}"
    fi

    if [ "${RUN_API_PROFILING}" = "true" ]; then
        echo "✓ API Endpoint Profiling" >> "${output_file}"
    else
        echo "○ API Endpoint Profiling (skipped)" >> "${output_file}"
    fi

    if [ "${RUN_RESOURCE_MONITORING}" = "true" ]; then
        echo "✓ Resource Monitoring (CPU, Memory, Docker)" >> "${output_file}"
        echo "  Duration: ${MONITOR_DURATION}s" >> "${output_file}"
        echo "  Interval: ${MONITOR_INTERVAL}s" >> "${output_file}"
    else
        echo "○ Resource Monitoring (skipped)" >> "${output_file}"
    fi

    cat >> "${output_file}" << 'EOF'

════════════════════════════════════════════════════════════════
DIAGNOSTIC RESULTS SUMMARY
════════════════════════════════════════════════════════════════

EOF

    # Include browser diagnostics summary
    if [ -f "${BROWSER_DIAGNOSTICS_DIR}/SUMMARY.txt" ]; then
        cat >> "${output_file}" << 'EOF'
┌─ BROWSER DIAGNOSTICS ─────────────────────────────────────────┐
EOF
        cat "${BROWSER_DIAGNOSTICS_DIR}/SUMMARY.txt" >> "${output_file}"
        cat >> "${output_file}" << 'EOF'
└───────────────────────────────────────────────────────────────┘

EOF
    fi

    # Include backend diagnostics summary
    if [ -d "${BACKEND_BASIC_DIR}" ]; then
        local summary_file
        summary_file=$(find "${BACKEND_BASIC_DIR}" -name "summary.log" 2>/dev/null | head -1)
        if [ -f "${summary_file}" ]; then
            cat >> "${output_file}" << 'EOF'
┌─ BACKEND DIAGNOSTICS (BASIC) ─────────────────────────────────┐
EOF
            cat "${summary_file}" >> "${output_file}"
            cat >> "${output_file}" << 'EOF'
└───────────────────────────────────────────────────────────────┘

EOF
        fi

        # Show issues if any
        local issues_file
        issues_file=$(find "${BACKEND_BASIC_DIR}" -name "issues.log" 2>/dev/null | head -1)
        if [ -f "${issues_file}" ] && [ -s "${issues_file}" ]; then
            cat >> "${output_file}" << 'EOF'
┌─ BACKEND ISSUES FOUND ────────────────────────────────────────┐
EOF
            cat "${issues_file}" >> "${output_file}"
            cat >> "${output_file}" << 'EOF'
└───────────────────────────────────────────────────────────────┘

EOF
        fi

        # Show fixes if any
        local fixes_file
        fixes_file=$(find "${BACKEND_BASIC_DIR}" -name "fixes.log" 2>/dev/null | head -1)
        if [ -f "${fixes_file}" ] && [ -s "${fixes_file}" ]; then
            cat >> "${output_file}" << 'EOF'
┌─ BACKEND AUTO-FIXES APPLIED ──────────────────────────────────┐
EOF
            cat "${fixes_file}" >> "${output_file}"
            cat >> "${output_file}" << 'EOF'
└───────────────────────────────────────────────────────────────┘

EOF
        fi
    fi

    # Advanced backend diagnostics summary
    if [ -d "${BACKEND_ADVANCED_DIR}" ]; then
        local adv_summary_file
        adv_summary_file=$(find "${BACKEND_ADVANCED_DIR}" -name "summary.log" 2>/dev/null | head -1)
        if [ -f "${adv_summary_file}" ]; then
            cat >> "${output_file}" << 'EOF'
┌─ BACKEND DIAGNOSTICS (ADVANCED) ──────────────────────────────┐
EOF
            cat "${adv_summary_file}" >> "${output_file}"
            cat >> "${output_file}" << 'EOF'
└───────────────────────────────────────────────────────────────┘

EOF
        fi
    fi

    # API profiling summary
    if [ -f "${API_PROFILER_DIR}/SUMMARY.txt" ]; then
        cat >> "${output_file}" << 'EOF'
┌─ API PROFILING ───────────────────────────────────────────────┐
EOF
        cat "${API_PROFILER_DIR}/SUMMARY.txt" >> "${output_file}"
        cat >> "${output_file}" << 'EOF'
└───────────────────────────────────────────────────────────────┘

EOF
    fi

    # Resource monitoring summary
    if [ -d "${RESOURCES_DIR}" ]; then
        local resource_summary
        resource_summary=$(find "${RESOURCES_DIR}" -name "SUMMARY.txt" -type f 2>/dev/null | head -1)
        if [ -f "${resource_summary}" ]; then
            cat >> "${output_file}" << 'EOF'
┌─ RESOURCE MONITORING ─────────────────────────────────────────┐
EOF
            cat "${resource_summary}" >> "${output_file}"
            cat >> "${output_file}" << 'EOF'
└───────────────────────────────────────────────────────────────┘

EOF
        fi
    fi

    # Add artifacts listing
    cat >> "${output_file}" << 'EOF'
════════════════════════════════════════════════════════════════
ARTIFACTS AVAILABLE
════════════════════════════════════════════════════════════════

All diagnostic data is available in GitHub Actions artifacts:

EOF

    if [ "${RUN_BROWSER_DIAGNOSTICS}" = "true" ]; then
        cat >> "${output_file}" << EOF
📦 browser-diagnostics-${RUN_NUMBER}
   • Console errors and warnings
   • Network request logs with timings
   • Performance metrics and FPS data
   • DOM complexity analysis
   • Screenshots of page states
   • JavaScript error traces

EOF
    fi

    if [ "${RUN_BACKEND_DIAGNOSTICS}" = "true" ]; then
        cat >> "${output_file}" << EOF
📦 backend-diagnostics-basic-${RUN_NUMBER}
   • plugins.json validation results
   • Plugin directory checks
   • Permission analysis
   • Auto-fix logs (if mode=fix)
   • Manual action recommendations

EOF

        if [ "${RUN_ADVANCED_BACKEND}" = "true" ]; then
            cat >> "${output_file}" << EOF
📦 backend-diagnostics-advanced-${RUN_NUMBER}
   • Deep plugin structure analysis
   • Dependency validation
   • Configuration file checks
   • Advanced troubleshooting data

EOF
        fi
    fi

    if [ "${RUN_API_PROFILING}" = "true" ]; then
        cat >> "${output_file}" << EOF
📦 api-profiling-${RUN_NUMBER}
   • API response times for all endpoints
   • Request/response samples
   • Error case testing results
   • Performance bottleneck analysis

EOF
    fi

    if [ "${RUN_RESOURCE_MONITORING}" = "true" ]; then
        cat >> "${output_file}" << EOF
📦 resource-monitoring-${RUN_NUMBER}
   • System CPU/memory usage over time
   • Docker container statistics
   • Network connection tracking
   • Process resource usage

EOF
    fi

    cat >> "${output_file}" << EOF
📦 comprehensive-summary-${RUN_NUMBER}
   • This master summary report
   • Debugging recommendations
   • Quick reference guide

EOF

    # Add triage guide
    cat >> "${output_file}" << 'EOF'
════════════════════════════════════════════════════════════════
RAPID TRIAGE & DEBUGGING GUIDE
════════════════════════════════════════════════════════════════

🔍 Start debugging by following this priority order:

1. FRONTEND ISSUES (Browser Freezes, UI Not Loading)
   → Check: browser-diagnostics/SUMMARY.txt
   → Look for: JavaScript errors, failed network requests
   → Review: screenshots/ to see visual state
   → Examine: console-errors.json for error details

2. BACKEND ISSUES (Plugin Manager Not Working)
   → Check: backend-diagnostics-basic/summary.log
   → Look for: Permission errors, missing files
   → Review: issues.log for detected problems
   → Check: fixes.log to see what was auto-fixed

3. API ISSUES (Slow Response, Errors)
   → Check: api-profiling/SUMMARY.txt
   → Look for: Slow endpoints (>1000ms)
   → Review: *-timing.txt files for bottlenecks
   → Examine: *-response.json for error messages

4. RESOURCE ISSUES (High CPU/Memory, Container Problems)
   → Check: resource-monitoring/SUMMARY.txt
   → Look for: CPU >80%, Memory >90%
   → Review: system-resources.log for trends
   → Check: container-stats.log for Docker issues

════════════════════════════════════════════════════════════════
COMMON PROBLEM PATTERNS
════════════════════════════════════════════════════════════════

⚠️  Page loads but plugins don't appear:
   • Check browser-diagnostics for API call failures
   • Verify CSRF token in network-requests.json
   • Check backend permissions for plugins.json

⚠️  High CPU during page load:
   • Review resource-monitoring for spike timing
   • Check browser-diagnostics performance-metrics.json
   • Look for DOM complexity in dom-analysis.json

⚠️  Plugin install fails:
   • Check backend-diagnostics for write permissions
   • Review api-profiling for /api/plugins/install errors
   • Verify Docker container has disk space

⚠️  Session/authentication issues:
   • Check api-profiling for 401/403 responses
   • Review browser-diagnostics for cookie problems
   • Check backend logs in backend-diagnostics

════════════════════════════════════════════════════════════════
NEXT STEPS FOR DEBUGGING
════════════════════════════════════════════════════════════════

1. Download all artifacts from this workflow run
2. Start with this MASTER-SUMMARY.txt file
3. Follow the Rapid Triage Guide above based on symptoms
4. Review relevant artifact sections in priority order
5. Cross-reference findings between different diagnostic types
6. Use timestamps to correlate events across artifacts

EOF

    # Add secrets status section
    generate_secrets_status_section >> "${output_file}"

    # Add workflow dispatch information
    cat >> "${output_file}" << 'EOF'

════════════════════════════════════════════════════════════════
WORKFLOW DISPATCH INFORMATION
════════════════════════════════════════════════════════════════

This workflow is FULLY SELF-DISPATCHABLE from GitHub Actions UI.

✅ NO manual file changes required
✅ NO secrets needed in workflow YAML conditions
✅ Graceful fallback for missing secrets
✅ Clear explanations for skipped steps

To run again:
  1. Go to: Actions → Comprehensive Plugin Manager Diagnostics
  2. Click: 'Run workflow' button
  3. Configure: Options or use defaults
  4. Click: 'Run workflow' (green button)

The workflow will automatically:
  • Detect available secrets at runtime
  • Skip unavailable diagnostics gracefully
  • Explain what was run and what was skipped
  • Provide guidance for enabling full diagnostics

For detailed documentation, see:
  • docs/DIAGNOSTICS-GUIDE.md
  • docs/BROWSER-DIAGNOSTICS.md
  • docs/PLUGIN-INSTALL-DIAGNOSTICS.md

════════════════════════════════════════════════════════════════
END OF MASTER SUMMARY
════════════════════════════════════════════════════════════════
EOF

    log_success "Master summary generated"
}

# ============================================================================
# SECRETS STATUS SECTION
# ============================================================================

generate_secrets_status_section() {
    cat << 'EOF'

════════════════════════════════════════════════════════════════
SECRETS CONFIGURATION STATUS
════════════════════════════════════════════════════════════════

This workflow uses GitHub repository secrets to access remote
resources and credentials. Some diagnostics require specific
secrets to be configured.

┌─ SECRETS STATUS ──────────────────────────────────────────────┐

EOF

    # Server access secrets
    if [ "${HAS_SERVER_HOST}" = "true" ]; then
        echo "  ✅ SERVER_HOST          : Configured"
    else
        echo "  ❌ SERVER_HOST          : NOT configured"
    fi

    if [ "${HAS_SERVER_USER}" = "true" ]; then
        echo "  ✅ SERVER_USER          : Configured"
    else
        echo "  ❌ SERVER_USER          : NOT configured"
    fi

    if [ "${HAS_SSH_KEY}" = "true" ]; then
        echo "  ✅ SSH_PRIVATE_KEY      : Configured"
    else
        echo "  ❌ SSH_PRIVATE_KEY      : NOT configured"
    fi

    # Console credentials
    if [ "${HAS_CONSOLE_USER}" = "true" ]; then
        echo "  ✅ CONSOLE_ADMIN_USER   : Configured"
    else
        echo "  ⚠️  CONSOLE_ADMIN_USER   : Using default (admin)"
    fi

    if [ "${HAS_CONSOLE_PASS}" = "true" ]; then
        echo "  ✅ CONSOLE_ADMIN_PASSWORD: Configured"
    else
        echo "  ⚠️  CONSOLE_ADMIN_PASSWORD: Using default (admin)"
    fi

    cat << 'EOF'

└───────────────────────────────────────────────────────────────┘

┌─ DIAGNOSTICS EXECUTED/SKIPPED BASED ON SECRETS ───────────────┐

EOF

    if [ "${CAN_SSH}" = "true" ]; then
        cat << 'EOF'
  ✅ Remote SSH Access: ENABLED
     ├─ Backend diagnostics: Available
     ├─ Resource monitoring: Available
     └─ Server file access: Available
EOF
    else
        cat << 'EOF'
  ❌ Remote SSH Access: DISABLED
     Missing: SERVER_HOST, SERVER_USER, or SSH_PRIVATE_KEY
     ├─ Backend diagnostics: SKIPPED
     ├─ Resource monitoring: SKIPPED
     └─ Server file access: UNAVAILABLE
EOF
    fi

    echo ""

    if [ "${RUN_BROWSER_DIAGNOSTICS}" = "true" ]; then
        cat << 'EOF'
  ✅ Browser Diagnostics: EXECUTED
     Uses: CONSOLE_ADMIN_USER, CONSOLE_ADMIN_PASSWORD
     Note: Defaults used if secrets not configured
EOF
    fi

    if [ "${RUN_API_PROFILING}" = "true" ]; then
        cat << 'EOF'
  ✅ API Profiling: EXECUTED
     Uses: CONSOLE_ADMIN_USER, CONSOLE_ADMIN_PASSWORD
     Note: Defaults used if secrets not configured
EOF
    fi

    cat << 'EOF'

└───────────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════
HOW TO ADD MISSING SECRETS
════════════════════════════════════════════════════════════════

To enable full diagnostic capabilities, configure these secrets
in your GitHub repository:

1. Navigate to: Repository → Settings → Secrets and variables → Actions

2. Click 'New repository secret' for each missing secret:

   SECRET NAME              DESCRIPTION                      REQUIRED FOR
   ──────────────────────── ──────────────────────────────── ─────────────────────
   SERVER_HOST              Production server hostname       Remote diagnostics
                            (e.g., server.example.com)

   SERVER_USER              SSH username for server          Remote diagnostics
                            (e.g., deploy, ubuntu)

   SSH_PRIVATE_KEY          SSH private key for auth         Remote diagnostics
                            (full key including headers)

   CONSOLE_ADMIN_USER       Console admin username           Browser/API testing
                            (default: admin)

   CONSOLE_ADMIN_PASSWORD   Console admin password           Browser/API testing
                            (default: admin)

3. SECURITY BEST PRACTICES:

   • Never commit secrets to code
   • Use dedicated SSH keys for CI/CD (not personal keys)
   • Rotate secrets regularly
   • Grant minimum required permissions
   • Use strong, unique passwords
   • Limit secret access to necessary workflows only

4. SSH KEY GENERATION:

   # Generate a dedicated key pair for GitHub Actions
   ssh-keygen -t ed25519 -C 'github-actions' -f github_actions_key

   # Add public key to server's authorized_keys
   ssh-copy-id -i github_actions_key.pub user@server.example.com

   # Add private key content to SSH_PRIVATE_KEY secret
   cat github_actions_key  # Copy entire output including headers

5. TESTING YOUR CONFIGURATION:

   After adding secrets, run this workflow again to verify:
   • All secret detection checks show ✅
   • Remote diagnostics are no longer skipped
   • All enabled components execute successfully
EOF
}

# ============================================================================
# README.MD GENERATION
# ============================================================================

generate_readme() {
    local output_file="${OUTPUT_DIR}/README.md"
    
    log_info "Generating README: ${output_file}"
    
    cat > "${output_file}" << EOF
# Comprehensive Plugin Manager Diagnostics

**Generated:** ${TIMESTAMP}

**Workflow Run:** #${RUN_NUMBER}

**Console URL:** ${CONSOLE_URL}

## Components Executed

EOF

    if [ "${RUN_BROWSER_DIAGNOSTICS}" = "true" ]; then
        echo "- ✅ Browser Automation Diagnostics" >> "${output_file}"
    else
        echo "- ⏭️ Browser Automation Diagnostics (skipped)" >> "${output_file}"
    fi

    if [ "${RUN_BACKEND_DIAGNOSTICS}" = "true" ]; then
        echo "- ✅ Backend/Plugin Diagnostics (mode: ${BACKEND_MODE})" >> "${output_file}"
    else
        echo "- ⏭️ Backend/Plugin Diagnostics (skipped)" >> "${output_file}"
    fi

    if [ "${RUN_API_PROFILING}" = "true" ]; then
        echo "- ✅ API Endpoint Profiling" >> "${output_file}"
    else
        echo "- ⏭️ API Endpoint Profiling (skipped)" >> "${output_file}"
    fi

    if [ "${RUN_RESOURCE_MONITORING}" = "true" ]; then
        echo "- ✅ Resource Monitoring" >> "${output_file}"
    else
        echo "- ⏭️ Resource Monitoring (skipped)" >> "${output_file}"
    fi

    cat >> "${output_file}" << 'EOF'

## Quick Links to Artifacts

Download the following artifacts from this workflow run for detailed diagnostics:

EOF

    [ "${RUN_BROWSER_DIAGNOSTICS}" = "true" ] && \
        echo "- 📦 \`browser-diagnostics-${RUN_NUMBER}\` - Browser automation results" >> "${output_file}"

    [ "${RUN_BACKEND_DIAGNOSTICS}" = "true" ] && \
        echo "- 📦 \`backend-diagnostics-basic-${RUN_NUMBER}\` - Plugin manager diagnostics" >> "${output_file}"

    [ "${RUN_BACKEND_DIAGNOSTICS}" = "true" ] && [ "${RUN_ADVANCED_BACKEND}" = "true" ] && \
        echo "- 📦 \`backend-diagnostics-advanced-${RUN_NUMBER}\` - Advanced diagnostics" >> "${output_file}"

    [ "${RUN_API_PROFILING}" = "true" ] && \
        echo "- 📦 \`api-profiling-${RUN_NUMBER}\` - API performance data" >> "${output_file}"

    [ "${RUN_RESOURCE_MONITORING}" = "true" ] && \
        echo "- 📦 \`resource-monitoring-${RUN_NUMBER}\` - Resource usage data" >> "${output_file}"

    cat >> "${output_file}" << EOF
- 📦 \`comprehensive-summary-${RUN_NUMBER}\` - Master summary (this report)

## Debugging Priority

See the MASTER-SUMMARY.txt file in the comprehensive-summary artifact for:

- 🔍 Rapid triage guide
- ⚠️ Common problem patterns
- 📋 Step-by-step debugging workflow
- 🔗 Cross-references between artifacts

## Secret Configuration Status

EOF

    # Add secret status
    if [ "${CAN_SSH}" = "true" ]; then
        echo "✅ **Remote SSH Access**: ENABLED - All diagnostics available" >> "${output_file}"
    else
        echo "⚠️ **Remote SSH Access**: DISABLED - Some diagnostics skipped" >> "${output_file}"
        echo "" >> "${output_file}"
        echo "Missing secrets: \`SERVER_HOST\`, \`SERVER_USER\`, and/or \`SSH_PRIVATE_KEY\`" >> "${output_file}"
        echo "" >> "${output_file}"
        echo "See SECRETS-GUIDE.txt for setup instructions." >> "${output_file}"
    fi

    log_success "README generated"
}

# ============================================================================
# SECRETS GUIDE GENERATION
# ============================================================================

generate_secrets_guide() {
    local output_file="${OUTPUT_DIR}/SECRETS-GUIDE.txt"
    
    log_info "Generating secrets guide: ${output_file}"
    
    cat > "${output_file}" << 'EOF'
════════════════════════════════════════════════════════════════
SECRETS CONFIGURATION GUIDE
Comprehensive Plugin Manager Diagnostics Workflow
════════════════════════════════════════════════════════════════

This guide explains how to configure GitHub repository secrets
to enable full diagnostic capabilities in this workflow.

════════════════════════════════════════════════════════════════
CURRENT SECRET STATUS
════════════════════════════════════════════════════════════════

EOF

    if [ "${HAS_SERVER_HOST}" = "true" ]; then
        echo "✅ SERVER_HOST          : Configured" >> "${output_file}"
    else
        echo "❌ SERVER_HOST          : NOT configured" >> "${output_file}"
    fi

    if [ "${HAS_SERVER_USER}" = "true" ]; then
        echo "✅ SERVER_USER          : Configured" >> "${output_file}"
    else
        echo "❌ SERVER_USER          : NOT configured" >> "${output_file}"
    fi

    if [ "${HAS_SSH_KEY}" = "true" ]; then
        echo "✅ SSH_PRIVATE_KEY      : Configured" >> "${output_file}"
    else
        echo "❌ SSH_PRIVATE_KEY      : NOT configured" >> "${output_file}"
    fi

    if [ "${HAS_CONSOLE_USER}" = "true" ]; then
        echo "✅ CONSOLE_ADMIN_USER   : Configured" >> "${output_file}"
    else
        echo "⚠️  CONSOLE_ADMIN_USER   : Using default (admin)" >> "${output_file}"
    fi

    if [ "${HAS_CONSOLE_PASS}" = "true" ]; then
        echo "✅ CONSOLE_ADMIN_PASSWORD: Configured" >> "${output_file}"
    else
        echo "⚠️  CONSOLE_ADMIN_PASSWORD: Using default (admin)" >> "${output_file}"
    fi

    cat >> "${output_file}" << 'EOF'

════════════════════════════════════════════════════════════════
REQUIRED SECRETS BY DIAGNOSTIC TYPE
════════════════════════════════════════════════════════════════

┌─ BROWSER DIAGNOSTICS ─────────────────────────────────────────┐
│ • CONSOLE_ADMIN_USER      (optional - defaults to 'admin')    │
│ • CONSOLE_ADMIN_PASSWORD  (optional - defaults to 'admin')    │
│                                                                │
│ What it enables:                                              │
│   - Automated browser login                                   │
│   - Page interaction testing                                  │
│   - Screenshot capture of authenticated pages                 │
│   - Network request monitoring                                │
└────────────────────────────────────────────────────────────────┘

┌─ API PROFILING ───────────────────────────────────────────────┐
│ • CONSOLE_ADMIN_USER      (optional - defaults to 'admin')    │
│ • CONSOLE_ADMIN_PASSWORD  (optional - defaults to 'admin')    │
│                                                                │
│ What it enables:                                              │
│   - API endpoint authentication testing                       │
│   - CSRF token flow validation                                │
│   - Session management testing                                │
│   - Performance profiling of protected endpoints             │
└────────────────────────────────────────────────────────────────┘

┌─ BACKEND DIAGNOSTICS ─────────────────────────────────────────┐
│ • SERVER_HOST             (REQUIRED for remote diagnostics)   │
│ • SERVER_USER             (REQUIRED for remote diagnostics)   │
│ • SSH_PRIVATE_KEY         (REQUIRED for remote diagnostics)   │
│                                                                │
│ What it enables:                                              │
│   - Remote server file access                                 │
│   - Plugin manager diagnostics                                │
│   - Permission and ownership checks                           │
│   - Auto-fix capabilities (in fix mode)                       │
│   - Advanced plugin structure analysis                        │
└────────────────────────────────────────────────────────────────┘

┌─ RESOURCE MONITORING ─────────────────────────────────────────┐
│ • SERVER_HOST             (REQUIRED for remote monitoring)    │
│ • SERVER_USER             (REQUIRED for remote monitoring)    │
│ • SSH_PRIVATE_KEY         (REQUIRED for remote monitoring)    │
│                                                                │
│ What it enables:                                              │
│   - CPU and memory usage tracking                             │
│   - Docker container statistics                               │
│   - Network connection monitoring                             │
│   - Process resource analysis                                 │
└────────────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════
HOW TO ADD SECRETS
════════════════════════════════════════════════════════════════

STEP 1: Navigate to Secrets Settings
--------------------------------------
1. Go to your GitHub repository
2. Click 'Settings' tab
3. In left sidebar: 'Secrets and variables' → 'Actions'
4. Click 'New repository secret' button

STEP 2: Add Each Required Secret
----------------------------------

SECRET: SERVER_HOST
  Description: Hostname or IP address of your production server
  Example: server.example.com  OR  203.0.113.42
  How to get: Check your server provider dashboard

SECRET: SERVER_USER
  Description: SSH username for server access
  Example: deploy, ubuntu, admin, root
  How to get: Check server account settings or hosting docs

SECRET: SSH_PRIVATE_KEY
  Description: Private SSH key for authentication
  Format: Full key including BEGIN/END headers
  Example:
    -----BEGIN OPENSSH PRIVATE KEY-----
    b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAA...
    -----END OPENSSH PRIVATE KEY-----

  How to generate (RECOMMENDED - dedicated key for CI/CD):
    1. On your local machine:
       ssh-keygen -t ed25519 -C 'github-actions-diagnostics' -f ~/.ssh/github_actions

    2. Add public key to server:
       ssh-copy-id -i ~/.ssh/github_actions.pub user@server.example.com
       # OR manually append to server's ~/.ssh/authorized_keys

    3. Copy private key content:
       cat ~/.ssh/github_actions
       # Copy ENTIRE output including headers

    4. Paste into SSH_PRIVATE_KEY secret

SECRET: CONSOLE_ADMIN_USER
  Description: Username for console web interface
  Default: admin (used if not configured)
  Example: admin, superuser, administrator

SECRET: CONSOLE_ADMIN_PASSWORD
  Description: Password for console web interface
  Default: admin (used if not configured - INSECURE!)
  Recommendation: Use strong, unique password
  Example: Generate with: openssl rand -base64 32

════════════════════════════════════════════════════════════════
SECURITY BEST PRACTICES
════════════════════════════════════════════════════════════════

✅ DO:
  • Use dedicated SSH keys for CI/CD (not your personal key)
  • Use ed25519 keys (modern, secure, fast)
  • Rotate secrets regularly (every 90-180 days)
  • Use strong, unique passwords (min 16 characters)
  • Limit SSH key permissions on server (read-only if possible)
  • Monitor secret usage in workflow logs
  • Use environment-specific secrets (staging vs production)

❌ DON'T:
  • Commit secrets to code or documentation
  • Share secrets between different environments
  • Use root account for CI/CD access
  • Reuse personal SSH keys
  • Use weak/default passwords in production
  • Store secrets in workflow files
  • Echo or print secret values in logs

════════════════════════════════════════════════════════════════
SSH KEY SECURITY
════════════════════════════════════════════════════════════════

When generating SSH keys for GitHub Actions:

1. Use a dedicated key pair (don't reuse personal keys)
2. Add to authorized_keys with restrictions:
   from="140.82.112.0/20,143.55.64.0/20" ssh-ed25519 AAAA...
   (GitHub Actions IP ranges)

3. Consider command restrictions in authorized_keys:
   command="/path/to/allowed-commands.sh" ssh-ed25519 AAAA...

4. Monitor SSH access logs:
   tail -f /var/log/auth.log  # Debian/Ubuntu
   tail -f /var/log/secure    # RHEL/CentOS

5. Revoke key if compromised:
   Remove from ~/.ssh/authorized_keys on server
   Delete from GitHub repository secrets
   Generate and configure new key pair

════════════════════════════════════════════════════════════════
TESTING YOUR CONFIGURATION
════════════════════════════════════════════════════════════════

After adding secrets, verify they work:

1. Run this workflow again from GitHub Actions
2. Check the 'Detect and document available secrets' step
3. Verify all required secrets show ✅
4. Confirm no diagnostics are skipped (unless intentional)
5. Review artifacts to ensure data was collected

Common issues and fixes:

❌ "Permission denied (publickey)"
   → Public key not in authorized_keys on server
   → Wrong username in SERVER_USER
   → Key format issue (check for extra whitespace)

❌ "Host key verification failed"
   → Workflow includes ssh-keyscan step to handle this
   → Check SERVER_HOST is correct

❌ "Login failed" in browser/API tests
   → Check CONSOLE_ADMIN_USER and CONSOLE_ADMIN_PASSWORD
   → Verify credentials work manually first

════════════════════════════════════════════════════════════════
MINIMAL SETUP FOR TESTING
════════════════════════════════════════════════════════════════

If you want to test the workflow without remote server access:

1. Configure only CONSOLE_ADMIN_USER and CONSOLE_ADMIN_PASSWORD
2. Enable only:
   - Browser diagnostics
   - API profiling
3. Skip:
   - Backend diagnostics (requires SSH)
   - Resource monitoring (requires SSH)

This will run local diagnostics against the console URL without
requiring server access.

════════════════════════════════════════════════════════════════
FULL SETUP FOR PRODUCTION
════════════════════════════════════════════════════════════════

For complete diagnostic capabilities:

1. Configure all 5 secrets:
   ✅ SERVER_HOST
   ✅ SERVER_USER
   ✅ SSH_PRIVATE_KEY
   ✅ CONSOLE_ADMIN_USER
   ✅ CONSOLE_ADMIN_PASSWORD

2. Enable all diagnostic components in workflow inputs

3. Run with default settings for comprehensive analysis

════════════════════════════════════════════════════════════════
SUPPORT AND TROUBLESHOOTING
════════════════════════════════════════════════════════════════

If you encounter issues:

1. Check workflow logs for detailed error messages
2. Review MASTER-SUMMARY.txt for what was executed/skipped
3. Verify secrets are configured correctly in GitHub
4. Test SSH connection manually: ssh -i key user@host
5. Check server firewall allows SSH from GitHub Actions IPs
6. Review server logs: /var/log/auth.log or /var/log/secure

For more help:
  • Repository: docs/DIAGNOSTICS-GUIDE.md
  • Workflow file: .github/workflows/comprehensive-plugin-manager-diagnostics.yml
  • GitHub Actions: https://docs.github.com/en/actions/security-guides/encrypted-secrets

════════════════════════════════════════════════════════════════
END OF SECRETS CONFIGURATION GUIDE
════════════════════════════════════════════════════════════════
EOF

    log_success "Secrets guide generated"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    log_info "Starting diagnostics summary generation..."
    log_info "Output directory: ${OUTPUT_DIR}"
    
    # Create output directory
    mkdir -p "${OUTPUT_DIR}"
    
    # Generate all reports
    generate_master_summary
    generate_readme
    generate_secrets_guide
    
    log_success "All summary reports generated successfully!"
    log_info "Files created in ${OUTPUT_DIR}:"
    ls -lh "${OUTPUT_DIR}"
}

# Run main if executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
