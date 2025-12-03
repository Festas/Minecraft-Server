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

# Note: We use explicit error handling instead of 'set -e' to allow 
# graceful handling of errors in loops and provide better user feedback

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
LOCK_FILE="/tmp/minecraft-plugin-installer.lock"

# Command line flags
FORCE_DOWNLOAD=false
UPDATE_MODE=false
DEBUG_MODE=false
DRY_RUN_MODE=false
MAX_RETRIES=2
WAIT_FOR_RATE_LIMIT=false

# Timeout configuration (in seconds)
# Can be overridden with environment variables
CONNECTION_TIMEOUT="${CONNECTION_TIMEOUT:-10}"
DOWNLOAD_TIMEOUT="${DOWNLOAD_TIMEOUT:-300}"

# Modrinth compatible loaders (space-separated for easy maintenance)
MODRINTH_LOADERS="paper bukkit spigot purpur folia"

################################################################################
# Helper Functions
################################################################################

# Cleanup function to be called on exit
cleanup() {
    local exit_code=$?
    
    # Remove lock file if it exists
    if [ -f "$LOCK_FILE" ]; then
        debug "Removing lock file: $LOCK_FILE"
        rm -f "$LOCK_FILE"
    fi
    
    # Clean up temporary version cache files
    rm -f "${VERSION_CACHE}.tmp" 2>/dev/null || true
    
    # If we're exiting due to a signal, show cleanup message
    if [ $exit_code -ne 0 ] && [ "${SIGNAL_RECEIVED:-false}" = "true" ]; then
        echo ""
        warning "Script interrupted. Cleaned up partial downloads and temporary files."
    fi
}

# Signal handler for interrupts
handle_signal() {
    SIGNAL_RECEIVED=true
    exit 130  # Standard exit code for SIGINT
}

# Set trap to cleanup on exit, and handle interrupt signals
trap cleanup EXIT
trap handle_signal INT TERM

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
    --force                 Force re-download all plugins (skip version check)
    --update                Check for and download plugin updates
    --debug                 Enable debug mode for verbose output
    --dry-run               Validate configuration and test API access without downloading
    --timeout N             Set download timeout in seconds (default: 300)
    --max-retries N         Maximum retry passes for failed plugins (default: 2)
    --wait-for-rate-limit   Automatically wait when rate limited instead of failing
    --help                  Show this help message

ENVIRONMENT VARIABLES:
    CONNECTION_TIMEOUT  Timeout for initial connection (default: 10 seconds)
    DOWNLOAD_TIMEOUT    Maximum time for downloads (default: 300 seconds)
    GITHUB_TOKEN        GitHub API token to avoid rate limiting

EXAMPLES:
    $0                          # Install all enabled plugins
    $0 --force                  # Force re-download all plugins
    $0 --update                 # Update all plugins to latest versions
    $0 --debug                  # Run with debug output to troubleshoot issues
    $0 --dry-run                # Test configuration without downloading
    $0 --timeout 600            # Set download timeout to 10 minutes
    $0 --max-retries 3          # Retry failed plugins up to 3 times
    $0 --wait-for-rate-limit    # Wait when rate limited instead of failing

CONFIGURATION:
    Edit plugins.json to enable/disable plugins or add new ones.
    Set "enabled": true/false for each plugin.
    
    Fallback Sources:
    - Add "fallback_source": "github" or "modrinth" with corresponding fields
    - Add "fallback_repo": "owner/repo" for GitHub fallback
    - Add "fallback_project_id": "project-id" for Modrinth fallback
    - Add "fallback_url": "https://..." for manual URL fallback

TROUBLESHOOTING:
    If downloads fail, try:
    - Use --debug to see detailed error messages
    - Set GITHUB_TOKEN environment variable to avoid rate limiting
    - Use --wait-for-rate-limit to automatically wait when rate limited
    - Check if the repository has releases
    - Verify asset patterns match actual file names
    - Configure fallback sources in plugins.json

