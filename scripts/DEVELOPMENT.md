# Script Development Guide

This guide provides standards and best practices for developing scripts in the Minecraft Server repository.

## Table of Contents

- [Getting Started](#getting-started)
- [Script Structure](#script-structure)
- [Coding Standards](#coding-standards)
- [Error Handling](#error-handling)
- [Documentation Requirements](#documentation-requirements)
- [Testing](#testing)
- [Adding New Scripts](#adding-new-scripts)
- [Contributing](#contributing)

## Getting Started

### Prerequisites

Before developing scripts, ensure you have:

- Bash 4.0+ (for shell scripts)
- Node.js 18+ (for JavaScript scripts)
- Basic understanding of the project structure
- Familiarity with existing scripts

### Development Environment

```bash
# Clone the repository
git clone https://github.com/Festas/Minecraft-Server.git
cd Minecraft-Server

# Explore existing scripts
ls -la scripts/*/

# Read the main README
cat scripts/README.md
```

## Script Structure

### Directory Organization

Scripts are organized by function:

```
scripts/
├── run.sh                   # Unified wrapper script
├── README.md                # Main documentation
├── DEVELOPMENT.md           # This file
├── upgrade.sh               # Top-level automation
├── validate-launch.sh       # Top-level automation
├── diagnostics/             # Diagnostic scripts
│   ├── README.md
│   └── *.sh, *.js
├── api-testing/             # API test scripts
│   ├── README.md
│   └── *.sh
├── utilities/               # Utility scripts
│   ├── README.md
│   └── *.sh, *.js
└── lib/                     # Shared libraries
    ├── README.md
    └── *.sh
```

### Naming Conventions

**Shell Scripts (.sh):**
- Use lowercase with hyphens: `diagnose-plugins.sh`
- Action-target format: `test-api-auth.sh`
- Descriptive names that indicate purpose

**JavaScript Scripts (.js):**
- Use lowercase with hyphens: `browser-diagnostics.js`
- Match purpose: `migrate-users.js`

**Library Scripts:**
- Suffix with `-lib.sh`: `plugin-install-diagnostics-lib.sh`
- Clearly indicate shared functionality

## Coding Standards

### Bash Scripts

#### Header Format

Every bash script MUST include a comprehensive header:

```bash
#!/bin/bash
#
# Script: script-name.sh
# Description: What this script does in one or two sentences
# Usage: ./script-name.sh [options]
#
# Options:
#   -h, --help       Show this help message
#   -v, --verbose    Enable verbose output
#   -d, --dry-run    Show what would be done without doing it
#
# Environment Variables:
#   VAR_NAME         Description of variable (default: value)
#   ANOTHER_VAR      Another variable description
#
# Exit Codes:
#   0 - Success
#   1 - General error
#   2 - Invalid arguments
#
# Examples:
#   # Basic usage
#   ./script-name.sh
#
#   # With options
#   ./script-name.sh --verbose
#
#   # With environment variables
#   VAR_NAME="value" ./script-name.sh
#

set -euo pipefail  # REQUIRED: Strict error handling

# Rest of script...
```

#### Required Elements

1. **Shebang line:** `#!/bin/bash`

2. **Strict mode:** `set -euo pipefail`
   - `-e`: Exit on error
   - `-u`: Error on undefined variables
   - `-o pipefail`: Fail on pipe errors

3. **Error handling:**
   ```bash
   # For diagnostic scripts that should continue on errors
   set +e  # With explanation comment
   
   # Trap errors for cleanup
   trap cleanup EXIT
   
   cleanup() {
     # Cleanup code
     rm -f /tmp/temp-file
   }
   ```

4. **Dependency validation:**
   ```bash
   # Check for required commands
   for cmd in curl jq docker; do
     if ! command -v $cmd &> /dev/null; then
       echo "Error: $cmd is required but not installed"
       exit 2
     fi
   done
   ```

5. **Configuration variables:**
   ```bash
   # Configuration with defaults
   CONSOLE_URL="${CONSOLE_URL:-http://localhost:3000}"
   OUTPUT_DIR="${OUTPUT_DIR:-/tmp/script-output}"
   TIMEOUT="${TIMEOUT:-30}"
   ```

#### Code Style

```bash
# Use meaningful variable names
local plugin_name="MyPlugin"
local output_file="/tmp/output.txt"

# Use functions for reusability
check_prerequisites() {
  log_info "Checking prerequisites..."
  
  if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed"
    return 1
  fi
  
  return 0
}

# Use consistent logging
log_info() {
  echo "[INFO] $*"
}

log_error() {
  echo "[ERROR] $*" >&2
}

# Handle errors appropriately
if ! some_command; then
  log_error "Command failed"
  exit 1
fi

# Use arrays for multiple items
local files=("file1.txt" "file2.txt" "file3.txt")
for file in "${files[@]}"; do
  process_file "$file"
done

# Quote variables to handle spaces
local file_path="/path/to/my file.txt"
if [ -f "$file_path" ]; then
  cat "$file_path"
fi
```

### JavaScript Scripts

#### Header Format

```javascript
#!/usr/bin/env node

/**
 * Script: script-name.js
 * Description: What this script does in one or two sentences
 * 
 * Usage:
 *   node script-name.js [options]
 * 
 * Options:
 *   --help           Show this help message
 *   --verbose        Enable verbose output
 *   --config <file>  Configuration file path
 * 
 * Environment Variables:
 *   VAR_NAME - Description of variable (default: value)
 *   ANOTHER  - Another variable description
 * 
 * Exit Codes:
 *   0 - Success
 *   1 - General error
 *   2 - Invalid arguments
 * 
 * Examples:
 *   // Basic usage
 *   node script-name.js
 * 
 *   // With options
 *   node script-name.js --verbose
 * 
 *   // With environment variables
 *   VAR_NAME="value" node script-name.js
 */

// Imports
const fs = require('fs').promises;
const path = require('path');

// Configuration
const config = {
  varName: process.env.VAR_NAME || 'default',
  timeout: parseInt(process.env.TIMEOUT || '30000', 10)
};

// Main function
async function main() {
  try {
    // Script logic
    await doSomething();
    
    console.log('✓ Success');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
```

#### Code Style

```javascript
// Use async/await for asynchronous operations
async function doSomething() {
  try {
    const result = await asyncOperation();
    return result;
  } catch (error) {
    console.error('Operation failed:', error);
    throw error;
  }
}

// Use descriptive variable names
const pluginName = 'MyPlugin';
const outputDir = '/tmp/output';

// Use constants for magic numbers
const DEFAULT_TIMEOUT = 30000;
const MAX_RETRIES = 3;

// Handle errors appropriately
try {
  await riskyOperation();
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('File not found');
  } else {
    console.error('Unexpected error:', error.message);
  }
  process.exit(1);
}

// Use JSDoc for functions
/**
 * Process a plugin file
 * @param {string} pluginPath - Path to plugin file
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Processing result
 */
async function processPlugin(pluginPath, options = {}) {
  // Implementation
}
```

## Error Handling

### Bash

```bash
# Use set -e for strict error handling
set -euo pipefail

# Trap errors for cleanup
trap 'cleanup $?' EXIT

cleanup() {
  local exit_code=$1
  
  # Clean up temporary files
  rm -f /tmp/temp-*
  
  if [ $exit_code -ne 0 ]; then
    log_error "Script failed with exit code: $exit_code"
  fi
}

# Check command success
if ! command_that_might_fail; then
  log_error "Command failed"
  exit 1
fi

# Use || for fallback
result=$(command_with_output) || {
  log_error "Failed to get result"
  exit 1
}

# Validate inputs
if [ -z "$REQUIRED_VAR" ]; then
  log_error "REQUIRED_VAR must be set"
  exit 2
fi

if [ ! -f "$required_file" ]; then
  log_error "Required file not found: $required_file"
  exit 2
fi
```

### JavaScript

```javascript
// Use try-catch for error handling
try {
  await riskyOperation();
} catch (error) {
  console.error('Operation failed:', error.message);
  process.exit(1);
}

// Handle specific error types
try {
  const data = await fs.readFile(filePath, 'utf8');
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error(`File not found: ${filePath}`);
  } else if (error.code === 'EACCES') {
    console.error(`Permission denied: ${filePath}`);
  } else {
    console.error(`Error reading file: ${error.message}`);
  }
  process.exit(1);
}

// Validate inputs
if (!requiredParam) {
  console.error('Error: requiredParam is required');
  process.exit(2);
}

// Use finally for cleanup
let resource;
try {
  resource = await acquireResource();
  await useResource(resource);
} catch (error) {
  console.error('Error:', error.message);
  throw error;
} finally {
  if (resource) {
    await releaseResource(resource);
  }
}
```

## Documentation Requirements

### Inline Comments

```bash
# Good: Explain WHY, not WHAT
# Wait for backend to be ready before proceeding
for i in {1..30}; do
  if curl -s http://localhost:3001/health > /dev/null; then
    break
  fi
  sleep 1
done

# Bad: Stating the obvious
# Loop 30 times
for i in {1..30}; do
  # Call curl
  curl -s http://localhost:3001/health
done
```

### Function Documentation

```bash
# Bash functions
#
# Function: validate_plugin_file
# Description: Validates a plugin JAR file structure and manifest
# Arguments:
#   $1 - Path to plugin JAR file
#   $2 - Output file for validation results (optional)
# Returns:
#   0 if valid, 1 if invalid, 2 if file not found
# Example:
#   validate_plugin_file "/path/to/plugin.jar" "/tmp/validation.txt"
validate_plugin_file() {
  local jar_file="$1"
  local output_file="${2:-/dev/null}"
  
  # Implementation...
}
```

```javascript
// JavaScript functions
/**
 * Validate a plugin configuration object
 * @param {Object} config - Plugin configuration
 * @param {string} config.name - Plugin name
 * @param {string} config.version - Plugin version
 * @param {Array<string>} config.dependencies - Plugin dependencies
 * @returns {Object} Validation result with `valid` boolean and `errors` array
 * @throws {TypeError} If config is not an object
 * @example
 * const result = validatePluginConfig({
 *   name: 'MyPlugin',
 *   version: '1.0.0',
 *   dependencies: []
 * });
 */
function validatePluginConfig(config) {
  // Implementation...
}
```

### README Updates

When adding a new script, update relevant READMEs:

1. **scripts/README.md** - Add to main script list
2. **scripts/[category]/README.md** - Add to category README
3. **Wrapper script** - Add to run.sh if applicable

## Testing

### Manual Testing

Before committing, test your script:

```bash
# Test with valid inputs
./script.sh --option value

# Test with invalid inputs
./script.sh --invalid-option

# Test with missing required arguments
./script.sh

# Test with environment variables
VAR_NAME="value" ./script.sh

# Test error conditions
# (e.g., missing files, permissions, etc.)
```

### Automated Testing

For critical scripts, consider adding tests:

```bash
#!/bin/bash
# test-script.sh

source script-under-test.sh

# Test function
test_function_name() {
  local result
  result=$(function_name "input")
  
  if [ "$result" = "expected" ]; then
    echo "✓ Test passed"
    return 0
  else
    echo "✗ Test failed: expected 'expected', got '$result'"
    return 1
  fi
}

# Run tests
test_function_name || exit 1
```

## Adding New Scripts

### Checklist

When adding a new script:

- [ ] Follow naming conventions
- [ ] Add comprehensive header
- [ ] Use `set -euo pipefail` (bash)
- [ ] Add dependency validation
- [ ] Implement proper error handling
- [ ] Add inline documentation
- [ ] Create/update README
- [ ] Add to wrapper script (if user-facing)
- [ ] Test thoroughly
- [ ] Update workflows if needed
- [ ] Submit pull request

### Process

1. **Create the script:**
   ```bash
   # Choose appropriate directory
   cd scripts/diagnostics  # or api-testing, utilities, lib
   
   # Create script file
   touch new-script.sh
   chmod +x new-script.sh
   ```

2. **Add header and basic structure:**
   - Use template from this guide
   - Fill in description, usage, etc.
   - Add configuration variables

3. **Implement functionality:**
   - Follow coding standards
   - Use library functions when possible
   - Add appropriate error handling

4. **Test:**
   - Test with various inputs
   - Test error conditions
   - Test in different environments

5. **Document:**
   - Update category README
   - Update main README if needed
   - Add to wrapper script if user-facing

6. **Submit:**
   - Create pull request
   - Describe what the script does
   - Explain testing performed

## Contributing

### Code Review Checklist

When reviewing scripts, check for:

- [ ] Proper header with all required sections
- [ ] `set -euo pipefail` present (bash)
- [ ] Dependency validation included
- [ ] Error handling implemented
- [ ] Variables quoted appropriately
- [ ] Functions documented
- [ ] README updated
- [ ] No hardcoded secrets or sensitive data
- [ ] Security best practices followed

### Security Considerations

1. **Never hardcode secrets:**
   ```bash
   # Bad
   PASSWORD="admin123"
   
   # Good
   PASSWORD="${ADMIN_PASSWORD}"
   if [ -z "$PASSWORD" ]; then
     echo "Error: ADMIN_PASSWORD must be set"
     exit 1
   fi
   ```

2. **Validate inputs:**
   ```bash
   # Prevent command injection
   if [[ "$input" =~ [^a-zA-Z0-9_-] ]]; then
     echo "Error: Invalid input"
     exit 1
   fi
   ```

3. **Use secure temporary files:**
   ```bash
   # Use mktemp for temporary files
   temp_file=$(mktemp)
   trap 'rm -f "$temp_file"' EXIT
   ```

4. **Set appropriate permissions:**
   ```bash
   # Don't create world-writable files
   touch "$output_file"
   chmod 600 "$output_file"
   ```

### Best Practices

1. **Keep scripts focused:**
   - One script, one purpose
   - Use functions for reusability
   - Extract shared code to libraries

2. **Make scripts portable:**
   - Don't assume specific paths
   - Use environment variables for configuration
   - Support different environments

3. **Provide good feedback:**
   - Show progress for long operations
   - Use colors for readability
   - Provide helpful error messages

4. **Handle edge cases:**
   - Missing files
   - Insufficient permissions
   - Network failures
   - Timeouts

5. **Be defensive:**
   - Validate all inputs
   - Check command success
   - Don't assume anything exists

## Examples

### Complete Bash Script Example

See [../diagnostics/diagnose-plugins.sh](../diagnostics/diagnose-plugins.sh) for a comprehensive example.

### Complete JavaScript Script Example

See [../diagnostics/browser-diagnostics.js](../diagnostics/browser-diagnostics.js) for a comprehensive example.

## Getting Help

- Review existing scripts for examples
- Read the category READMEs
- Check [Bash best practices](https://google.github.io/styleguide/shellguide.html)
- Check [Node.js best practices](https://github.com/goldbergyoni/nodebestpractices)

## Related Documentation

- [README.md](README.md) - Main scripts documentation
- [diagnostics/README.md](diagnostics/README.md) - Diagnostics scripts guide
- [api-testing/README.md](api-testing/README.md) - API testing scripts guide
- [utilities/README.md](utilities/README.md) - Utility scripts guide
- [lib/README.md](lib/README.md) - Library scripts guide
