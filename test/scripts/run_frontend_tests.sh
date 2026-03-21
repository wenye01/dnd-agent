#!/bin/bash

# Frontend Test Runner for DND Agent
# This script runs all TypeScript frontend tests

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/apps/web"

echo -e "${YELLOW}Running Frontend Tests${NC}"
echo "======================================="
echo ""

# Check if we're in the frontend directory
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}Error: Frontend directory not found at $FRONTEND_DIR${NC}"
    exit 1
fi

# Change to frontend directory
cd "$FRONTEND_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}node_modules not found. Installing dependencies...${NC}"
    # Use pnpm for this monorepo project
    pnpm install --frozen-lockfile
fi

# Check if Vitest is installed
if ! pnpm list vitest >/dev/null 2>&1; then
    echo -e "${YELLOW}Vitest not found. Installing...${NC}"
    pnpm add --save-dev vitest @vitest/ui happy-dom
fi

# Run tests
echo -e "${YELLOW}Running tests...${NC}"
# Capture exit code without using set -e
pnpm test -- --run
test_result=$?

# Check if tests passed
if [ $test_result -eq 0 ]; then
    echo ""
    echo -e "${GREEN}All tests passed!${NC}"
else
    echo ""
    echo -e "${RED}Tests failed!${NC}"
    exit 1
fi

echo ""
echo "======================================="
echo -e "${GREEN}Frontend tests completed successfully!${NC}"
