# Library Scripts

This directory contains shared library scripts and test scenarios used by other scripts and workflows.

## Overview

Library scripts are not meant to be run directly. They provide shared functions and test scenarios used by diagnostic workflows and other scripts.

## Scripts

### plugin-install-diagnostics-lib.sh

Shared diagnostic functions for plugin install testing.

**Used by:**
- `.github/workflows/plugin-install-diagnose.yml`
- Plugin install test scenarios
- Advanced plugin diagnostics

**Provides:**
```bash
# Logging functions
log_section()      # Log a major section header
log_subsection()   # Log a subsection header
log_info()         # Log informational message
log_success()      # Log success message
log_warning()      # Log warning message
log_error()        # Log error message

# Diagnostic functions
capture_system_state()        # Capture system state snapshot
capture_plugins_json()        # Capture plugins.json state
capture_plugins_dir()         # Capture plugins directory state
test_file_permissions()       # Test and report file permissions
docker_diagnostics()          # Docker container diagnostics
inspect_cookie_jar()          # Inspect cookie file contents
validate_csrf_token()         # Validate CSRF token implementation
compare_states()              # Compare before/after states
generate_summary()            # Generate test summary report
```

**Usage Example:**
```bash
#!/bin/bash
# Source the library
source /path/to/plugin-install-diagnostics-lib.sh

# Use library functions
log_section "System Diagnostics"
capture_system_state "/tmp/diagnostics/system-state.txt"
docker_diagnostics "minecraft-console" "/tmp/diagnostics/docker.txt"
```

**Key Features:**
- Consistent logging format with colors
- Comprehensive diagnostic data collection
- Docker container inspection
- Cookie and CSRF validation
- State comparison utilities
- Structured output generation

### plugin-install-test-scenarios.sh

Comprehensive test scenarios for plugin installation validation.

**Used by:**
- `.github/workflows/plugin-install-diagnose.yml`
- Plugin install testing

**Test Scenarios:**

1. **Scenario 01: Valid CSRF and Session**
   - Expected: Success (200)
   - Tests complete valid flow

2. **Scenario 02: Missing CSRF Token**
   - Expected: Forbidden (403)
   - Tests CSRF protection

3. **Scenario 03: Invalid CSRF Token**
   - Expected: Forbidden (403)
   - Tests CSRF validation

4. **Scenario 04: Missing Session Cookie**
   - Expected: Unauthorized (401)
   - Tests authentication requirement

5. **Scenario 05: Invalid Session Cookie**
   - Expected: Unauthorized (401)
   - Tests session validation

6. **Scenario 06: Expired Session**
   - Expected: Unauthorized (401)
   - Tests session expiration (if feasible)

**Usage:**
```bash
# Set required environment variables
export ADMIN_USER="admin"
export ADMIN_PASS="password"
export TEST_PLUGIN_URL="https://example.com/plugin.jar"
export API_BASE_URL="http://localhost:3001"
export RESULTS_DIR="/tmp/test-results"
export RUN_ALL_SCENARIOS="true"

# Run test scenarios
./scripts/lib/plugin-install-test-scenarios.sh
```

**Output Structure:**
```
$RESULTS_DIR/
├── comprehensive-summary.txt          # Overall test summary
├── scenario-01-valid/
│   ├── scenario-result.txt           # PASS/FAIL/SKIP
│   ├── login-request.json
│   ├── login-response.json
│   ├── csrf-response.json
│   ├── install-request.json
│   ├── install-response.json
│   ├── post-login-cookies.txt
│   ├── post-csrf-cookies.txt
│   ├── post-install-cookies.txt
│   └── csrf-validation.txt
├── scenario-02-missing-csrf/
│   └── ...
└── scenario-03-invalid-csrf/
    └── ...
```

**Exit Codes:**
- `0` - All scenarios passed
- `1` - One or more scenarios failed
- `2` - Configuration error

## How to Use Library Scripts

### In Shell Scripts

```bash
#!/bin/bash
set -euo pipefail

# Source the diagnostics library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../lib/plugin-install-diagnostics-lib.sh"

# Use library functions
log_section "Starting Diagnostics"
log_info "Checking system state..."

# Capture diagnostics
DIAG_DIR="/tmp/my-diagnostics"
mkdir -p "$DIAG_DIR"

capture_system_state "$DIAG_DIR/system.txt"
docker_diagnostics "minecraft-console" "$DIAG_DIR/docker.txt"

log_success "Diagnostics complete"
```

### In GitHub Workflows

```yaml
- name: Upload diagnostic library
  run: |
    scp -i ~/.ssh/id_rsa \
      scripts/lib/plugin-install-diagnostics-lib.sh \
      ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }}:/tmp/

- name: Run diagnostics
  run: |
    ssh -i ~/.ssh/id_rsa ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }} << 'EOF'
      # Source library
      source /tmp/plugin-install-diagnostics-lib.sh
      
      # Use functions
      log_section "System Diagnostics"
      capture_system_state "/tmp/diagnostics/system.txt"
    EOF
```

## Function Reference

### Logging Functions

