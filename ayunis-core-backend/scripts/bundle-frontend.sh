#!/bin/bash

# Exit on any error
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting frontend build and bundle process...${NC}"

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/core-frontend"
BACKEND_FRONTEND_DIR="$PROJECT_ROOT/core-backend/frontend"

echo -e "${BLUE}Project root: $PROJECT_ROOT${NC}"
echo -e "${BLUE}Frontend source: $FRONTEND_DIR${NC}"
echo -e "${BLUE}Backend frontend target: $BACKEND_FRONTEND_DIR${NC}"

# Check if frontend directory exists
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}Error: Frontend directory not found at $FRONTEND_DIR${NC}"
    exit 1
fi

# Navigate to frontend directory
echo -e "${BLUE}Navigating to frontend directory...${NC}"
cd "$FRONTEND_DIR"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}Installing frontend dependencies...${NC}"
    npm install
fi

# Build the frontend
echo -e "${BLUE}Building frontend...${NC}"
npm run build

# Check if build was successful (dist directory should exist)
if [ ! -d "dist" ]; then
    echo -e "${RED}Error: Build failed - dist directory not found${NC}"
    exit 1
fi

# Navigate back to script directory
cd "$SCRIPT_DIR"

# Delete content of backend frontend directory
echo -e "${BLUE}Deleting content of backend frontend directory...${NC}"
rm -rf "$BACKEND_FRONTEND_DIR/*"

# Copy the built frontend to backend frontend directory
echo -e "${BLUE}Copying built frontend to backend...${NC}"
cp -r "$FRONTEND_DIR/dist" "$BACKEND_FRONTEND_DIR"

# Verify the copy was successful
if [ -d "$BACKEND_FRONTEND_DIR" ] && [ -f "$BACKEND_FRONTEND_DIR/index.html" ]; then
    echo -e "${GREEN}✅ Frontend successfully built and bundled!${NC}"
    echo -e "${GREEN}Built frontend is now available at: $BACKEND_FRONTEND_DIR${NC}"
else
    echo -e "${RED}❌ Error: Failed to copy frontend build to backend${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Bundle process completed successfully!${NC}"
