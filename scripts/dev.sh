#!/bin/bash

# HyperTrigger Development Script
# Run everything you need with one command

set -e

echo "🚀 HyperTrigger Development Environment"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if port is in use
port_in_use() {
    lsof -i:$1 >/dev/null 2>&1
}

# Parse arguments
SKIP_INSTALL=false
RUN_TESTS=false
BUILD_ONLY=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --skip-install) SKIP_INSTALL=true ;;
        --test) RUN_TESTS=true ;;
        --build) BUILD_ONLY=true ;;
        --help) 
            echo "Usage: ./scripts/dev.sh [options]"
            echo ""
            echo "Options:"
            echo "  --skip-install  Skip pnpm install"
            echo "  --test          Run all tests instead of dev servers"
            echo "  --build         Build all packages only"
            echo "  --help          Show this help"
            exit 0
            ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

cd "$(dirname "$0")/.."

# Install dependencies
if [ "$SKIP_INSTALL" = false ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    pnpm install
    echo ""
fi

# Build shared packages first
echo -e "${BLUE}🔨 Building shared packages...${NC}"
pnpm --filter @hyper-trigger/shared build
pnpm --filter @hyper-trigger/api-client build
echo ""

# Run tests mode
if [ "$RUN_TESTS" = true ]; then
    echo -e "${YELLOW}🧪 Running all tests...${NC}"
    echo ""
    
    echo -e "${BLUE}Testing contracts...${NC}"
    pnpm --filter @hyper-trigger/contracts test
    echo ""
    
    echo -e "${BLUE}Testing API...${NC}"
    pnpm --filter @hyper-trigger/api test
    echo ""
    
    echo -e "${BLUE}Testing frontend...${NC}"
    pnpm --filter @hyper-trigger/frontend test
    echo ""
    
    echo -e "${GREEN}✅ All tests passed!${NC}"
    exit 0
fi

# Build only mode
if [ "$BUILD_ONLY" = true ]; then
    echo -e "${YELLOW}🔨 Building all packages...${NC}"
    pnpm build
    echo -e "${GREEN}✅ Build complete!${NC}"
    exit 0
fi

# Development mode - start all services
echo -e "${YELLOW}🚀 Starting development servers...${NC}"
echo ""

echo "Services:"
echo -e "  ${GREEN}Frontend${NC}  → http://localhost:3000"
echo -e "  ${GREEN}API${NC}       → http://localhost:4000"
echo -e "  ${GREEN}API Docs${NC}  → http://localhost:4000/docs"
echo ""

echo -e "${BLUE}Starting services in parallel...${NC}"
echo "(Press Ctrl+C to stop all services)"
echo ""

# Run all dev servers
pnpm dev

