#!/bin/bash

# All Tests Runner for DND Agent
# This script runs both backend and frontend tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo -e "${BLUE}======================================"
echo "DND Agent - Test Suite"
echo "======================================${NC}"
echo ""

# Track overall success
BACKEND_PASSED=false
FRONTEND_PASSED=false

# Run Backend Tests
echo -e "${YELLOW}[1/2] Running Backend Tests...${NC}"
echo "======================================="
if bash "$SCRIPT_DIR/run_backend_tests.sh"; then
    BACKEND_PASSED=true
    echo -e "${GREEN}Backend tests: PASSED${NC}"
else
    echo -e "${RED}Backend tests: FAILED${NC}"
fi
echo ""

# Run Frontend Tests
echo -e "${YELLOW}[2/2] Running Frontend Tests...${NC}"
echo "======================================="
if bash "$SCRIPT_DIR/run_frontend_tests.sh"; then
    FRONTEND_PASSED=true
    echo -e "${GREEN}Frontend tests: PASSED${NC}"
else
    echo -e "${RED}Frontend tests: FAILED${NC}"
fi
echo ""

# Summary
echo "======================================="
echo "Test Summary"
echo "======================================="
if [ "$BACKEND_PASSED" = true ]; then
    echo -e "Backend:  ${GREEN}PASSED${NC}"
else
    echo -e "Backend:  ${RED}FAILED${NC}"
fi

if [ "$FRONTEND_PASSED" = true ]; then
    echo -e "Frontend: ${GREEN}PASSED${NC}"
else
    echo -e "Frontend: ${RED}FAILED${NC}"
fi
echo "======================================="

# Exit with appropriate code
if [ "$BACKEND_PASSED" = true ] && [ "$FRONTEND_PASSED" = true ]; then
    echo ""
    echo -e "${GREEN}All tests passed successfully!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi
