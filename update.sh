#!/bin/bash
# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}      TeleShop System Updater           ${NC}"
echo -e "${GREEN}========================================${NC}"

# 1. Pull
echo -e "${YELLOW}[1/3] Pulling changes...${NC}"
git fetch --all
git reset --hard origin/main

# 2. Build
echo -e "${YELLOW}[2/3] Building Frontend...${NC}"
npm install --legacy-peer-deps
npm run build

# 3. Restart
echo -e "${YELLOW}[3/3] Restarting Server...${NC}"
pm2 reload teleshop-server || pm2 start server.js --name teleshop-server
pm2 save

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Update Complete!                     ${NC}"
echo -e "${GREEN}   Package Count Field Added.           ${NC}"
echo -e "${GREEN}========================================${NC}"
