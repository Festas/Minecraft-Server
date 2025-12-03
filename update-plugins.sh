#!/bin/bash

################################################################################
# Minecraft Plugin Update Script
# 
# This script checks for and installs plugin updates, backing up old versions.
#
# Usage:
#   ./update-plugins.sh              # Check and install updates
#   ./update-plugins.sh --check      # Only check for updates (don't install)
#   ./update-plugins.sh --help       # Show help message
################################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGINS_DIR="${SCRIPT_DIR}/plugins"
BACKUP_DIR="${PLUGINS_DIR}/backups"
LOG_FILE="${SCRIPT_DIR}/plugin-update.log"

# Command line flags
CHECK_ONLY=false

################################################################################
# Helper Functions
################################################################################

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✓${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}✗${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1" | tee -a "$LOG_FILE"
}

show_help() {
    cat << EOF
Minecraft Plugin Update Script

Usage: $0 [OPTIONS]

OPTIONS:
    --check      Only check for updates without installing
    --help       Show this help message

EXAMPLES:
    $0                 # Check and install all available updates
    $0 --check         # Only check for updates

NOTES:
    - Old plugin JARs are backed up to plugins/backups/ before updating
    - This script uses install-plugins.sh with --update flag
    - Enable/disable plugins in plugins.json

EOF
    exit 0
}

################################################################################
# Backup Function
################################################################################

backup_plugins() {
    if [ ! -d "$PLUGINS_DIR" ] || [ -z "$(ls -A "$PLUGINS_DIR"/*.jar 2>/dev/null)" ]; then
        log "No plugins to backup"
        return 0
    fi
    
    log "Creating backup of current plugins..."
    
    # Create backup directory with timestamp
    local timestamp
    timestamp=$(date +'%Y%m%d_%H%M%S')
    local backup_path="${BACKUP_DIR}/backup_${timestamp}"
    
    mkdir -p "$backup_path"
    
    # Copy all JAR files to backup
    local jar_count=0
    for jar in "$PLUGINS_DIR"/*.jar; do
        if [ -f "$jar" ]; then
            cp "$jar" "$backup_path/"
            ((jar_count++))
        fi
    done
    
    if [ $jar_count -gt 0 ]; then
        success "Backed up ${jar_count} plugins to ${backup_path}"
    else
        log "No JAR files found to backup"
    fi
    
    # Keep only last 5 backups
    log "Cleaning old backups (keeping last 5)..."
    ls -dt "${BACKUP_DIR}"/backup_* 2>/dev/null | tail -n +6 | xargs rm -rf 2>/dev/null || true
}

################################################################################
# Main Script
################################################################################

main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --check)
                CHECK_ONLY=true
                shift
                ;;
            --help)
                show_help
                ;;
            *)
                error "Unknown option: $1"
                show_help
                ;;
        esac
    done
    
    echo ""
    log "=== Minecraft Plugin Updater ==="
    echo ""
    
    # Check if install-plugins.sh exists
    if [ ! -f "${SCRIPT_DIR}/install-plugins.sh" ]; then
        error "install-plugins.sh not found in ${SCRIPT_DIR}"
        exit 1
    fi
    
    if [ "$CHECK_ONLY" = true ]; then
        log "Check-only mode: Will report available updates without installing"
        echo ""
        
        # Just show what would be updated (dry run isn't implemented in install-plugins.sh)
        # So we'll just inform the user to check manually
        warning "Check-only mode: Run './install-plugins.sh --update' to see available updates"
        warning "Full check-only mode not yet implemented - use install-plugins.sh --update for now"
        exit 0
    fi
    
    # Create backup before updating
    backup_plugins
    
    echo ""
    log "Checking for plugin updates..."
    echo ""
    
    # Run install-plugins.sh with --update flag
    if "${SCRIPT_DIR}/install-plugins.sh" --update; then
        success "Plugin update check completed successfully"
    else
        error "Plugin update failed"
        warning "Your old plugins are backed up in: ${BACKUP_DIR}"
        exit 1
    fi
    
    echo ""
    log "Update process completed"
    log "Backups are stored in: ${BACKUP_DIR}"
    echo ""
}

# Run main function
main "$@"
