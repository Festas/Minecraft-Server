#!/bin/bash
# RCON Password Validation Script
# This script validates that a secure RCON password is set before starting the server

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default password that should NOT be used
DEFAULT_PASSWORD="change-this-secure-rcon-password"

# Get the RCON password from environment
RCON_PASSWORD="${RCON_PASSWORD:-}"

echo "🔒 Validating RCON password configuration..."

# Check if RCON_PASSWORD is set
if [ -z "$RCON_PASSWORD" ]; then
    echo -e "${RED}❌ ERROR: RCON_PASSWORD environment variable is not set!${NC}"
    echo ""
    echo "Please set a secure RCON password:"
    echo "  export RCON_PASSWORD='your-secure-password'"
    echo "  or add it to your .env file"
    echo ""
    exit 1
fi

# Check if using default password
if [ "$RCON_PASSWORD" = "$DEFAULT_PASSWORD" ]; then
    echo -e "${RED}❌ ERROR: RCON_PASSWORD is set to the default insecure value!${NC}"
    echo ""
    echo "The default password '$DEFAULT_PASSWORD' is not secure."
    echo "Please set a strong, unique password:"
    echo "  export RCON_PASSWORD='your-secure-password'"
    echo "  or add it to your .env file"
    echo ""
    exit 1
fi

# Check password strength
PASSWORD_LENGTH=${#RCON_PASSWORD}

if [ $PASSWORD_LENGTH -lt 12 ]; then
    echo -e "${RED}❌ ERROR: RCON_PASSWORD is too short (minimum 12 characters)!${NC}"
    echo ""
    echo "Current length: $PASSWORD_LENGTH characters"
    echo "Please use a password with at least 12 characters."
    echo ""
    exit 1
fi

# Check for common weak patterns
if [[ "$RCON_PASSWORD" =~ ^(password|12345|qwerty|admin|minecraft) ]]; then
    echo -e "${RED}❌ ERROR: RCON_PASSWORD contains common weak patterns!${NC}"
    echo ""
    echo "Please use a strong, unique password that doesn't contain:"
    echo "  - Common words (password, admin, minecraft, etc.)"
    echo "  - Simple sequences (12345, qwerty, etc.)"
    echo ""
    exit 1
fi

# All checks passed
echo -e "${GREEN}✅ RCON password validation passed!${NC}"
echo "   Password length: $PASSWORD_LENGTH characters"
echo ""

exit 0
