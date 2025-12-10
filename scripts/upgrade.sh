#!/bin/bash
#
# Minecraft Server Console - Upgrade Script
# 
# This script safely upgrades the Minecraft server and console to the latest version.
# It includes automatic backups, rollback capability, and health checks.
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="${HOME}/minecraft-backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="pre-upgrade-${TIMESTAMP}.tar.gz"
ROLLBACK_POINT="${HOME}/.minecraft-upgrade-rollback"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if Git is installed
    if ! command -v git &> /dev/null; then
        log_error "Git is not installed. Please install Git first."
        exit 1
    fi
    
    log_success "All prerequisites met"
}

create_backup() {
    log_info "Creating pre-upgrade backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup Minecraft data
    if docker volume inspect minecraft_data &> /dev/null; then
        log_info "Backing up Minecraft world data..."
        docker run --rm \
            -v minecraft_data:/data \
            -v "$BACKUP_DIR":/backup \
            alpine tar czf "/backup/$BACKUP_FILE" -C /data . 2>&1 | grep -v "Removing leading"
        
        if [ $? -eq 0 ]; then
            log_success "Backup created: $BACKUP_DIR/$BACKUP_FILE"
            echo "$BACKUP_FILE" > "$ROLLBACK_POINT"
        else
            log_error "Backup failed!"
            exit 1
        fi
    else
        log_warning "Minecraft data volume not found. Skipping Minecraft backup."
    fi
    
    # Backup console database
    if docker volume inspect console_data &> /dev/null; then
        log_info "Backing up console database..."
        CONSOLE_BACKUP="console-${BACKUP_FILE}"
        docker run --rm \
            -v console_data:/data \
            -v "$BACKUP_DIR":/backup \
            alpine tar czf "/backup/$CONSOLE_BACKUP" -C /data . 2>&1 | grep -v "Removing leading"
        
        log_success "Console backup created: $BACKUP_DIR/$CONSOLE_BACKUP"
    else
        log_warning "Console data volume not found. Skipping console backup."
    fi
}

save_current_state() {
    log_info "Saving current Git state..."
    git rev-parse HEAD > "${ROLLBACK_POINT}.commit"
}

update_code() {
    log_info "Pulling latest code from Git..."
    
    # Fetch latest changes
    git fetch origin
    
    # Show what will be updated
    log_info "Changes to be applied:"
    git log --oneline HEAD..origin/main | head -10
    
    # Pull changes
    git pull origin main
    
    log_success "Code updated to latest version"
}

stop_services() {
    log_info "Stopping services gracefully..."
    
    # Notify players if server is running
    if docker ps | grep -q minecraft-server; then
        log_info "Notifying players of maintenance..."
        docker exec -i minecraft-server rcon-cli "say Server upgrading in 2 minutes. Please save your progress." 2>/dev/null || true
        sleep 60
        docker exec -i minecraft-server rcon-cli "say Server upgrading in 1 minute!" 2>/dev/null || true
        sleep 60
    fi
    
    # Stop containers
    docker compose down
    docker compose -f docker-compose.console.yml down 2>/dev/null || true
    
    log_success "Services stopped"
}

update_containers() {
    log_info "Pulling latest Docker images..."
    
    docker compose pull
    docker compose -f docker-compose.console.yml pull 2>/dev/null || true
    
    log_success "Docker images updated"
}

start_services() {
    log_info "Starting services..."
    
    # Start Minecraft server
    docker compose up -d
    
    # Start console if compose file exists
    if [ -f docker-compose.console.yml ]; then
        docker compose -f docker-compose.console.yml up -d
    fi
    
    log_success "Services started"
}

health_check() {
    log_info "Performing health checks..."
    
    # Wait for containers to start
    sleep 10
    
    # Check Minecraft server
    if docker ps | grep -q minecraft-server; then
        log_success "Minecraft server is running"
    else
        log_error "Minecraft server failed to start"
        return 1
    fi
    
    # Check console if it exists
    if docker ps | grep -q console-backend; then
        log_success "Console backend is running"
        
        # Check if console is responding
        if curl -k -f https://localhost:3001/health &> /dev/null; then
            log_success "Console health check passed"
        else
            log_warning "Console health check failed (may need to wait longer)"
        fi
    fi
    
    # Check logs for errors
    log_info "Checking for errors in logs..."
    if docker compose logs --tail=50 | grep -i "error\|exception\|fatal" | grep -v "grep"; then
        log_warning "Errors found in logs. Please review above."
    else
        log_success "No critical errors in logs"
    fi
    
    return 0
}

rollback() {
    log_error "Upgrade failed. Rolling back..."
    
    # Stop services
    docker compose down
    docker compose -f docker-compose.console.yml down 2>/dev/null || true
    
    # Restore code
    if [ -f "${ROLLBACK_POINT}.commit" ]; then
        ROLLBACK_COMMIT=$(cat "${ROLLBACK_POINT}.commit")
        log_info "Restoring code to commit: $ROLLBACK_COMMIT"
        git reset --hard "$ROLLBACK_COMMIT"
    fi
    
    # Restore data
    if [ -f "$ROLLBACK_POINT" ]; then
        BACKUP_TO_RESTORE=$(cat "$ROLLBACK_POINT")
        log_info "Restoring backup: $BACKUP_TO_RESTORE"
        
        docker run --rm \
            -v minecraft_data:/data \
            -v "$BACKUP_DIR":/backup \
            alpine sh -c "rm -rf /data/* && cd /data && tar xzf /backup/$BACKUP_TO_RESTORE"
    fi
    
    # Restart services
    docker compose up -d
    docker compose -f docker-compose.console.yml up -d 2>/dev/null || true
    
    log_success "Rollback completed"
    exit 1
}

cleanup() {
    log_info "Cleaning up old backups..."
    
    # Keep only last 10 backups
    cd "$BACKUP_DIR"
    ls -t pre-upgrade-*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm
    ls -t console-pre-upgrade-*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm
    
    log_success "Cleanup complete"
}

main() {
    echo "================================================"
    echo "  Minecraft Server Console - Upgrade Script"
    echo "================================================"
    echo ""
    
    # Confirm upgrade
    read -p "This will upgrade your server to the latest version. Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Upgrade cancelled"
        exit 0
    fi
    
    # Run upgrade steps
    check_prerequisites
    save_current_state
    create_backup
    update_code
    stop_services
    update_containers
    start_services
    
    # Health check with rollback on failure
    if ! health_check; then
        log_error "Health check failed!"
        rollback
    fi
    
    cleanup
    
    echo ""
    echo "================================================"
    log_success "Upgrade completed successfully!"
    echo "================================================"
    echo ""
    echo "Next steps:"
    echo "  1. Monitor logs: docker compose logs -f"
    echo "  2. Check console: https://your-server:3001/console/"
    echo "  3. Test player connections"
    echo ""
    echo "Backup location: $BACKUP_DIR/$BACKUP_FILE"
    echo ""
}

# Handle errors
trap 'log_error "Upgrade failed at line $LINENO. Check logs above."; exit 1' ERR

# Run main function
main
