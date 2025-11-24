#!/bin/bash

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}      TeleShop System Updater           ${NC}"
echo -e "${GREEN}========================================${NC}"

# 1. Pull changes
echo -e "${YELLOW}[1/4] Pulling latest code...${NC}"
if [ -d ".git" ]; then
    git fetch --all
    git reset --hard origin/main
else
    echo -e "${RED}Error: Not a git repository. Skipping pull.${NC}"
fi

# 2. Install Dependencies
echo -e "${YELLOW}[2/4] Installing dependencies...${NC}"
npm install --legacy-peer-deps

# 3. Build Frontend
echo -e "${YELLOW}[3/4] Building Frontend...${NC}"
npm run build

if [ ! -d "dist" ]; then
    echo -e "${RED}Build failed! 'dist' folder missing.${NC}"
    exit 1
fi

# 4. Restart Backend
echo -e "${YELLOW}[4/4] Restarting Backend Server...${NC}"

# Ensure PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

# Restart or Start
pm2 reload teleshop-server || pm2 start server.js --name teleshop-server
pm2 save

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Update Complete!                     ${NC}"
echo -e "${GREEN}   Order System Active.                 ${NC}"
echo -e "${GREEN}   Server: http://localhost:3001        ${NC}"
echo -e "${GREEN}========================================${NC}"
