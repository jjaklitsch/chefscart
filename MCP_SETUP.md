# MCP Servers Setup Guide

This guide explains how to set up and configure the MCP (Model Context Protocol) servers for the ChefsCart project.

## Current Configuration

The `.mcp.json` file is configured with two MCP servers:

```json
{
  "mcpServers": {
    "playwright": {
      "url": "http://[::1]:3002/mcp"
    },
    "browsermcp": {
      "command": "npx",
      "args": ["@browsermcp/mcp@latest"]
    }
  }
}
```

## Setup Instructions

### 1. Playwright MCP Server

**Configuration**: URL-based server running on port 3002

**Setup:**
1. The Playwright server needs to be started manually before using:
   ```bash
   npx @playwright/mcp@latest --headless --host localhost --port 3002
   ```

2. Or use the provided startup script:
   ```bash
   ./start-mcp-servers.sh
   ```

3. Verify it's running by checking: `http://[::1]:3002/mcp`

**Features:**
- Browser automation capabilities
- Screenshot taking
- Web page interaction
- Fast and lightweight
- Works headlessly

### 2. Browser MCP Server

**Configuration**: Command-based server with Chrome extension dependency

**Setup:**
1. Install the Browser MCP Chrome extension:
   - Go to https://browsermcp.io/
   - Click "Add to Chrome"
   - Pin the extension to your Chrome toolbar

2. Connect the extension:
   - Click the Browser MCP extension icon in Chrome
   - Press "Connect" to link your browser session

3. The server will start automatically when the extension is connected

**Features:**
- Direct browser control
- Preserves login sessions
- Avoids basic bot detection
- Local automation
- Real browser interaction

## Usage Notes

- **Port Conflicts**: Playwright uses port 3002 to avoid conflict with ChefsCart dev server (port 3001)
- **Development Workflow**: Start the Playwright server alongside your development environment
- **Chrome Dependency**: BrowserMCP requires Chrome and the browser extension to function
- **IPv6 vs IPv4**: The configuration uses `[::1]:3002` (IPv6 localhost) as returned by the server

## Troubleshooting

### "Failed to reconnect" errors
- Ensure Playwright server is running on port 3002
- Check that Chrome extension is installed and connected for BrowserMCP
- Verify no other services are using the same ports

### Playwright Server Issues
- Make sure port 3002 is available
- Try restarting the server if connection fails
- Check firewall settings if remote connections are needed

### Browser MCP Issues
- Ensure Chrome extension is properly installed
- Click "Connect" in the extension popup
- Make sure Chrome is running and the extension is active

## Starting Everything

To start the full development environment:

1. Start ChefsCart dev server:
   ```bash
   npm run dev  # Runs on port 3001
   ```

2. Start MCP servers:
   ```bash
   ./start-mcp-servers.sh  # Starts Playwright on port 3002
   ```

3. Setup Browser MCP extension in Chrome (one-time setup)

Now both MCP servers should be available in Claude Code!