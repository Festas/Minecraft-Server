#!/bin/bash

################################################################################
# Resource & Network Monitoring During Page Load
# 
# This script monitors system resources while the frontend is loading:
# - CPU usage
# - Memory usage
# - Docker container stats
# - Network connections
################################################################################

set -euo pipefail

# Configuration
OUTPUT_DIR="${OUTPUT_DIR:-/tmp/resource-monitor}"
DURATION="${MONITOR_DURATION:-30}"
INTERVAL="${MONITOR_INTERVAL:-1}"
CONTAINER_NAME="${CONTAINER_NAME:-minecraft-console}"

# Create output directory
mkdir -p "${OUTPUT_DIR}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

log_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

################################################################################
# Monitor system resources
################################################################################
monitor_system_resources() {
    local output_file="${OUTPUT_DIR}/system-resources.log"
    local count=0
    local max_count=$((DURATION / INTERVAL))
    
    log_info "Monitoring system resources for ${DURATION} seconds..."
    
    {
        echo "TIMESTAMP,CPU_PERCENT,MEM_TOTAL_MB,MEM_USED_MB,MEM_FREE_MB,MEM_PERCENT,LOAD_1MIN,LOAD_5MIN,LOAD_15MIN"
        
        while [ $count -lt $max_count ]; do
            timestamp=$(date '+%Y-%m-%d %H:%M:%S')
            
            # CPU usage (from top)
            cpu_percent=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
            
            # Memory usage
            mem_info=$(free -m | grep "Mem:")
            mem_total=$(echo "${mem_info}" | awk '{print $2}')
            mem_used=$(echo "${mem_info}" | awk '{print $3}')
            mem_free=$(echo "${mem_info}" | awk '{print $4}')
            mem_percent=$(awk "BEGIN {printf \"%.2f\", (${mem_used}/${mem_total})*100}")
            
            # Load average
            load_avg=$(uptime | awk -F'load average:' '{print $2}' | sed 's/,//g')
            load_1=$(echo "${load_avg}" | awk '{print $1}')
            load_5=$(echo "${load_avg}" | awk '{print $2}')
            load_15=$(echo "${load_avg}" | awk '{print $3}')
            
            echo "${timestamp},${cpu_percent},${mem_total},${mem_used},${mem_free},${mem_percent},${load_1},${load_5},${load_15}"
            
            count=$((count + 1))
            sleep "${INTERVAL}"
        done
    } > "${output_file}"
    
    log_success "System resources logged to: ${output_file}"
}

################################################################################
# Monitor Docker container stats
################################################################################
monitor_docker_stats() {
    local output_file="${OUTPUT_DIR}/docker-stats.log"
    local count=0
    local max_count=$((DURATION / INTERVAL))
    
    log_info "Monitoring Docker container stats for ${DURATION} seconds..."
    
    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        echo "Docker not available, skipping container monitoring" > "${output_file}"
        return
    fi
    
    # Check if container exists
    if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo "Container ${CONTAINER_NAME} not found, skipping container monitoring" > "${output_file}"
        return
    fi
    
    {
        echo "TIMESTAMP,CPU_PERCENT,MEM_USAGE_MB,MEM_LIMIT_MB,MEM_PERCENT,NET_INPUT_MB,NET_OUTPUT_MB,BLOCK_INPUT_MB,BLOCK_OUTPUT_MB"
        
        while [ $count -lt $max_count ]; do
            timestamp=$(date '+%Y-%m-%d %H:%M:%S')
            
            # Get Docker stats (one-time format)
            stats=$(docker stats "${CONTAINER_NAME}" --no-stream --format "{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}},{{.NetIO}},{{.BlockIO}}" 2>/dev/null || echo "N/A,N/A,N/A,N/A,N/A")
            
            if [ "${stats}" != "N/A,N/A,N/A,N/A,N/A" ]; then
                # Parse stats
                cpu_percent=$(echo "${stats}" | cut -d',' -f1 | tr -d '%')
                mem_usage=$(echo "${stats}" | cut -d',' -f2 | awk '{print $1}')
                mem_limit=$(echo "${stats}" | cut -d',' -f2 | awk '{print $3}')
                mem_percent=$(echo "${stats}" | cut -d',' -f3 | tr -d '%')
                net_io=$(echo "${stats}" | cut -d',' -f4)
                block_io=$(echo "${stats}" | cut -d',' -f5)
                
                # Parse network I/O
                net_input=$(echo "${net_io}" | awk '{print $1}')
                net_output=$(echo "${net_io}" | awk '{print $3}')
                
                # Parse block I/O
                block_input=$(echo "${block_io}" | awk '{print $1}')
                block_output=$(echo "${block_io}" | awk '{print $3}')
                
                echo "${timestamp},${cpu_percent},${mem_usage},${mem_limit},${mem_percent},${net_input},${net_output},${block_input},${block_output}"
            else
                echo "${timestamp},N/A,N/A,N/A,N/A,N/A,N/A,N/A,N/A"
            fi
            
            count=$((count + 1))
            sleep "${INTERVAL}"
        done
    } > "${output_file}"
    
    log_success "Docker stats logged to: ${output_file}"
}

