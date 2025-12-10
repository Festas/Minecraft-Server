#!/bin/bash
#
# Script: run.sh
# Description: Unified wrapper script for all Minecraft Server diagnostic and utility scripts
# Usage: ./scripts/run.sh <category> <script> [args...]
#        ./scripts/run.sh --help
#        ./scripts/run.sh --list
#
# Categories:
#   diagnostics  - Diagnostic scripts (browser, plugins, resource monitoring)
#   api-test     - API testing scripts (profiler, auth, integration)
#   utility      - Utility scripts (competition manager, RCON validation)
#
# Examples:
#   ./scripts/run.sh diagnostics browser
#   ./scripts/run.sh diagnostics plugins diagnose
#   ./scripts/run.sh api-test auth
#   ./scripts/run.sh utility competition
#   ./scripts/run.sh --list
#
# Exit Codes:
#   0 - Success
#   1 - Invalid arguments or script not found
#   2 - Environment validation failed
#   * - Script-specific exit code
#

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Print colored output
print_color() {
    local color="$1"
    shift
    echo -e "${color}$*${NC}"
}

print_header() {
    echo ""
    print_color "$CYAN" "╔════════════════════════════════════════════════════════════════╗"
    print_color "$CYAN" "║  Minecraft Server - Script Runner                              ║"
    print_color "$CYAN" "╚════════════════════════════════════════════════════════════════╝"
    echo ""
}

