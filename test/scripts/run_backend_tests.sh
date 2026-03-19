#!/bin/bash

# Backend Test Runner for DND Agent
# This script runs all Go backend tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/apps/server"

echo -e "${YELLOW}Running Backend Tests${NC}"
echo "====================================="
echo ""

# Check if we're in the backend directory
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}Error: Backend directory not found at $BACKEND_DIR${NC}"
    exit 1
fi

# Change to backend directory
cd "$BACKEND_DIR"

# Run tests with coverage
echo -e "${YELLOW}Running tests with coverage...${NC}"
go test -v -cover -coverprofile=coverage.out ./...

# Check if tests passed
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}All tests passed!${NC}"

    # Generate coverage report
    echo ""
    echo -e "${YELLOW}Coverage Report:${NC}"
    go tool cover -func=coverage.out | tail -1

    # Generate HTML coverage report
    echo ""
    echo -e "${YELLOW}Generating HTML coverage report...${NC}"
    go tool cover -html=coverage.out -o coverage.html
    echo -e "${GREEN}Coverage report generated: coverage.html${NC}"
else
    echo ""
    echo -e "${RED}Tests failed!${NC}"
    exit 1
fi

echo ""
echo "====================================="
echo -e "${GREEN}Backend tests completed successfully!${NC}"
