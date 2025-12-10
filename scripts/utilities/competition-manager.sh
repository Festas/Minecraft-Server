#!/bin/bash
#
# Competition Manager for festas_builds Server
# Manages building competitions, themes, and announcements
#
# Usage: ./competition-manager.sh [start|end|reset|announce|vote|winners]
#

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
COMPETITION_WORLD="competition"
THEMES_FILE="$SERVER_DIR/config/templates/competitions/weekly-themes.md"
RCON_CLI="rcon-cli"  # Install with: apt install rcon-cli

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}  festas_builds Competition Manager${NC}"
    echo -e "${CYAN}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if rcon-cli is installed
check_rcon() {
    if ! command -v $RCON_CLI &> /dev/null; then
        print_error "rcon-cli not found. Install with: sudo apt install rcon-cli"
        exit 1
    fi
}

# Send command to server via RCON
send_command() {
    local cmd="$1"
    echo "$cmd" | $RCON_CLI --host localhost --port 25575 --password "$(cat ~/.rcon_password 2>/dev/null)"
}

# Announce to server
announce() {
    local message="$1"
    send_command "say $message"
}

# Broadcast title to all players
broadcast_title() {
    local title="$1"
    local subtitle="$2"
    send_command "title @a title {\"text\":\"$title\",\"color\":\"gold\",\"bold\":true}"
    if [ -n "$subtitle" ]; then
        send_command "title @a subtitle {\"text\":\"$subtitle\",\"color\":\"yellow\"}"
    fi
}

# Get random theme
get_random_theme() {
    if [ -f "$THEMES_FILE" ]; then
        # Extract themes from markdown file (lines starting with "- ")
        grep "^- " "$THEMES_FILE" | sed 's/^- //' | shuf -n 1
    else
        echo "Build something amazing!"
    fi
}

# Start new competition
start_competition() {
    print_header
    print_info "Starting new build competition..."
    
    # Get theme
    THEME=$(get_random_theme)
    echo ""
    echo -e "${MAGENTA}Competition Theme: ${GREEN}$THEME${NC}"
    echo ""
    
    # Confirm
    read -p "Start competition with this theme? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Competition start cancelled."
        exit 0
    fi
    
    # Announce to server
    announce "§6§l✦ NEW BUILD COMPETITION STARTING! ✦"
    sleep 1
    announce "§e§lTheme: §f$THEME"
    sleep 1
    announce "§7Build period: 1 week"
    sleep 1
    announce "§aType §e/plots auto §ato claim your competition plot!"
    sleep 1
    broadcast_title "NEW COMPETITION!" "$THEME"
    
    # Save theme to file
    echo "$THEME" > "$SERVER_DIR/current-competition-theme.txt"
    date +%Y-%m-%d > "$SERVER_DIR/current-competition-start.txt"
    
    print_success "Competition started successfully!"
    print_info "Theme: $THEME"
    print_info "Players can now claim plots with: /plots auto"
}

# End competition (close submissions)
end_competition() {
    print_header
    print_info "Ending competition and opening voting period..."
    
    # Check if competition is active
    if [ ! -f "$SERVER_DIR/current-competition-theme.txt" ]; then
        print_error "No active competition found."
        exit 1
    fi
    
    THEME=$(cat "$SERVER_DIR/current-competition-theme.txt")
    
    # Confirm
    read -p "End competition '$THEME' and start voting? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Competition end cancelled."
        exit 0
    fi
    
    # Announce to server
    announce "§6§l✦ COMPETITION BUILD PERIOD ENDED! ✦"
    sleep 1
    announce "§eTheme was: §f$THEME"
    sleep 1
    announce "§7Voting period has begun!"
    sleep 1
    announce "§aVisit plots with §e/plots visit <player> §ato vote!"
    sleep 1
    broadcast_title "VOTING TIME!" "Visit and rate builds!"
    
    # Mark as voting period
    echo "voting" > "$SERVER_DIR/current-competition-status.txt"
    
    print_success "Competition ended, voting period started!"
    print_info "Voting period: 3 days"
}

