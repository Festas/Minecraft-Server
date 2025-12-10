#!/bin/bash
#
# Minecraft Server Console - Launch Validation Script
#
# This script validates that all systems are ready for production launch.
# Run this before going live to ensure everything is configured correctly.
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Functions
test_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

test_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

test_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

check_docker() {
    section "Docker Installation"
    
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version | awk '{print $3}' | sed 's/,//')
        test_pass "Docker installed: $DOCKER_VERSION"
    else
        test_fail "Docker is not installed"
        return
    fi
    
    if command -v docker compose &> /dev/null; then
        test_pass "Docker Compose installed"
    else
        test_fail "Docker Compose is not installed"
    fi
    
    if docker ps &> /dev/null; then
        test_pass "Docker daemon is running"
    else
        test_fail "Docker daemon is not running"
    fi
}

check_containers() {
    section "Container Status"
    
    if docker ps | grep -q minecraft-server; then
        test_pass "Minecraft server container is running"
        
        # Check container health
        HEALTH=$(docker inspect --format='{{.State.Health.Status}}' minecraft-server 2>/dev/null || echo "none")
        if [ "$HEALTH" = "healthy" ]; then
            test_pass "Minecraft server is healthy"
        elif [ "$HEALTH" = "none" ]; then
            test_warn "Minecraft server health check not configured"
        else
            test_fail "Minecraft server is unhealthy"
        fi
    else
        test_fail "Minecraft server container is not running"
    fi
    
    if docker ps | grep -q console-backend; then
        test_pass "Console backend container is running"
    else
        test_warn "Console backend container is not running (optional)"
    fi
    
    if docker ps | grep -q redis; then
        test_pass "Redis container is running"
    else
        test_warn "Redis container is not running (may be external)"
    fi
}

check_network() {
    section "Network Configuration"
    
    # Check if ports are listening
    if netstat -tuln 2>/dev/null | grep -q ":25565 "; then
        test_pass "Minecraft port (25565) is listening"
    elif ss -tuln 2>/dev/null | grep -q ":25565 "; then
        test_pass "Minecraft port (25565) is listening"
    else
        test_fail "Minecraft port (25565) is not listening"
    fi
    
    if netstat -tuln 2>/dev/null | grep -q ":19132 "; then
        test_pass "Bedrock port (19132) is listening"
    elif ss -tuln 2>/dev/null | grep -q ":19132 "; then
        test_pass "Bedrock port (19132) is listening"
    else
        test_warn "Bedrock port (19132) is not listening (cross-play disabled)"
    fi
    
    # Check Docker network
    if docker network ls | grep -q caddy-network; then
        test_pass "Docker network (caddy-network) exists"
    else
        test_warn "Docker network (caddy-network) not found"
    fi
}

check_volumes() {
    section "Volume Configuration"
    
    if docker volume inspect minecraft_data &> /dev/null; then
        SIZE=$(docker run --rm -v minecraft_data:/data alpine du -sh /data 2>/dev/null | awk '{print $1}')
        test_pass "Minecraft data volume exists (Size: $SIZE)"
    else
        test_fail "Minecraft data volume not found"
    fi
    
    if docker volume inspect console_data &> /dev/null; then
        test_pass "Console data volume exists"
    else
        test_warn "Console data volume not found (optional)"
    fi
}

check_configuration() {
    section "Configuration Files"
    
    if [ -f .env ]; then
        test_pass ".env file exists"
        
        # Check for sensitive defaults
        if grep -q "RCON_PASSWORD=.*changeme" .env 2>/dev/null; then
            test_fail "RCON password is set to default value!"
        elif grep -q "RCON_PASSWORD=" .env; then
            test_pass "RCON password is configured"
        fi
        
        if grep -q "SESSION_SECRET=" .env; then
            test_pass "Session secret is configured"
        else
            test_warn "Session secret not found in .env"
        fi
    else
        test_warn ".env file not found (using environment variables)"
    fi
    
    if [ -f docker-compose.yml ]; then
        test_pass "docker-compose.yml exists"
    else
        test_fail "docker-compose.yml not found"
    fi
}

check_backups() {
    section "Backup System"
    
    BACKUP_DIR="${HOME}/minecraft-backups"
    
    if [ -d "$BACKUP_DIR" ]; then
        BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.tar.gz 2>/dev/null | wc -l)
        if [ "$BACKUP_COUNT" -gt 0 ]; then
            test_pass "Backup directory exists with $BACKUP_COUNT backup(s)"
            
            # Check latest backup age
            LATEST=$(ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | head -1)
            if [ -n "$LATEST" ]; then
                AGE=$(find "$LATEST" -mtime +7 2>/dev/null | wc -l)
                if [ "$AGE" -eq 0 ]; then
                    test_pass "Recent backup exists (< 7 days old)"
                else
                    test_warn "Latest backup is older than 7 days"
                fi
            fi
        else
            test_warn "Backup directory exists but no backups found"
        fi
    else
        test_warn "Backup directory not found at $BACKUP_DIR"
    fi
}

