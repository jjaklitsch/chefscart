#!/bin/bash

# Development Server Starter with Cleanup
# This script ensures clean startup of the Next.js development server

echo "Starting ChefsCart development server..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to cleanup previous processes
cleanup_processes() {
    echo -e "${YELLOW}Cleaning up previous processes...${NC}"
    
    # Kill any existing Next.js processes
    pkill -f "next dev" 2>/dev/null
    pkill -f "node.*next" 2>/dev/null
    
    # Clean up .next cache if specified
    if [ "$1" == "--clean" ]; then
        echo -e "${YELLOW}Cleaning .next cache...${NC}"
        rm -rf .next
    fi
    
    # Remove stale pid files
    rm -f dev-server.pid
    
    echo -e "${GREEN}Cleanup complete${NC}"
}

# Function to check port availability
check_port() {
    if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${RED}Port 3001 is already in use${NC}"
        echo "Attempting to free up the port..."
        lsof -ti:3001 | xargs kill -9 2>/dev/null
        sleep 2
    fi
}

# Function to start the server
start_server() {
    echo -e "${GREEN}Starting Next.js development server...${NC}"
    
    # Ensure we're in the correct directory
    cd "$(dirname "$0")"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing dependencies...${NC}"
        npm install
    fi
    
    # Export development environment
    export NODE_ENV=development
    
    # Start the server with improved settings
    exec npm run dev
}

# Main execution
cleanup_processes "$1"
check_port
start_server