################################################################################
# Monitor network connections
################################################################################
monitor_network_connections() {
    local output_file="${OUTPUT_DIR}/network-connections.log"
    local count=0
    local max_count=$((DURATION / INTERVAL))
    
    log_info "Monitoring network connections for ${DURATION} seconds..."
    
    {
        echo "=== Network Connection Monitoring ==="
        echo "Started: $(date)"
        echo ""
        
        while [ $count -lt $max_count ]; do
            echo "--- Timestamp: $(date '+%Y-%m-%d %H:%M:%S') ---"
            
            # Count established connections
            established=$(netstat -an 2>/dev/null | grep ESTABLISHED | wc -l || echo "N/A")
            echo "Established connections: ${established}"
            
            # Count listening ports
            listening=$(netstat -an 2>/dev/null | grep LISTEN | wc -l || echo "N/A")
            echo "Listening ports: ${listening}"
            
            # Check specific ports if Docker is available
            if command -v docker &> /dev/null && docker ps -q --filter "name=${CONTAINER_NAME}" &> /dev/null; then
                # Check console port (usually 3000)
                console_connections=$(netstat -an 2>/dev/null | grep ":3000" | grep ESTABLISHED | wc -l || echo "0")
                echo "Console port connections: ${console_connections}"
            fi
            
            echo ""
            
            count=$((count + 1))
            sleep "${INTERVAL}"
        done
        
        echo "Completed: $(date)"
    } > "${output_file}"
    
    log_success "Network connections logged to: ${output_file}"
}

################################################################################
# Capture process list
################################################################################
capture_process_list() {
    local output_file="${OUTPUT_DIR}/process-list.txt"
    
    log_info "Capturing process list..."
    
    {
        echo "=== Process List ==="
        echo "Captured: $(date)"
        echo ""
        
        # Top processes by CPU
        echo "--- Top 20 Processes by CPU ---"
        ps aux --sort=-%cpu | head -21
        
        echo ""
        echo "--- Top 20 Processes by Memory ---"
        ps aux --sort=-%mem | head -21
        
        # If Docker is available, show container processes
        if command -v docker &> /dev/null && docker ps -q --filter "name=${CONTAINER_NAME}" &> /dev/null; then
            echo ""
            echo "--- Container Processes ---"
            docker top "${CONTAINER_NAME}" 2>/dev/null || echo "Could not get container processes"
        fi
    } > "${output_file}"
    
    log_success "Process list saved to: ${output_file}"
}