check_security() {
    section "Security Checks"
    
    # Check for secrets in environment
    if [ -f .env ]; then
        if grep -q "SESSION_SECRET=.*secret" .env 2>/dev/null; then
            test_fail "SESSION_SECRET appears to be a default/weak value"
        fi
        
        if grep -q "CSRF_SECRET=" .env; then
            test_pass "CSRF secret is configured"
        else
            test_warn "CSRF secret not found"
        fi
    fi
    
    # Check if console is accessible only via HTTPS
    if curl -k https://localhost:3001/health &> /dev/null; then
        test_pass "Console HTTPS endpoint is accessible"
    else
        test_warn "Console HTTPS endpoint not accessible (may be configured differently)"
    fi
    
    # Check firewall (if ufw is installed and user has sudo)
    if command -v ufw &> /dev/null; then
        if sudo -n ufw status 2>/dev/null | grep -q "Status: active"; then
            test_pass "Firewall (ufw) is active"
        elif sudo -n true 2>/dev/null && sudo ufw status 2>/dev/null | grep -q "Status: active"; then
            test_pass "Firewall (ufw) is active"
        else
            test_warn "Firewall (ufw) check skipped (requires sudo)"
        fi
    fi
}

check_rcon() {
    section "RCON Connectivity"
    
    if docker exec -i minecraft-server rcon-cli list &> /dev/null; then
        test_pass "RCON connection successful"
        
        # Get player count (portable version)
        PLAYERS=$(docker exec -i minecraft-server rcon-cli list 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="of") print $(i-1)}' | head -1 || echo "0")
        test_pass "Current players online: $PLAYERS"
    else
        test_fail "RCON connection failed"
    fi
}

check_logs() {
    section "Log Analysis"
    
    # Check for critical errors in recent logs
    ERRORS=$(docker compose logs --tail=100 2>/dev/null | grep -i "error\|exception\|fatal" | wc -l)
    
    if [ "$ERRORS" -eq 0 ]; then
        test_pass "No critical errors in recent logs"
    elif [ "$ERRORS" -lt 5 ]; then
        test_warn "Found $ERRORS error(s) in recent logs"
    else
        test_fail "Found $ERRORS error(s) in recent logs"
    fi
}

check_disk_space() {
    section "Disk Space"
    
    # Check available disk space
    DISK_FREE=$(df -h / | awk 'NR==2 {print $4}')
    DISK_PERCENT=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$DISK_PERCENT" -lt 80 ]; then
        test_pass "Disk space: $DISK_FREE free ($DISK_PERCENT% used)"
    elif [ "$DISK_PERCENT" -lt 90 ]; then
        test_warn "Disk space: $DISK_FREE free ($DISK_PERCENT% used) - Running low"
    else
        test_fail "Disk space: $DISK_FREE free ($DISK_PERCENT% used) - Critical!"
    fi
}

check_resources() {
    section "System Resources"
    
    # Check memory
    MEM_TOTAL=$(free -h | awk '/^Mem:/ {print $2}')
    MEM_USED=$(free -h | awk '/^Mem:/ {print $3}')
    MEM_PERCENT=$(free | awk '/^Mem:/ {printf "%.0f", $3/$2 * 100}')
    
    if [ "$MEM_PERCENT" -lt 80 ]; then
        test_pass "Memory: $MEM_USED / $MEM_TOTAL used ($MEM_PERCENT%)"
    elif [ "$MEM_PERCENT" -lt 90 ]; then
        test_warn "Memory: $MEM_USED / $MEM_TOTAL used ($MEM_PERCENT%) - High usage"
    else
        test_fail "Memory: $MEM_USED / $MEM_TOTAL used ($MEM_PERCENT%) - Critical!"
    fi
    
    # Check CPU load
    LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    test_pass "CPU load: $LOAD"
}

summary() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Summary${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  ${GREEN}Passed:${NC}   $PASSED"
    echo -e "  ${YELLOW}Warnings:${NC} $WARNINGS"
    echo -e "  ${RED}Failed:${NC}   $FAILED"
    echo ""
    
    if [ "$FAILED" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
        echo -e "${GREEN}✓ All checks passed! System is ready for launch.${NC}"
        echo ""
        return 0
    elif [ "$FAILED" -eq 0 ]; then
        echo -e "${YELLOW}⚠ System is mostly ready, but please review warnings above.${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}✗ System is NOT ready for launch. Please fix failed checks.${NC}"
        echo ""
        return 1
    fi
}

main() {
    echo "================================================"
    echo "  Minecraft Server - Launch Validation"
    echo "================================================"
    
    check_docker
    check_containers
    check_network
    check_volumes
    check_configuration
    check_backups
    check_security
    check_rcon
    check_logs
    check_disk_space
    check_resources
    
    summary
}

# Run validation
main
EXIT_CODE=$?

echo "For detailed launch checklist, see: LAUNCH-CHECKLIST.md"
echo ""

exit $EXIT_CODE