# Reset competition world
reset_competition() {
    print_header
    print_warning "⚠ This will CLEAR ALL PLOTS in the competition world!"
    print_warning "This action cannot be undone!"
    echo ""
    
    read -p "Are you absolutely sure? Type 'RESET' to confirm: " -r
    echo
    if [[ ! $REPLY == "RESET" ]]; then
        print_info "Reset cancelled."
        exit 0
    fi
    
    print_info "Resetting competition world..."
    
    # Clear all plots
    send_command "plot clear *"
    sleep 2
    
    # Delete temporary competition files
    rm -f "$SERVER_DIR/current-competition-theme.txt"
    rm -f "$SERVER_DIR/current-competition-start.txt"
    rm -f "$SERVER_DIR/current-competition-status.txt"
    
    announce "§6Competition world has been reset!"
    announce "§7Ready for the next competition!"
    
    print_success "Competition world reset complete!"
}

# Announce current competition
announce_competition() {
    print_header
    
    if [ ! -f "$SERVER_DIR/current-competition-theme.txt" ]; then
        print_warning "No active competition."
        announce "§eNo active competition at the moment."
        exit 0
    fi
    
    THEME=$(cat "$SERVER_DIR/current-competition-theme.txt")
    STATUS=$(cat "$SERVER_DIR/current-competition-status.txt" 2>/dev/null || echo "building")
    
    if [ "$STATUS" == "voting" ]; then
        announce "§6§l✦ COMPETITION VOTING PERIOD ✦"
        announce "§eTheme: §f$THEME"
        announce "§aVisit builds and vote with §e/plot rate"
    else
        announce "§6§l✦ ACTIVE BUILD COMPETITION ✦"
        announce "§eTheme: §f$THEME"
        announce "§aClaim your plot with §e/plots auto"
    fi
    
    print_success "Competition announced to server!"
}

# Start voting period
start_voting() {
    print_header
    print_info "Opening voting period..."
    
    announce "§6§l✦ VOTING IS NOW OPEN! ✦"
    sleep 1
    announce "§eVisit builds with §f/plots visit <player>"
    sleep 1
    announce "§eRate builds with §f/plot rate <1-10>"
    sleep 1
    announce "§7Vote based on: Creativity, Technique, Theme"
    
    echo "voting" > "$SERVER_DIR/current-competition-status.txt"
    
    print_success "Voting period started!"
}

# Announce winners
announce_winners() {
    print_header
    print_info "Announce competition winners"
    echo ""
    
    echo "Enter winners (or press Enter to skip):"
    read -p "1st Place (username): " first
    read -p "2nd Place (username): " second
    read -p "3rd Place (username): " third
    
    if [ -z "$first" ]; then
        print_warning "No winners entered."
        exit 0
    fi
    
    # Announce winners
    announce "§6§l✦✦✦ COMPETITION RESULTS ✦✦✦"
    sleep 2
    announce "§e§l3rd Place: §f$third §7- Bronze Medal"
    sleep 2
    announce "§e§l2nd Place: §f$second §7- Silver Trophy"
    sleep 2
    announce "§6§l1st Place: §f$first §7- Winner Crown!"
    sleep 2
    broadcast_title "WINNER: $first" "Congratulations!"
    sleep 3
    announce "§aCongratulations to all participants!"
    
    print_success "Winners announced!"
    print_info "Don't forget to give out rewards manually or via LuckPerms!"
}

# Show help
show_help() {
    print_header
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start      - Start a new competition with random theme"
    echo "  end        - End build period and start voting"
    echo "  reset      - Clear all plots (use after competition ends)"
    echo "  announce   - Announce current competition to server"
    echo "  vote       - Open voting period"
    echo "  winners    - Announce competition winners"
    echo ""
    echo "Examples:"
    echo "  $0 start          # Start new competition"
    echo "  $0 announce       # Remind players about competition"
    echo "  $0 end            # End building, start voting"
    echo "  $0 winners        # Announce winners"
    echo "  $0 reset          # Clear plots for next competition"
    echo ""
}

# Main script
case "$1" in
    start)
        start_competition
        ;;
    end)
        end_competition
        ;;
    reset)
        reset_competition
        ;;
    announce)
        announce_competition
        ;;
    vote)
        start_voting
        ;;
    winners)
        announce_winners
        ;;
    *)
        show_help
        ;;
esac