```bash
log_section "Major Section"
# Output:
# ═══════════════════════════════════════════════════════════════
# MAJOR SECTION
# ═══════════════════════════════════════════════════════════════

log_subsection "Sub Section"
# Output: --- SUB SECTION ---

log_info "Information message"
# Output: ℹ Information message

log_success "Success message"
# Output: ✓ Success message

log_warning "Warning message"
# Output: ⚠ Warning message

log_error "Error message"
# Output: ✗ Error message
```

### Diagnostic Functions

```bash
# Capture system state
capture_system_state "/tmp/output.txt"
# Captures: uptime, disk usage, memory, processes

# Capture plugins.json
capture_plugins_json "/path/to/plugins.json" "/tmp/output.txt"
# Captures: JSON content, structure, validation

# Test file permissions
test_file_permissions "/path/to/file" "/tmp/output.txt"
# Tests: read, write, execute permissions

# Docker diagnostics
docker_diagnostics "container-name" "/tmp/output.txt"
# Captures: status, health, logs, stats

# Cookie inspection
inspect_cookie_jar "/path/to/cookies.txt" "/tmp/output.txt"
# Analyzes: session cookies, CSRF cookies, expiry

# CSRF validation
validate_csrf_token "/path/to/csrf-response.json" "/path/to/cookies.txt" "/tmp/output.txt"
# Validates: token format, cookie matching, security

# Compare states
compare_states "/tmp/before.json" "/tmp/after.json" "/tmp/diff.txt"
# Compares: JSON structures, identifies changes

# Generate summary
generate_summary "/tmp/test-results" "/tmp/summary.txt"
# Creates: comprehensive test summary report
```

## Testing Library Functions

### Unit Testing

```bash
#!/bin/bash
# test-library.sh

source scripts/lib/plugin-install-diagnostics-lib.sh

# Test logging
log_section "Test Logging"
log_info "Testing info log"
log_success "Testing success log"
log_warning "Testing warning log"
log_error "Testing error log"

# Test diagnostics
DIAG_DIR="/tmp/test-diagnostics"
mkdir -p "$DIAG_DIR"

capture_system_state "$DIAG_DIR/system.txt"
if [ -f "$DIAG_DIR/system.txt" ]; then
  log_success "System state captured"
else
  log_error "Failed to capture system state"
fi

# Clean up
rm -rf "$DIAG_DIR"
```

## Best Practices

### When Creating New Library Functions

1. **Follow naming conventions:**
   - Use snake_case for function names
   - Use descriptive names that indicate purpose
   - Prefix with category (log_, capture_, validate_, etc.)

2. **Add comprehensive documentation:**
   ```bash
   # Function: capture_system_state
   # Description: Captures comprehensive system state information
   # Arguments:
   #   $1 - Output file path
   # Returns:
   #   0 on success, 1 on error
   # Example:
   #   capture_system_state "/tmp/system.txt"
   ```

3. **Handle errors gracefully:**
   ```bash
   capture_data() {
     local output_file="$1"
     
     if [ -z "$output_file" ]; then
       log_error "Output file not specified"
       return 1
     fi
     
     # Capture data with error handling
     some_command > "$output_file" 2>&1 || {
       log_error "Failed to capture data"
       return 1
     }
     
     return 0
   }
   ```

4. **Make functions reusable:**
   - Don't hardcode paths or values
   - Use parameters for configuration
   - Support optional parameters with defaults

5. **Test thoroughly:**
   - Test with valid inputs
   - Test with invalid inputs
   - Test error conditions
   - Test in different environments

### When Using Library Functions

1. **Always source the library:**
   ```bash
   source "$(dirname "$0")/../lib/plugin-install-diagnostics-lib.sh"
   ```

2. **Check return codes:**
   ```bash
   if capture_system_state "/tmp/state.txt"; then
     log_success "State captured"
   else
     log_error "Failed to capture state"
     exit 1
   fi
   ```

3. **Validate inputs:**
   ```bash
   if [ -z "$output_dir" ]; then
     log_error "Output directory required"
     exit 1
   fi
   ```

## Extending the Library

To add new shared functions:

1. Add function to appropriate library file
2. Document the function with header comments
3. Update this README with function details
4. Add usage examples
5. Test the function
6. Update dependent scripts if needed

Example:
```bash
# Add to plugin-install-diagnostics-lib.sh

# Function: validate_json_file
# Description: Validates JSON file syntax and structure
# Arguments:
#   $1 - JSON file path
#   $2 - Output file path (optional)
# Returns:
#   0 if valid, 1 if invalid
# Example:
#   validate_json_file "/path/to/file.json" "/tmp/validation.txt"
validate_json_file() {
  local json_file="$1"
  local output_file="${2:-/dev/null}"
  
  if [ ! -f "$json_file" ]; then
    echo "File not found: $json_file" >> "$output_file"
    return 1
  fi
  
  if jq empty "$json_file" 2>&1 >> "$output_file"; then
    echo "✓ Valid JSON" >> "$output_file"
    return 0
  else
    echo "✗ Invalid JSON" >> "$output_file"
    return 1
  fi
}
```

## Related Documentation

- [../README.md](../README.md) - Main scripts documentation
- [../DEVELOPMENT.md](../DEVELOPMENT.md) - Script development guide
- [../diagnostics/README.md](../diagnostics/README.md) - Diagnostics scripts
- [../../docs/troubleshooting/plugin-diagnostics.md](../../docs/troubleshooting/plugin-diagnostics.md) - Plugin diagnostics guide