EOF
    exit 0
}

################################################################################
# Dependency Checks
################################################################################

validate_config() {
    log "Validating plugins.json configuration..."
    
    # Check if file is valid JSON
    if ! jq empty "$CONFIG_FILE" 2>/dev/null; then
        error "Invalid JSON in configuration file: ${CONFIG_FILE}"
        error "Please check the JSON syntax using a validator"
        return 1
    fi
    
    # Check if plugins array exists
    if ! jq -e '.plugins' "$CONFIG_FILE" &>/dev/null; then
        error "Missing 'plugins' array in configuration file"
        return 1
    fi
    
    # Validate each plugin entry
    local plugin_count
    plugin_count=$(jq '.plugins | length' "$CONFIG_FILE")
    local validation_errors=0
    
    for i in $(seq 0 $((plugin_count - 1))); do
        local plugin_json
        plugin_json=$(jq ".plugins[$i]" "$CONFIG_FILE")
        
        local name
        name=$(echo "$plugin_json" | jq -r '.name // empty')
        if [ -z "$name" ]; then
            error "Plugin at index $i is missing required field: 'name'"
            ((validation_errors++))
            continue
        fi
        
        # Check required fields (enabled can be true or false, but must exist)
        if ! echo "$plugin_json" | jq -e 'has("enabled")' &>/dev/null; then
            error "Plugin '${name}' is missing required field: 'enabled'"
            ((validation_errors++))
        fi
        
        local source
        source=$(echo "$plugin_json" | jq -r '.source // empty')
        if [ -z "$source" ]; then
            error "Plugin '${name}' is missing required field: 'source'"
            ((validation_errors++))
            continue
        fi
        
        # Validate source type (allow 'manual' as a valid source type for manual installs)
        if [[ "$source" != "github" && "$source" != "modrinth" && "$source" != "manual" ]]; then
            error "Plugin '${name}' has invalid source type: '${source}' (must be 'github', 'modrinth', or 'manual')"
            ((validation_errors++))
            continue
        fi
        
        # Validate source-specific fields (skip manual sources)
        if [ "$source" = "github" ]; then
            local repo
            repo=$(echo "$plugin_json" | jq -r '.repo // empty')
            if [ -z "$repo" ]; then
                error "Plugin '${name}' with source 'github' is missing required field: 'repo'"
                ((validation_errors++))
            fi
            
            local asset_pattern
            asset_pattern=$(echo "$plugin_json" | jq -r '.asset_pattern // empty')
            if [ -z "$asset_pattern" ]; then
                warning "Plugin '${name}' with source 'github' is missing 'asset_pattern' (may cause download issues)"
            fi
        elif [ "$source" = "modrinth" ]; then
            local project_id
            project_id=$(echo "$plugin_json" | jq -r '.project_id // empty')
            if [ -z "$project_id" ]; then
                error "Plugin '${name}' with source 'modrinth' is missing required field: 'project_id'"
                ((validation_errors++))
            fi
        fi
        # Skip validation for 'manual' sources as they're installed manually
    done
    
    if [ $validation_errors -gt 0 ]; then
        error "Configuration validation failed with ${validation_errors} error(s)"
        return 1
    fi
    
    success "Configuration validation passed"
    return 0
}

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
        # Use curl with timeouts
        # Note: -s silences progress, -S shows errors, output goes to file
        http_code=$(curl -L -w "%{http_code}" -o "$output" -sS \
            --connect-timeout "$CONNECTION_TIMEOUT" \
            --max-time "$DOWNLOAD_TIMEOUT" \
            "$url" 2>/dev/null)
        local curl_exit=$?
        
        if [ $curl_exit -eq 0 ] && [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
            return 0
        elif [ $curl_exit -eq 28 ]; then
            error "Download timeout after ${DOWNLOAD_TIMEOUT}s: $url"
            rm -f "$output"
            return 1
        elif [ $curl_exit -eq 7 ]; then
            error "Connection failed (timeout after ${CONNECTION_TIMEOUT}s): $url"
            rm -f "$output"
            return 1
        else
            error "HTTP error $http_code when downloading: $url"
            rm -f "$output"
            return 1
        fi
    elif command -v wget &> /dev/null; then
        # Use wget with timeouts
        if wget -q -O "$output" \
            --connect-timeout="$CONNECTION_TIMEOUT" \
            --timeout="$DOWNLOAD_TIMEOUT" \
            "$url" 2>/dev/null; then
            return 0
        else
            local wget_exit=$?
            if [ $wget_exit -eq 4 ]; then
                error "Connection timeout: $url"
            else
                error "Failed to download: $url"
            fi
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

verify_checksum() {
    local file="$1"
    local expected_hash="$2"
    local hash_algorithm="$3"
    
    if [ -z "$expected_hash" ] || [ "$expected_hash" = "null" ]; then
        debug "No checksum provided for verification"
        return 0
    fi
    
    local actual_hash=""
    
    case "$hash_algorithm" in
        sha512)
            if command -v sha512sum &> /dev/null; then
                actual_hash=$(sha512sum "$file" | awk '{print $1}')
            elif command -v shasum &> /dev/null; then
                actual_hash=$(shasum -a 512 "$file" | awk '{print $1}')
            else
                warning "sha512sum not available, skipping checksum verification"
                return 0
            fi
            ;;
        sha256)
            if command -v sha256sum &> /dev/null; then
                actual_hash=$(sha256sum "$file" | awk '{print $1}')
            elif command -v shasum &> /dev/null; then
                actual_hash=$(shasum -a 256 "$file" | awk '{print $1}')
            else
                warning "sha256sum not available, skipping checksum verification"
                return 0
            fi
            ;;
        sha1)
            if command -v sha1sum &> /dev/null; then
                actual_hash=$(sha1sum "$file" | awk '{print $1}')
            elif command -v shasum &> /dev/null; then
                actual_hash=$(shasum -a 1 "$file" | awk '{print $1}')
            else
                warning "sha1sum not available, skipping checksum verification"
                return 0
            fi
            ;;
        *)
            warning "Unsupported hash algorithm: $hash_algorithm"
            return 0
            ;;
    esac
    
    if [ -z "$actual_hash" ]; then
        warning "Failed to compute checksum for $file"
        return 0
    fi
    
    debug "Expected hash ($hash_algorithm): $expected_hash"
    debug "Actual hash ($hash_algorithm): $actual_hash"
    
    if [ "$actual_hash" = "$expected_hash" ]; then
        debug "Checksum verification passed"
        return 0
    else
        error "Checksum verification failed!"
        error "Expected: $expected_hash"
        error "Got: $actual_hash"
        return 1
    fi
}

