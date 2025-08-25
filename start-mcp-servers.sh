#!/bin/bash

echo "Starting MCP servers for ChefsCart development..."

# Start Playwright MCP server on port 3002
echo "Starting Playwright MCP server on port 3002..."
npx @playwright/mcp@latest --headless --host localhost --port 3002 &
PLAYWRIGHT_PID=$!

echo "Playwright MCP server started with PID: $PLAYWRIGHT_PID"
echo "Playwright MCP URL: http://localhost:3002/mcp"

# Note: BrowserMCP requires Chrome extension installation
echo ""
echo "Note for BrowserMCP:"
echo "1. Install the Browser MCP Chrome extension from https://browsermcp.io/"
echo "2. Pin the extension to your Chrome toolbar"
echo "3. Click the extension icon and press 'Connect'"
echo "4. The browsermcp server will start automatically when needed"

echo ""
echo "MCP Servers Status:"
echo "✅ Playwright: Running on http://localhost:3002/mcp"
echo "ℹ️  BrowserMCP: Requires Chrome extension setup"

# Keep the script running
wait $PLAYWRIGHT_PID