print_help() {
    print_header
    cat << EOF
${BOLD}USAGE:${NC}
    ./scripts/run.sh <category> <script> [args...]
    ./scripts/run.sh --help
    ./scripts/run.sh --list

${BOLD}CATEGORIES:${NC}
    diagnostics  - Diagnostic and troubleshooting scripts
    api-test     - API testing and profiling scripts
    utility      - Utility and management scripts

${BOLD}DIAGNOSTICS SCRIPTS:${NC}
    browser             - Browser automation diagnostics (Puppeteer)
    plugins             - Plugin manager diagnostics [diagnose|fix]
    plugins-advanced    - Advanced plugin diagnostics
    diagnose            - General server diagnostics
    resource-monitor    - System resource monitoring
    summary             - Generate diagnostics summary

${BOLD}API TESTING SCRIPTS:${NC}
    profiler            - Comprehensive API profiling
    auth                - API authentication testing
    integration         - API integration testing
    csrf                - CSRF protection testing

${BOLD}UTILITY SCRIPTS:${NC}
    competition         - Build competition manager
    rcon-validate       - RCON password validation
    migrate-users       - User migration utility

${BOLD}EXAMPLES:${NC}
    # Run browser diagnostics
    ./scripts/run.sh diagnostics browser

    # Run plugin diagnostics in fix mode
    ./scripts/run.sh diagnostics plugins fix

    # Run API profiler
    ./scripts/run.sh api-test profiler

    # Run competition manager
    ./scripts/run.sh utility competition

    # List all available scripts
    ./scripts/run.sh --list

${BOLD}ENVIRONMENT VARIABLES:${NC}
    Many scripts use environment variables for configuration.
    See individual script documentation for details.

    Common variables:
    - CONSOLE_URL        Console base URL (default: http://localhost:3000)
    - ADMIN_USERNAME     Admin username (default: admin)
    - ADMIN_PASSWORD     Admin password
    - OUTPUT_DIR         Output directory for results

${BOLD}MORE INFORMATION:${NC}
    For detailed documentation, see:
    - scripts/README.md              - Main scripts documentation
    - scripts/DEVELOPMENT.md         - Script development guide
    - scripts/diagnostics/README.md  - Diagnostics guide
    - scripts/api-testing/README.md  - API testing guide
    - scripts/utilities/README.md    - Utilities guide

EOF
}

list_scripts() {
    print_header
    print_color "$BOLD" "AVAILABLE SCRIPTS:"
    echo ""
    
    print_color "$GREEN" "DIAGNOSTICS (./scripts/run.sh diagnostics <script>):"
    echo "  browser             - Browser automation diagnostics"
    echo "  plugins             - Plugin manager diagnostics"
    echo "  plugins-advanced    - Advanced plugin diagnostics"
    echo "  diagnose            - General server diagnostics"
    echo "  resource-monitor    - System resource monitoring"
    echo "  summary             - Generate diagnostics summary"
    echo ""
    
    print_color "$GREEN" "API TESTING (./scripts/run.sh api-test <script>):"
    echo "  profiler            - Comprehensive API profiling"
    echo "  auth                - API authentication testing"
    echo "  integration         - API integration testing"
    echo "  csrf                - CSRF protection testing"
    echo ""
    
    print_color "$GREEN" "UTILITIES (./scripts/run.sh utility <script>):"
    echo "  competition         - Build competition manager"
    echo "  rcon-validate       - RCON password validation"
    echo "  migrate-users       - User migration utility"
    echo ""
}

validate_environment() {
    # Basic environment validation
    local warnings=0
    
    # Check for required tools
    if ! command -v curl &> /dev/null; then
        print_color "$YELLOW" "⚠ Warning: curl not found (required by API scripts)"
        ((warnings++))
    fi
    
    if ! command -v jq &> /dev/null; then
        print_color "$YELLOW" "⚠ Warning: jq not found (recommended for JSON parsing)"
        ((warnings++))
    fi
    
    # Check for Node.js (required for browser diagnostics)
    if ! command -v node &> /dev/null; then
        print_color "$YELLOW" "⚠ Warning: Node.js not found (required for browser diagnostics)"
        ((warnings++))
    fi
    
    if [ $warnings -gt 0 ]; then
        print_color "$YELLOW" "⚠ Some tools are missing. Some scripts may not work correctly."
        return 1
    fi
    
    return 0
}

run_script() {
    local category="$1"
    local script_name="$2"
    shift 2
    local args=("$@")
    
    local script_path=""
    local script_file=""
    
    # Map script names to actual files
    case "$category" in
        diagnostics)
            case "$script_name" in
                browser)
                    script_path="$SCRIPT_DIR/diagnostics/browser-diagnostics.js"
                    script_file="node"
                    ;;
                plugins)
                    script_path="$SCRIPT_DIR/diagnostics/diagnose-plugins.sh"
                    ;;
                plugins-advanced)
                    script_path="$SCRIPT_DIR/diagnostics/diagnose-plugins-advanced.sh"
                    ;;
                diagnose)
                    script_path="$SCRIPT_DIR/diagnostics/diagnose.sh"
                    ;;
                resource-monitor)
                    script_path="$SCRIPT_DIR/diagnostics/resource-monitor.sh"
                    ;;
                summary)
                    script_path="$SCRIPT_DIR/diagnostics/generate-diagnostics-summary.sh"
                    ;;
                *)
                    print_color "$RED" "✗ Unknown diagnostics script: $script_name"
                    echo ""
                    echo "Run './scripts/run.sh --list' to see available scripts"
                    exit 1
                    ;;
            esac
            ;;
        api-test)
            case "$script_name" in
                profiler)
                    script_path="$SCRIPT_DIR/api-testing/api-profiler.sh"
                    ;;
                auth)
                    script_path="$SCRIPT_DIR/api-testing/test-api-auth.sh"
                    ;;
                integration)
                    script_path="$SCRIPT_DIR/api-testing/test-api-integration.sh"
                    ;;
                csrf)
                    script_path="$SCRIPT_DIR/api-testing/test-csrf-double-submit.sh"
                    ;;
                *)
                    print_color "$RED" "✗ Unknown API test script: $script_name"
                    echo ""
                    echo "Run './scripts/run.sh --list' to see available scripts"
                    exit 1
                    ;;
            esac
            ;;
        utility)
            case "$script_name" in
                competition)
                    script_path="$SCRIPT_DIR/utilities/competition-manager.sh"
                    ;;
                rcon-validate)
                    script_path="$SCRIPT_DIR/utilities/validate-rcon-password.sh"
                    ;;
                migrate-users)
                    script_path="$SCRIPT_DIR/utilities/migrate-users.js"
                    script_file="node"
                    ;;
                *)
                    print_color "$RED" "✗ Unknown utility script: $script_name"
                    echo ""
                    echo "Run './scripts/run.sh --list' to see available scripts"
                    exit 1
                    ;;
            esac
            ;;
        *)
            print_color "$RED" "✗ Unknown category: $category"
            echo ""
            echo "Valid categories: diagnostics, api-test, utility"
            echo "Run './scripts/run.sh --help' for more information"
            exit 1
            ;;
    esac
    
    # Check if script exists
    if [ ! -f "$script_path" ]; then
        print_color "$RED" "✗ Script not found: $script_path"
        exit 1
    fi
    
    # Check if script is executable
    if [ ! -x "$script_path" ]; then
        print_color "$YELLOW" "⚠ Warning: Script is not executable, fixing..."
        chmod +x "$script_path"
    fi
    
    # Run the script
    print_color "$CYAN" "▶ Running: $category/$script_name"
    print_color "$CYAN" "═══════════════════════════════════════════════════════════════"
    echo ""
    
    if [ "$script_file" = "node" ]; then
        # Run with Node.js
        node "$script_path" "${args[@]}"
    else
        # Run bash script
        "$script_path" "${args[@]}"
    fi
    
    local exit_code=$?
    
    echo ""
    print_color "$CYAN" "═══════════════════════════════════════════════════════════════"
    
    if [ $exit_code -eq 0 ]; then
        print_color "$GREEN" "✓ Script completed successfully"
    else
        print_color "$RED" "✗ Script exited with code: $exit_code"
    fi
    
    return $exit_code
}

# Main script logic
main() {
    # Check for help flag
    if [ $# -eq 0 ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        print_help
        exit 0
    fi
    
    # Check for list flag
    if [ "$1" = "--list" ] || [ "$1" = "-l" ]; then
        list_scripts
        exit 0
    fi
    
    # Need at least category and script name
    if [ $# -lt 2 ]; then
        print_color "$RED" "✗ Error: Missing arguments"
        echo ""
        echo "Usage: ./scripts/run.sh <category> <script> [args...]"
        echo "Run './scripts/run.sh --help' for more information"
        exit 1
    fi
    
    # Validate environment (non-fatal)
    validate_environment || true
    
    # Run the requested script
    run_script "$@"
}

# Run main function
main "$@"