################################################################################
# GitHub Release Functions
################################################################################

check_github_rate_limit() {
    local headers="$1"
    
    # Extract rate limit headers
    local remaining
    remaining=$(echo "$headers" | grep -i "x-ratelimit-remaining:" | tail -1 | cut -d: -f2 | tr -d ' \r\n' || echo "")
    
    local reset_time
    reset_time=$(echo "$headers" | grep -i "x-ratelimit-reset:" | tail -1 | cut -d: -f2 | tr -d ' \r\n' || echo "")
    
    if [ "$DEBUG_MODE" = true ] && [ -n "$remaining" ]; then
        debug "GitHub rate limit remaining: $remaining"
    fi
    
    # If rate limited (remaining = 0)
    if [ "$remaining" = "0" ] && [ -n "$reset_time" ]; then
        local current_time
        current_time=$(date +%s)
        local wait_seconds=$((reset_time - current_time))
        
        if [ $wait_seconds -gt 0 ]; then
            error "GitHub API rate limit exceeded!"
            warning "Rate limit will reset in $wait_seconds seconds ($(date -d "@$reset_time" 2>/dev/null || date -r "$reset_time" 2>/dev/null))"
            
            if [ -z "${GITHUB_TOKEN:-}" ]; then
                warning "Suggestion: Set GITHUB_TOKEN environment variable to increase rate limit from 60 to 5000 requests/hour"
            fi
            
            if [ "$WAIT_FOR_RATE_LIMIT" = true ]; then
                if [ $wait_seconds -le 300 ]; then
                    warning "Waiting for rate limit to reset (${wait_seconds}s)..."
                    sleep $wait_seconds
                    return 0
                else
                    warning "Wait time is too long (${wait_seconds}s > 300s)"
                    warning "Rate limit will reset in $((wait_seconds / 60)) minutes"
                    return 1
                fi
            fi
            return 1
        fi
    fi
    
    return 0
}

