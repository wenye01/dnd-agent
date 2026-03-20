#!/bin/bash

# Backend Test Runner for DND Agent
# This script runs all Go backend tests from the test directory

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/apps/server"
TEST_DIR="$PROJECT_ROOT/test/backend"

echo -e "${YELLOW}Running Backend Tests${NC}"
echo "====================================="
echo ""

# Check if directories exist
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}Error: Backend directory not found at $BACKEND_DIR${NC}"
    exit 1
fi

if [ ! -d "$TEST_DIR" ]; then
    echo -e "${RED}Error: Test directory not found at $TEST_DIR${NC}"
    exit 1
fi

# Run tests from the backend directory (tests import from backend)
echo -e "${YELLOW}Running tests with coverage...${NC}"
cd "$BACKEND_DIR"

# Run tests from test/backend directory
# Capture exit code without using set -e
go test -v -cover -coverprofile=coverage.out ./test/...
test_result=$?

# Check if tests passed
if [ $test_result -eq 0 ]; then
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