################################################################################
# Generate summary report
################################################################################
generate_summary() {
    local summary_file="${OUTPUT_DIR}/SUMMARY.txt"
    
    log_info "Generating summary report..."
    
    {
        echo "================================================================================"
        echo "RESOURCE MONITORING SUMMARY"
        echo "================================================================================"
        echo ""
        echo "Timestamp: $(date)"
        echo "Duration: ${DURATION} seconds"
        echo "Interval: ${INTERVAL} seconds"
        echo ""
        
        echo "SYSTEM RESOURCES"
        echo "--------------------------------------------------------------------------------"
        if [ -f "${OUTPUT_DIR}/system-resources.log" ]; then
            # Calculate averages
            echo "Average CPU usage:"
            tail -n +2 "${OUTPUT_DIR}/system-resources.log" | awk -F',' '{sum+=$2; count++} END {printf "  %.2f%%\n", sum/count}'
            
            echo "Average Memory usage:"
            tail -n +2 "${OUTPUT_DIR}/system-resources.log" | awk -F',' '{sum+=$6; count++} END {printf "  %.2f%%\n", sum/count}'
            
            echo "Peak Memory usage:"
            tail -n +2 "${OUTPUT_DIR}/system-resources.log" | awk -F',' '{max=0} {if($6>max) max=$6} END {printf "  %.2f%%\n", max}'
        else
            echo "  No data available"
        fi
        echo ""
        
        echo "DOCKER CONTAINER STATS"
        echo "--------------------------------------------------------------------------------"
        if [ -f "${OUTPUT_DIR}/docker-stats.log" ]; then
            if grep -q "N/A" "${OUTPUT_DIR}/docker-stats.log" || grep -q "not found" "${OUTPUT_DIR}/docker-stats.log"; then
                echo "  Container monitoring not available"
            else
                echo "Average container CPU usage:"
                tail -n +2 "${OUTPUT_DIR}/docker-stats.log" | awk -F',' '{sum+=$2; count++} END {printf "  %.2f%%\n", sum/count}'
                
                echo "Average container Memory usage:"
                tail -n +2 "${OUTPUT_DIR}/docker-stats.log" | awk -F',' '{sum+=$5; count++} END {printf "  %.2f%%\n", sum/count}'
            fi
        else
            echo "  No data available"
        fi
        echo ""
        
        echo "NETWORK CONNECTIONS"
        echo "--------------------------------------------------------------------------------"
        if [ -f "${OUTPUT_DIR}/network-connections.log" ]; then
            echo "Average established connections:"
            grep "Established connections:" "${OUTPUT_DIR}/network-connections.log" | awk '{sum+=$3; count++} END {printf "  %.0f\n", sum/count}'
            
            echo "Average listening ports:"
            grep "Listening ports:" "${OUTPUT_DIR}/network-connections.log" | awk '{sum+=$3; count++} END {printf "  %.0f\n", sum/count}'
        else
            echo "  No data available"
        fi
        echo ""
        
        echo "DIAGNOSTIC FILES"
        echo "--------------------------------------------------------------------------------"
        echo "All files saved to: ${OUTPUT_DIR}"
        echo ""
        ls -lh "${OUTPUT_DIR}" | tail -n +2 | awk '{printf "  %-40s %10s\n", $9, $5}'
        echo ""
        
        echo "ROOT CAUSE ANALYSIS GUIDE"
        echo "--------------------------------------------------------------------------------"
        echo "1. Review system-resources.log for CPU/memory spikes during page load"
        echo "2. Check docker-stats.log for container resource consumption"
        echo "3. Examine network-connections.log for connection issues"
        echo "4. Review process-list.txt for resource-intensive processes"
        echo ""
        echo "High CPU/memory usage may indicate:"
        echo "  - Infinite loops in JavaScript"
        echo "  - Memory leaks in frontend code"
        echo "  - Heavy DOM manipulation"
        echo "  - Large data processing"
        echo ""
        
    } > "${summary_file}"
    
    cat "${summary_file}"
    log_success "Summary saved to: ${summary_file}"
}

################################################################################
# Main execution
################################################################################
main() {
    echo "================================================================================"
    echo "Resource & Network Monitoring"
    echo "================================================================================"
    echo ""
    echo "Configuration:"
    echo "  Output Directory: ${OUTPUT_DIR}"
    echo "  Duration: ${DURATION} seconds"
    echo "  Interval: ${INTERVAL} seconds"
    echo "  Container: ${CONTAINER_NAME}"
    echo ""
    
    # Run all monitors in parallel
    monitor_system_resources &
    pid_system=$!
    
    monitor_docker_stats &
    pid_docker=$!
    
    monitor_network_connections &
    pid_network=$!
    
    # Wait for all monitors to complete
    wait $pid_system
    wait $pid_docker
    wait $pid_network
    
    # Capture process list
    capture_process_list
    
    # Generate summary
    echo ""
    generate_summary
    
    echo ""
    log_success "Resource monitoring complete!"
}

# Run if executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