get_github_api_with_headers() {
    local api_url="$1"
    local temp_headers
    temp_headers=$(mktemp)
    local temp_body
    temp_body=$(mktemp)
    
    # Use GitHub token if available to avoid rate limiting
    # Include User-Agent and Accept headers as recommended by GitHub API
    if [ -n "${GITHUB_TOKEN:-}" ]; then
        if command -v curl &> /dev/null; then
            curl -s -D "$temp_headers" -o "$temp_body" \
                -H "Authorization: Bearer ${GITHUB_TOKEN}" \
                -H "Accept: application/vnd.github+json" \
                -H "User-Agent: Minecraft-Plugin-Installer" \
                "$api_url"
        else
            wget -q -S -O "$temp_body" \
                --header="Authorization: Bearer ${GITHUB_TOKEN}" \
                --header="Accept: application/vnd.github+json" \
                --header="User-Agent: Minecraft-Plugin-Installer" \
                "$api_url" 2> "$temp_headers"
        fi
    else
        if command -v curl &> /dev/null; then
            curl -s -D "$temp_headers" -o "$temp_body" \
                -H "Accept: application/vnd.github+json" \
                -H "User-Agent: Minecraft-Plugin-Installer" \
                "$api_url"
        else
            wget -q -S -O "$temp_body" \
                --header="Accept: application/vnd.github+json" \
                --header="User-Agent: Minecraft-Plugin-Installer" \
                "$api_url" 2> "$temp_headers"
        fi
    fi
    
    # Check rate limit
    if ! check_github_rate_limit "$(cat "$temp_headers")"; then
        rm -f "$temp_headers" "$temp_body"
        return 1
    fi
    
    cat "$temp_body"
    rm -f "$temp_headers" "$temp_body"
    return 0
}

get_github_latest_release() {
    local repo="$1"
    local api_url="https://api.github.com/repos/${repo}/releases/latest"
    
    get_github_api_with_headers "$api_url"
}

