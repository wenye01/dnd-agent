#!/bin/bash

# Backend Test Runner for DND Agent
# This script runs all Go backend tests from the test/backend directory

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_TEST_DIR="$PROJECT_ROOT/test/backend"

echo -e "${YELLOW}Running Backend Tests${NC}"
echo "====================================="
echo ""

# Check if test directory exists
if [ ! -d "$BACKEND_TEST_DIR" ]; then
    echo -e "${RED}Error: Test directory not found at $BACKEND_TEST_DIR${NC}"
    exit 1
fi

# Change to test directory
cd "$BACKEND_TEST_DIR"

# Run tests with coverage
# Use -coverpkg to cover the actual source packages in apps/server
echo -e "${YELLOW}Running tests with coverage...${NC}"
go test -v -cover -coverprofile=coverage.out -coverpkg=github.com/dnd-game/server/... ./...
test_result=$?

# Check if tests passed
if [ $test_result -eq 0 ]; then
    echo ""
    echo -e "${GREEN}All tests passed!${NC}"

    # Generate coverage report
    if [ -f coverage.out ]; then
        echo ""
        echo -e "${YELLOW}Coverage Report:${NC}"
        go tool cover -func=coverage.out | tail -1

        # Generate HTML coverage report
        echo ""
        echo -e "${YELLOW}Generating HTML coverage report...${NC}"
        go tool cover -html=coverage.out -o coverage.html
        echo -e "${GREEN}Coverage report generated: $BACKEND_TEST_DIR/coverage.html${NC}"
    fi
else
    echo ""
    echo -e "${RED}Tests failed!${NC}"
    exit 1
fi

echo ""
echo "====================================="
echo -e "${GREEN}Backend tests completed successfully!${NC}"
