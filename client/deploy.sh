#!/bin/bash

# ============================================================
# ODD GRAVITY PRODUCTION DEPLOYMENT SCRIPT
# 
# This script applies all production-ready updates to your game.
# Run this from the production-updates directory.
# ============================================================

set -e  # Exit on any error

echo "🚀 Odd Gravity Production Deployment"
echo "======================================"

# Configuration - UPDATE THESE PATHS
CLIENT_DIR="/opt/obc/client"
BACKUP_DIR="/opt/obc/backups/$(date +%Y%m%d-%H%M%S)"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if client directory exists
if [ ! -d "$CLIENT_DIR" ]; then
    echo -e "${RED}Error: Client directory not found at $CLIENT_DIR${NC}"
    echo "Please update CLIENT_DIR in this script."
    exit 1
fi

# Create backup
echo -e "${YELLOW}📦 Creating backup...${NC}"
mkdir -p "$BACKUP_DIR"
cp -r "$CLIENT_DIR/src" "$BACKUP_DIR/"
cp -r "$CLIENT_DIR/public" "$BACKUP_DIR/"
cp "$CLIENT_DIR/index.html" "$BACKUP_DIR/"
echo -e "${GREEN}✅ Backup created at $BACKUP_DIR${NC}"

# Copy new files
echo -e "${YELLOW}📋 Copying new files...${NC}"

# ErrorBoundary component
cp src/ErrorBoundary.jsx "$CLIENT_DIR/src/"
echo "  ✅ ErrorBoundary.jsx"

# Updated main.jsx
cp src/main.jsx "$CLIENT_DIR/src/"
echo "  ✅ main.jsx (with error boundary & SW updates)"

# Updated index.html
cp index.html "$CLIENT_DIR/"
echo "  ✅ index.html (mobile optimized)"

# Privacy policy
cp public/privacy.html "$CLIENT_DIR/public/"
echo "  ✅ privacy.html"

# Service worker
cp public/sw.js "$CLIENT_DIR/public/"
echo "  ✅ sw.js (v20)"

# Manifest
cp public/manifest.webmanifest "$CLIENT_DIR/public/"
echo "  ✅ manifest.webmanifest (complete PWA)"

# Append CSS additions
echo -e "${YELLOW}🎨 Appending CSS additions...${NC}"
cat src/styles-additions.css >> "$CLIENT_DIR/src/styles.css"
echo "  ✅ CSS additions appended to styles.css"

echo ""
echo -e "${YELLOW}⚠️  MANUAL STEPS REQUIRED:${NC}"
echo ""
echo "1. Apply Game.jsx patches manually:"
echo "   - Open src/Game-patches.js for instructions"
echo "   - Add visibility change handlers"
echo "   - Update cleanup/return function"
echo ""
echo "2. Create app icons (if not already done):"
echo "   - 512x512 icon for Play Store"
echo "   - 192x192, 48x48 for PWA"
echo "   - Maskable versions for Android"
echo ""
echo "3. Update privacy policy contact email:"
echo "   - Edit public/privacy.html"
echo "   - Replace 'privacy@oddgravity.game' with your email"
echo ""
echo "4. Build and test:"
echo "   cd $CLIENT_DIR"
echo "   npm run build"
echo "   npm run preview"
echo ""
echo "5. Test on mobile device before deploying!"
echo ""

# Build option
read -p "Would you like to build now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🔨 Building...${NC}"
    cd "$CLIENT_DIR"
    npm run build
    echo -e "${GREEN}✅ Build complete!${NC}"
    echo ""
    echo "Run 'npm run preview' to test locally."
fi

echo ""
echo -e "${GREEN}🎉 Production updates applied!${NC}"
echo ""
echo "Next steps:"
echo "1. Test thoroughly on mobile"
echo "2. Create app store assets (icons, screenshots)"
echo "3. Set up Google Play Developer account (\$25)"
echo "4. Use PWABuilder.com to generate Android APK"
echo "5. Submit to Play Store!"