get_github_all_releases() {
    local repo="$1"
    local api_url="https://api.github.com/repos/${repo}/releases"
    
    get_github_api_with_headers "$api_url"
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
    
    # Try exact pattern match first
    # Note: Uses case-insensitive matching ("i" flag) for flexibility
    local url
    url=$(echo "$release_json" | jq -r --arg pattern "$pattern" '
        .assets // [] | 
        map(select(.name | test($pattern; "i"))) | 
        if length > 0 then .[0].browser_download_url else empty end
    ')
    
    if [ -n "$url" ]; then
        debug "Matched asset using exact pattern"
        echo "$url"
        return 0
    fi
    
    # Fallback 1: Try matching just .jar files (excluding sources, javadoc, etc.)
    debug "Exact pattern match failed, trying fuzzy matching..."
    url=$(echo "$release_json" | jq -r '
        .assets // [] | 
        map(select(.name | test("\\.jar$"; "i"))) |
        map(select(.name | test("-(sources|javadoc|api)\\.jar$"; "i") | not)) |
        if length > 0 then .[0].browser_download_url else empty end
    ')
    
    if [ -n "$url" ]; then
        warning "Used fuzzy matching: found .jar file (excluding sources/javadoc)"
        echo "$url"
        return 0
    fi
    
    echo ""
    return 1
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
    local allow_prerelease="${4:-false}"
    
    log "Fetching latest release for ${name} from GitHub..."
    debug "Repository: ${repo}"
    debug "Asset pattern: ${pattern}"
    
    local release_json
    release_json=$(get_github_latest_release "$repo")
    
    # Check for API errors or rate limiting
    if [ -z "$release_json" ]; then
        error "Empty response from GitHub API for ${name}"
        return 1
    fi
    
    # Check for error message in response
    local api_message
    api_message=$(echo "$release_json" | jq -r '.message // empty')
    
    # If /releases/latest fails, try /releases and get first non-prerelease
    if [ -n "$api_message" ] && [[ "$api_message" =~ (Not Found|rate limit) ]]; then
        if [[ "$api_message" =~ "rate limit" ]]; then
            error "GitHub API rate limit exceeded for ${name}"
            return 1
        fi
        
        warning "No 'latest' release found, trying all releases..."
        local all_releases
        all_releases=$(get_github_all_releases "$repo")
        
        if [ -z "$all_releases" ]; then
            error "Failed to fetch releases for ${name}"
            return 1
        fi
        
        # Try to find first non-prerelease
        release_json=$(echo "$all_releases" | jq -r '
            [.[] | select(.prerelease == false)] | 
            if length > 0 then .[0] else empty end
        ')
        
        # If no non-prerelease found and prereleases are allowed, use first prerelease
        if [ -z "$release_json" ] || [ "$release_json" = "null" ]; then
            if [ "$allow_prerelease" = "true" ]; then
                warning "No stable release found, using pre-release..."
                release_json=$(echo "$all_releases" | jq -r '.[0] // empty')
            else
                error "No stable release found for ${name}"
                warning "Set allow_prerelease in config to allow pre-releases"
                return 1
            fi
        fi
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
    
    # Convert MODRINTH_LOADERS to pipe-separated for regex
    local loader_pattern
    loader_pattern=$(echo "$MODRINTH_LOADERS" | tr ' ' '|')
    
    # Get the latest version for compatible loaders
    # Expanded loader support for better compatibility
    local version_info
    version_info=$(echo "$versions_json" | jq -r --arg loaders "$loader_pattern" '
        [.[] | select(.loaders and (.loaders | length > 0) and (.loaders[] | test($loaders; "i")))] | 
        sort_by(.date_published) | 
        reverse | 
        if length > 0 then .[0] else null end
    ')
    
    if [ -z "$version_info" ] || [ "$version_info" = "null" ]; then
        error "No compatible version found for ${name}"
        debug "Tried loaders: $MODRINTH_LOADERS"
        return 1
    fi
    
    local version_number
    version_number=$(echo "$version_info" | jq -r '.version_number // empty')
    
    if [ -z "$version_number" ]; then
        error "Could not determine version number for ${name}"
        return 1
    fi
    
    # Get file information with checksums
    local file_info
    file_info=$(echo "$version_info" | jq -r '
        .files // [] | 
        if length == 0 then null
        else (map(select(.primary == true)) | if length > 0 then .[0] else null end) // .[0]
        end
    ')
    
    if [ -z "$file_info" ] || [ "$file_info" = "null" ]; then
        error "No downloadable files found for ${name}"
        return 1
    fi
    
    local download_url
    download_url=$(echo "$file_info" | jq -r '.url // empty')
    
    local filename
    filename=$(echo "$file_info" | jq -r '.filename // empty')
    
    if [ -z "$download_url" ] || [ -z "$filename" ]; then
        error "Invalid file information for ${name}"
        return 1
    fi
    
    # Get checksums if available
    local sha512_hash
    sha512_hash=$(echo "$file_info" | jq -r '.hashes.sha512 // empty')
    
    local sha256_hash
    sha256_hash=$(echo "$file_info" | jq -r '.hashes.sha256 // empty')
    
    local sha1_hash
    sha1_hash=$(echo "$file_info" | jq -r '.hashes.sha1 // empty')
    
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
        if [ -n "$sha512_hash" ]; then
            log "  SHA512: ${sha512_hash}"
        fi
        return 0
    fi
    
    log "Downloading ${name} ${version_number}..."
    log "  URL: ${download_url}"
    
    if download_with_retry "$download_url" "$output_path"; then
        # Validate the downloaded file
        if ! validate_download "$output_path"; then
            error "Downloaded file validation failed for ${name}"
            return 1
        fi
        
        # Verify checksum (prefer SHA512, then SHA256, then SHA1)
        if [ -n "$sha512_hash" ]; then
            if verify_checksum "$output_path" "$sha512_hash" "sha512"; then
                success "Checksum verified (SHA512)"
            else
                error "Checksum verification failed for ${name}"
                rm -f "$output_path"
                return 1
            fi
        elif [ -n "$sha256_hash" ]; then
            if verify_checksum "$output_path" "$sha256_hash" "sha256"; then
                success "Checksum verified (SHA256)"
            else
                error "Checksum verification failed for ${name}"
                rm -f "$output_path"
                return 1
            fi
        elif [ -n "$sha1_hash" ]; then
            if verify_checksum "$output_path" "$sha1_hash" "sha1"; then
                success "Checksum verified (SHA1)"
            else
                error "Checksum verification failed for ${name}"
                rm -f "$output_path"
                return 1
            fi
        else
            warning "No checksum available for verification"
        fi
        
        success "Downloaded ${name} ${version_number} → ${filename}"
        
        # Update version cache
        grep -v "^${name}:" "$VERSION_CACHE" 2>/dev/null > "${VERSION_CACHE}.tmp" || true
        echo "${name}:${version_number}" >> "${VERSION_CACHE}.tmp"
        mv "${VERSION_CACHE}.tmp" "$VERSION_CACHE"
        
        return 0
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

install_plugin_with_fallback() {
    local plugin_json="$1"
    local name
    name=$(echo "$plugin_json" | jq -r '.name')
    
    local source
    source=$(echo "$plugin_json" | jq -r '.source')
    
    local allow_prerelease
    allow_prerelease=$(echo "$plugin_json" | jq -r '.allow_prerelease // false')
    
    # Try primary source
    local result=0
    case "$source" in
        github)
            local repo
            repo=$(echo "$plugin_json" | jq -r '.repo')
            local pattern
            pattern=$(echo "$plugin_json" | jq -r '.asset_pattern')
            
            if ! install_github_plugin "$name" "$repo" "$pattern" "$allow_prerelease"; then
                result=1
            fi
            ;;
        modrinth)
            local project_id
            project_id=$(echo "$plugin_json" | jq -r '.project_id')
            
            if ! install_modrinth_plugin "$name" "$project_id"; then
                result=1
            fi
            ;;
        manual)
            warning "Skipping ${name} (manual installation required)"
            return 2  # Return special code for manually installed plugins
            ;;
        *)
            error "Unknown source type: ${source} for ${name}"
            return 1
            ;;
    esac
    
    # If primary source succeeded, return success
    if [ $result -eq 0 ]; then
        return 0
    fi
    
    # Try fallback sources
    local fallback_source
    fallback_source=$(echo "$plugin_json" | jq -r '.fallback_source // empty')
    
    if [ -n "$fallback_source" ]; then
        warning "Primary source failed, trying fallback source: ${fallback_source}"
        
        case "$fallback_source" in
            github)
                local fallback_repo
                fallback_repo=$(echo "$plugin_json" | jq -r '.fallback_repo // empty')
                local fallback_pattern
                fallback_pattern=$(echo "$plugin_json" | jq -r '.fallback_asset_pattern // .asset_pattern')
                
                if [ -n "$fallback_repo" ]; then
                    if install_github_plugin "$name" "$fallback_repo" "$fallback_pattern" "$allow_prerelease"; then
                        success "Installed from fallback GitHub repository"
                        return 0
                    fi
                else
                    error "Fallback source 'github' specified but 'fallback_repo' is missing"
                fi
                ;;
            modrinth)
                local fallback_project_id
                fallback_project_id=$(echo "$plugin_json" | jq -r '.fallback_project_id // empty')
                
                if [ -n "$fallback_project_id" ]; then
                    if install_modrinth_plugin "$name" "$fallback_project_id"; then
                        success "Installed from fallback Modrinth project"
                        return 0
                    fi
                else
                    error "Fallback source 'modrinth' specified but 'fallback_project_id' is missing"
                fi
                ;;
            *)
                error "Unknown fallback source type: ${fallback_source}"
                ;;
        esac
    fi
    
    # Try fallback URL as last resort
    local fallback_url
    fallback_url=$(echo "$plugin_json" | jq -r '.fallback_url // empty')
    
    if [ -n "$fallback_url" ]; then
        warning "Trying fallback URL as last resort..."
        
        if ! validate_url "$fallback_url"; then
            error "Invalid fallback URL for ${name}: ${fallback_url}"
            return 1
        fi
        
        local filename
        filename=$(basename "$fallback_url")
        local output_path="${PLUGINS_DIR}/${filename}"
        
        # In dry-run mode, just show what would be downloaded
        if [ "$DRY_RUN_MODE" = true ]; then
            success "[DRY RUN] Would download ${name} from fallback URL → ${filename}"
            log "  URL: ${fallback_url}"
            return 0
        fi
        
        log "Downloading ${name} from fallback URL..."
        log "  URL: ${fallback_url}"
        
        if download_with_retry "$fallback_url" "$output_path"; then
            if validate_download "$output_path"; then
                success "Downloaded ${name} from fallback URL → ${filename}"
                return 0
            else
                error "Fallback URL download validation failed for ${name}"
                return 1
            fi
        else
            error "Failed to download ${name} from fallback URL"
            return 1
        fi
    fi
    
    # All sources failed
    return 1
}

