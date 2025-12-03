#!/bin/bash

################################################################################
# Minecraft Plugin Auto-Installer
# 
# This script automatically downloads and installs Minecraft plugins from
# various sources (GitHub Releases, Modrinth) based on plugins.json config.
#
# Usage:
#   ./install-plugins.sh              # Install all enabled plugins
#   ./install-plugins.sh --force      # Force re-download all plugins
#   ./install-plugins.sh --update     # Check for and install updates
#   ./install-plugins.sh --help       # Show help message
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
CONFIG_FILE="${SCRIPT_DIR}/plugins.json"
LOG_FILE="${SCRIPT_DIR}/plugin-install.log"
VERSION_CACHE="${PLUGINS_DIR}/.plugin_versions"

# Command line flags
FORCE_DOWNLOAD=false
UPDATE_MODE=false
DEBUG_MODE=false
DRY_RUN_MODE=false

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

debug() {
    if [ "$DEBUG_MODE" = true ]; then
        echo -e "${YELLOW}[DEBUG]${NC} $1" | tee -a "$LOG_FILE"
    fi
}

validate_url() {
    local url="$1"
    
    if [ -z "$url" ]; then
        debug "URL validation failed: URL is empty"
        return 1
    fi
    
    if [[ ! "$url" =~ ^https:// ]]; then
        debug "URL validation failed: URL does not start with https://"
        return 1
    fi
    
    if [[ ! "$url" =~ \.jar$ ]]; then
        warning "URL does not end with .jar: $url"
    fi
    
    return 0
}

validate_download() {
    local file="$1"
    
    if [ ! -f "$file" ]; then
        error "Downloaded file does not exist: $file"
        return 1
    fi
    
    # Check file size (works on both Linux and macOS)
    local size
    size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
    
    if [ -z "$size" ] || [ "$size" -eq 0 ]; then
        error "Downloaded file is empty: $file"
        rm -f "$file"
        return 1
    fi
    
    debug "Downloaded file size: ${size} bytes"
    
    # Verify it's a valid ZIP/JAR file (JAR files are ZIP archives)
    if command -v file &> /dev/null; then
        local file_type
        file_type=$(file -b "$file")
        if [[ ! "$file_type" =~ (Zip|Java) ]]; then
            warning "Downloaded file may not be a valid JAR: $file_type"
        else
            debug "File type verified: $file_type"
        fi
    fi
    
    return 0
}

show_help() {
    cat << EOF
Minecraft Plugin Auto-Installer

Usage: $0 [OPTIONS]

OPTIONS:
    --force      Force re-download all plugins (skip version check)
    --update     Check for and download plugin updates
    --debug      Enable debug mode for verbose output
    --dry-run    Validate configuration and test API access without downloading
    --help       Show this help message

EXAMPLES:
    $0                 # Install all enabled plugins
    $0 --force         # Force re-download all plugins
    $0 --update        # Update all plugins to latest versions
    $0 --debug         # Run with debug output to troubleshoot issues
    $0 --dry-run       # Test configuration without downloading

CONFIGURATION:
    Edit plugins.json to enable/disable plugins or add new ones.
    Set "enabled": true/false for each plugin.

TROUBLESHOOTING:
    If downloads fail, try:
    - Use --debug to see detailed error messages
    - Set GITHUB_TOKEN environment variable to avoid rate limiting
    - Check if the repository has releases
    - Verify asset patterns match actual file names

EOF
    exit 0
}

################################################################################
# Dependency Checks
################################################################################

check_dependencies() {
    log "Checking required dependencies..."
    
    local missing_deps=()
    
    # Check for curl or wget
    if ! command -v curl &> /dev/null && ! command -v wget &> /dev/null; then
        missing_deps+=("curl or wget")
    fi
    
    # Check for jq
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        error "Missing required dependencies: ${missing_deps[*]}"
        echo ""
        echo "Please install missing dependencies:"
        echo ""
        echo "  Ubuntu/Debian:"
        echo "    sudo apt update && sudo apt install -y curl jq"
        echo ""
        echo "  CentOS/RHEL:"
        echo "    sudo yum install -y curl jq"
        echo ""
        echo "  macOS:"
        echo "    brew install curl jq"
        echo ""
        exit 1
    fi
    
    success "All dependencies are installed"
}

################################################################################
# Download Functions
################################################################################

download_file() {
    local url="$1"
    local output="$2"
    local http_code
    
    if command -v curl &> /dev/null; then
        http_code=$(curl -L -w "%{http_code}" -o "$output" -s "$url")
        if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
            return 0
        else
            error "HTTP error $http_code when downloading: $url"
            rm -f "$output"
            return 1
        fi
    elif command -v wget &> /dev/null; then
        if wget -q -O "$output" "$url"; then
            return 0
        else
            error "Failed to download: $url"
            rm -f "$output"
            return 1
        fi
    else
        return 1
    fi
}

download_with_retry() {
    local url="$1"
    local output="$2"
    local max_attempts=3
    local attempt=1
    local wait_time=2
    
    while [ $attempt -le $max_attempts ]; do
        debug "Download attempt $attempt of $max_attempts"
        
        if download_file "$url" "$output"; then
            return 0
        fi
        
        if [ $attempt -lt $max_attempts ]; then
            warning "Download attempt $attempt failed, retrying in ${wait_time}s..."
            sleep $wait_time
            ((wait_time*=2))
        fi
        
        ((attempt++))
    done
    
    error "All $max_attempts download attempts failed for: $url"
    return 1
}

################################################################################
# GitHub Release Functions
################################################################################

get_github_latest_release() {
    local repo="$1"
    local api_url="https://api.github.com/repos/${repo}/releases/latest"
    
    # Use GitHub token if available to avoid rate limiting
    if [ -n "${GITHUB_TOKEN:-}" ]; then
        if command -v curl &> /dev/null; then
            curl -s -H "Authorization: Bearer ${GITHUB_TOKEN}" "$api_url"
        else
            wget -q -O - --header="Authorization: Bearer ${GITHUB_TOKEN}" "$api_url"
        fi
    else
        if command -v curl &> /dev/null; then
            curl -s "$api_url"
        else
            wget -q -O - "$api_url"
        fi
    fi
}

find_matching_asset() {
    local release_json="$1"
    local pattern="$2"
    
    # Check if assets array exists and is not empty
    local has_assets
    has_assets=$(echo "$release_json" | jq 'has("assets") and (.assets | length > 0)')
    
    if [ "$has_assets" != "true" ]; then
        echo ""
        return 1
    fi
    
    # Find asset URL matching the pattern
    # Note: Uses case-insensitive matching ("i" flag) for flexibility
    local url
    url=$(echo "$release_json" | jq -r --arg pattern "$pattern" '
        .assets // [] | 
        map(select(.name | test($pattern; "i"))) | 
        if length > 0 then .[0].browser_download_url else empty end
    ')
    
    echo "$url"
}

get_release_version() {
    local release_json="$1"
    local version
    version=$(echo "$release_json" | jq -r '.tag_name // empty')
    if [ -z "$version" ] || [ "$version" = "null" ]; then
        echo ""
        return 1
    fi
    echo "$version"
}

install_github_plugin() {
    local name="$1"
    local repo="$2"
    local pattern="$3"
    
    log "Fetching latest release for ${name} from GitHub..."
    debug "Repository: ${repo}"
    debug "Asset pattern: ${pattern}"
    
    local release_json
    release_json=$(get_github_latest_release "$repo")
    
    # Check for API errors
    if [ -z "$release_json" ]; then
        error "Empty response from GitHub API for ${name}"
        return 1
    fi
    
    # Check for error message in response
    local api_message
    api_message=$(echo "$release_json" | jq -r '.message // empty')
    if [ -n "$api_message" ]; then
        error "GitHub API error for ${name}: ${api_message}"
        debug "Full response: $release_json"
        return 1
    fi
    
    local version
    version=$(get_release_version "$release_json")
    
    if [ -z "$version" ]; then
        error "Could not determine version for ${name}"
        debug "Release JSON: $release_json"
        return 1
    fi
    
    debug "Found version: ${version}"
    
    # List available assets for debugging
    if [ "$DEBUG_MODE" = true ]; then
        debug "Available assets:"
        echo "$release_json" | jq -r '.assets // [] | map(.name // "unknown") | .[]' 2>/dev/null | while read -r asset; do
            if [ -n "$asset" ]; then
                debug "  - $asset"
            fi
        done
    fi
    
    local asset_url
    asset_url=$(find_matching_asset "$release_json" "$pattern")
    
    if [ -z "$asset_url" ]; then
        error "No matching asset found for pattern: ${pattern}"
        warning "Troubleshooting suggestions:"
        warning "  1. Check available assets below and update the pattern in plugins.json"
        warning "  2. Verify the repository has releases: https://github.com/${repo}/releases"
        warning "  3. Use --debug mode for more details"
        warning "Available assets in release:"
        echo "$release_json" | jq -r '.assets // [] | map(.name // "unknown") | if length > 0 then .[] else "No assets found" end' 2>/dev/null | head -10
        return 1
    fi
    
    # Validate URL before attempting download
    if ! validate_url "$asset_url"; then
        error "Invalid asset URL for ${name}: ${asset_url}"
        return 1
    fi
    
    debug "Matched asset URL: ${asset_url}"
    
    local filename
    filename=$(basename "$asset_url")
    local output_path="${PLUGINS_DIR}/${filename}"
    
    # Check if already downloaded (unless force mode)
    if [ "$FORCE_DOWNLOAD" = false ] && [ -f "$output_path" ]; then
        local cached_version
        cached_version=$(grep "^${name}:" "$VERSION_CACHE" 2>/dev/null | cut -d: -f2 || echo "")
        
        if [ "$cached_version" = "$version" ]; then
            success "${name} ${version} already installed (${filename})"
            return 0
        elif [ "$UPDATE_MODE" = false ]; then
            success "${name} already exists (${filename}), use --update to check for updates"
            return 0
        fi
    fi
    
    # In dry-run mode, just show what would be downloaded
    if [ "$DRY_RUN_MODE" = true ]; then
        success "[DRY RUN] Would download ${name} ${version} → ${filename}"
        log "  URL: ${asset_url}"
        return 0
    fi
    
    log "Downloading ${name} ${version}..."
    log "  URL: ${asset_url}"
    
    if download_with_retry "$asset_url" "$output_path"; then
        # Validate the downloaded file
        if validate_download "$output_path"; then
            success "Downloaded ${name} ${version} → ${filename}"
            
            # Update version cache
            grep -v "^${name}:" "$VERSION_CACHE" 2>/dev/null > "${VERSION_CACHE}.tmp" || true
            echo "${name}:${version}" >> "${VERSION_CACHE}.tmp"
            mv "${VERSION_CACHE}.tmp" "$VERSION_CACHE"
            
            return 0
        else
            error "Downloaded file validation failed for ${name}"
            return 1
        fi
    else
        error "Failed to download ${name} after multiple attempts"
        warning "Troubleshooting suggestions:"
        warning "  1. Check your internet connection"
        warning "  2. Verify the URL is accessible: ${asset_url}"
        warning "  3. If rate limited, set GITHUB_TOKEN environment variable"
        return 1
    fi
}

################################################################################
# Modrinth Functions
################################################################################

get_modrinth_versions() {
    local project_id="$1"
    local api_url="https://api.modrinth.com/v2/project/${project_id}/version"
    
    if command -v curl &> /dev/null; then
        curl -s "$api_url"
    else
        wget -q -O - "$api_url"
    fi
}

install_modrinth_plugin() {
    local name="$1"
    local project_id="$2"
    
    log "Fetching latest version for ${name} from Modrinth..."
    
    local versions_json
    versions_json=$(get_modrinth_versions "$project_id")
    
    if [ -z "$versions_json" ] || [ "$versions_json" = "null" ]; then
        error "Failed to fetch version information for ${name}"
        return 1
    fi
    
    # Get the latest version for Paper/Bukkit (compatible with recent Minecraft versions)
    local version_info
    version_info=$(echo "$versions_json" | jq -r '
        [.[] | select(.loaders[] | test("paper|bukkit"; "i"))] | 
        sort_by(.date_published) | 
        reverse | 
        .[0]
    ')
    
    if [ -z "$version_info" ] || [ "$version_info" = "null" ]; then
        error "No compatible version found for ${name}"
        return 1
    fi
    
    local version_number
    version_number=$(echo "$version_info" | jq -r '.version_number')
    
    # Prefer primary file, fallback to first file
    local download_url
    download_url=$(echo "$version_info" | jq -r '
        .files | 
        (map(select(.primary == true)) | .[0].url) // 
        .[0].url
    ')
    
    local filename
    filename=$(echo "$version_info" | jq -r '
        .files | 
        (map(select(.primary == true)) | .[0].filename) // 
        .[0].filename
    ')
    
    # Validate URL
    if ! validate_url "$download_url"; then
        error "Invalid download URL for ${name}: ${download_url}"
        return 1
    fi
    
    local output_path="${PLUGINS_DIR}/${filename}"
    
    # Check if already downloaded
    if [ "$FORCE_DOWNLOAD" = false ] && [ -f "$output_path" ]; then
        local cached_version
        cached_version=$(grep "^${name}:" "$VERSION_CACHE" 2>/dev/null | cut -d: -f2 || echo "")
        
        if [ "$cached_version" = "$version_number" ]; then
            success "${name} ${version_number} already installed (${filename})"
            return 0
        elif [ "$UPDATE_MODE" = false ]; then
            success "${name} already exists (${filename}), use --update to check for updates"
            return 0
        fi
    fi
    
    # In dry-run mode, just show what would be downloaded
    if [ "$DRY_RUN_MODE" = true ]; then
        success "[DRY RUN] Would download ${name} ${version_number} → ${filename}"
        log "  URL: ${download_url}"
        return 0
    fi
    
    log "Downloading ${name} ${version_number}..."
    log "  URL: ${download_url}"
    
    if download_with_retry "$download_url" "$output_path"; then
        # Validate the downloaded file
        if validate_download "$output_path"; then
            success "Downloaded ${name} ${version_number} → ${filename}"
            
            # Update version cache
            grep -v "^${name}:" "$VERSION_CACHE" 2>/dev/null > "${VERSION_CACHE}.tmp" || true
            echo "${name}:${version_number}" >> "${VERSION_CACHE}.tmp"
            mv "${VERSION_CACHE}.tmp" "$VERSION_CACHE"
            
            return 0
        else
            error "Downloaded file validation failed for ${name}"
            return 1
        fi
    else
        error "Failed to download ${name} from Modrinth after multiple attempts"
        warning "Troubleshooting suggestions:"
        warning "  1. Check your internet connection"
        warning "  2. Verify the project exists: https://modrinth.com/plugin/${project_id}"
        warning "  3. Try again later if Modrinth API is having issues"
        return 1
    fi
}

################################################################################
# Main Installation Logic
################################################################################

install_plugin() {
    local plugin_json="$1"
    
    local name
    name=$(echo "$plugin_json" | jq -r '.name')
    
    local enabled
    enabled=$(echo "$plugin_json" | jq -r '.enabled')
    
    if [ "$enabled" != "true" ]; then
        warning "Skipping ${name} (disabled in config)"
        return 0
    fi
    
    local source
    source=$(echo "$plugin_json" | jq -r '.source')
    
    case "$source" in
        github)
            local repo
            repo=$(echo "$plugin_json" | jq -r '.repo')
            local pattern
            pattern=$(echo "$plugin_json" | jq -r '.asset_pattern')
            
            install_github_plugin "$name" "$repo" "$pattern"
            ;;
        modrinth)
            local project_id
            project_id=$(echo "$plugin_json" | jq -r '.project_id')
            
            install_modrinth_plugin "$name" "$project_id"
            ;;
        *)
            error "Unknown source type: ${source} for ${name}"
            return 1
            ;;
    esac
}

################################################################################
# Main Script
################################################################################

main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --force)
                FORCE_DOWNLOAD=true
                shift
                ;;
            --update)
                UPDATE_MODE=true
                shift
                ;;
            --debug)
                DEBUG_MODE=true
                shift
                ;;
            --dry-run)
                DRY_RUN_MODE=true
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
    log "=== Minecraft Plugin Auto-Installer ==="
    echo ""
    
    # Check dependencies
    check_dependencies
    
    # Check if config file exists
    if [ ! -f "$CONFIG_FILE" ]; then
        error "Configuration file not found: ${CONFIG_FILE}"
        exit 1
    fi
    
    # Create plugins directory
    mkdir -p "$PLUGINS_DIR"
    touch "$VERSION_CACHE"
    
    log "Plugin directory: ${PLUGINS_DIR}"
    log "Configuration: ${CONFIG_FILE}"
    
    if [ "$FORCE_DOWNLOAD" = true ]; then
        warning "Force download mode enabled - all plugins will be re-downloaded"
    fi
    
    if [ "$UPDATE_MODE" = true ]; then
        log "Update mode enabled - checking for newer versions"
    fi
    
    if [ "$DEBUG_MODE" = true ]; then
        warning "Debug mode enabled - verbose output will be shown"
    fi
    
    if [ "$DRY_RUN_MODE" = true ]; then
        warning "Dry-run mode enabled - no files will be downloaded"
    fi
    
    echo ""
    
    # Read and process plugins
    local plugin_count
    plugin_count=$(jq '.plugins | length' "$CONFIG_FILE")
    
    log "Found ${plugin_count} plugins in configuration"
    echo ""
    
    local success_count=0
    local skip_count=0
    local fail_count=0
    
    for i in $(seq 0 $((plugin_count - 1))); do
        local plugin_json
        plugin_json=$(jq ".plugins[$i]" "$CONFIG_FILE")
        
        local name
        name=$(echo "$plugin_json" | jq -r '.name')
        
        local category
        category=$(echo "$plugin_json" | jq -r '.category')
        
        echo "============================================================"
        log "Processing: ${name} [${category}]"
        
        if install_plugin "$plugin_json"; then
            ((success_count++))
        else
            ((fail_count++))
        fi
        
        echo ""
    done
    
    # Summary
    echo "============================================================"
    echo ""
    log "=== Installation Summary ==="
    success "Successful: ${success_count}"
    if [ $fail_count -gt 0 ]; then
        error "Failed: ${fail_count}"
    fi
    echo ""
    log "Plugins installed to: ${PLUGINS_DIR}"
    log "Log file: ${LOG_FILE}"
    echo ""
    
    if [ $fail_count -gt 0 ]; then
        warning "Some plugins failed to install. Check the log for details."
        exit 1
    else
        success "All enabled plugins installed successfully!"
    fi
}

# Run main function
main "$@"
