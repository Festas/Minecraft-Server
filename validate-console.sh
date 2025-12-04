#!/bin/bash
# Basic validation script for console backend

set -e

echo "🔍 Validating Minecraft Web Console..."

# Check directory structure
echo "✓ Checking directory structure..."
[ -d "console/backend" ] || { echo "❌ backend directory not found"; exit 1; }
[ -d "console/frontend" ] || { echo "❌ frontend directory not found"; exit 1; }

# Check required files exist
echo "✓ Checking required files..."
[ -f "console/backend/package.json" ] || { echo "❌ package.json not found"; exit 1; }
[ -f "console/backend/server.js" ] || { echo "❌ server.js not found"; exit 1; }
[ -f "console/backend/Dockerfile" ] || { echo "❌ Dockerfile not found"; exit 1; }
[ -f "console/frontend/index.html" ] || { echo "❌ index.html not found"; exit 1; }
[ -f "console/frontend/login.html" ] || { echo "❌ login.html not found"; exit 1; }
[ -f "docker-compose.console.yml" ] || { echo "❌ docker-compose.console.yml not found"; exit 1; }
[ -f ".env.example" ] || { echo "❌ .env.example not found"; exit 1; }
[ -f "CONSOLE-SETUP.md" ] || { echo "❌ CONSOLE-SETUP.md not found"; exit 1; }

# Validate JavaScript syntax
echo "✓ Validating JavaScript syntax..."
for file in console/backend/**/*.js console/frontend/js/*.js; do
    if [ -f "$file" ]; then
        node -c "$file" || { echo "❌ Syntax error in $file"; exit 1; }
    fi
done

# Validate JSON files
echo "✓ Validating JSON files..."
for file in console/backend/**/*.json console/backend/*.json; do
    if [ -f "$file" ]; then
        python3 -m json.tool "$file" > /dev/null || { echo "❌ Invalid JSON in $file"; exit 1; }
    fi
done

# Check docker-compose syntax
echo "✓ Validating docker-compose files..."
docker compose -f docker-compose.console.yml config > /dev/null || { echo "❌ Invalid docker-compose.console.yml"; exit 1; }
docker compose -f docker-compose.yml config > /dev/null || { echo "❌ Invalid docker-compose.yml"; exit 1; }

echo ""
echo "✅ All validations passed!"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env and configure"
echo "2. Run: docker compose -f docker-compose.console.yml up -d"
echo "3. Access console at http://localhost:3001/console"
echo ""
echo "For detailed setup instructions, see CONSOLE-SETUP.md"