install_plugin() {
    local plugin_json="$1"
    
    local name
    name=$(echo "$plugin_json" | jq -r '.name')
    
    local enabled
    enabled=$(echo "$plugin_json" | jq -r '.enabled')
    
    if [ "$enabled" != "true" ]; then
        warning "Skipping ${name} (disabled in config)"
        return 2  # Return special code for skipped plugins
    fi
    
    install_plugin_with_fallback "$plugin_json"
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
            --timeout)
                if [[ ! "$2" =~ ^[0-9]+$ ]] || [ "$2" -le 0 ]; then
                    error "Invalid timeout value: $2 (must be a positive integer)"
                    exit 1
                fi
                DOWNLOAD_TIMEOUT="$2"
                shift 2
                ;;
            --max-retries)
                if [[ ! "$2" =~ ^[0-9]+$ ]] || [ "$2" -lt 1 ]; then
                    error "Invalid max-retries value: $2 (must be a positive integer)"
                    exit 1
                fi
                MAX_RETRIES="$2"
                shift 2
                ;;
            --wait-for-rate-limit)
                WAIT_FOR_RATE_LIMIT=true
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
    
    # Check for lock file (prevent concurrent execution)
    if [ -f "$LOCK_FILE" ]; then
        error "Another instance of the plugin installer is already running (lock file exists: $LOCK_FILE)"
        echo "If you're sure no other instance is running, remove the lock file manually:"
        echo "  rm $LOCK_FILE"
        exit 1
    fi
    
    # Create lock file with PID atomically to prevent race conditions
    if ! (set -C; echo $$ > "$LOCK_FILE") 2>/dev/null; then
        error "Failed to create lock file: $LOCK_FILE"
        error "Another instance may have started simultaneously"
        exit 1
    fi
    
    debug "Created lock file: $LOCK_FILE (PID: $$)"
    
    # Check dependencies
    check_dependencies
    
    # Check if config file exists
    if [ ! -f "$CONFIG_FILE" ]; then
        error "Configuration file not found: ${CONFIG_FILE}"
        exit 1
    fi
    
    # Validate configuration
    if ! validate_config; then
        error "Configuration validation failed. Please fix the errors above."
        exit 1
    fi
    
    # Create plugins directory
    mkdir -p "$PLUGINS_DIR"
    touch "$VERSION_CACHE"
    
    log "Plugin directory: ${PLUGINS_DIR}"
    log "Configuration: ${CONFIG_FILE}"
    log "Timeouts: connection=${CONNECTION_TIMEOUT}s, download=${DOWNLOAD_TIMEOUT}s"
    log "Max retry passes: ${MAX_RETRIES}"
    
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
    
    if [ "$WAIT_FOR_RATE_LIMIT" = true ]; then
        log "Rate limit wait mode enabled - will wait for rate limits to reset"
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
    local failed_plugins=()
    
    # Retry loop
    for retry_pass in $(seq 1 $MAX_RETRIES); do
        if [ $retry_pass -gt 1 ]; then
            echo ""
            echo "============================================================"
            warning "Retry pass ${retry_pass}/${MAX_RETRIES} for ${#failed_plugins[@]} failed plugin(s)"
            echo "============================================================"
            echo ""
        fi
        
        local current_failed=()
        
        # Determine which plugins to process
        if [ $retry_pass -eq 1 ]; then
            # First pass: process all plugins
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
                    local exit_code=$?
                    if [ $exit_code -eq 2 ]; then
                        # Plugin was skipped (disabled)
                        ((skip_count++))
                    else
                        # Plugin installation failed
                        ((fail_count++))
                        current_failed+=("$i")
                    fi
                fi
                
                echo ""
            done
        else
            # Retry pass: only process previously failed plugins
            for i in "${failed_plugins[@]}"; do
                local plugin_json
                plugin_json=$(jq ".plugins[$i]" "$CONFIG_FILE")
                
                local name
                name=$(echo "$plugin_json" | jq -r '.name')
                
                local category
                category=$(echo "$plugin_json" | jq -r '.category')
                
                echo "============================================================"
                log "Retrying: ${name} [${category}]"
                
                if install_plugin "$plugin_json"; then
                    ((success_count++))
                    ((fail_count--))
                else
                    local exit_code=$?
                    if [ $exit_code -ne 2 ]; then
                        # Still failed
                        current_failed+=("$i")
                    fi
                fi
                
                echo ""
            done
        fi
        
        # Update failed plugins list
        failed_plugins=("${current_failed[@]}")
        
        # If no failures, break early
        if [ ${#failed_plugins[@]} -eq 0 ]; then
            break
        fi
        
        # If this isn't the last retry, show what will be retried
        if [ $retry_pass -lt $MAX_RETRIES ] && [ ${#failed_plugins[@]} -gt 0 ]; then
            warning "${#failed_plugins[@]} plugin(s) will be retried in next pass"
        fi
    done
    
    # Summary
    echo "============================================================"
    echo ""
    log "=== Installation Summary ==="
    success "Successful: ${success_count}"
    if [ $skip_count -gt 0 ]; then
        warning "Skipped: ${skip_count}"
    fi
    if [ $fail_count -gt 0 ]; then
        error "Failed: ${fail_count}"
        if [ ${#failed_plugins[@]} -gt 0 ]; then
            error "Failed plugins:"
            for i in "${failed_plugins[@]}"; do
                local name
                name=$(jq -r ".plugins[$i].name" "$CONFIG_FILE")
                error "  - ${name}"
            done
        fi
    fi
    echo ""
    log "Plugins installed to: ${PLUGINS_DIR}"
    log "Log file: ${LOG_FILE}"
    echo ""
    
    if [ $fail_count -gt 0 ]; then
        warning "Some plugins failed to install after ${MAX_RETRIES} attempt(s). Check the log for details."
        exit 1
    else
        success "All enabled plugins installed successfully!"
    fi
}

# Run main function
main "$@"
