# Development Server Management

This document explains how to manage the Next.js development server with monitoring and auto-restart capabilities.

## Quick Start

```bash
# Start server normally
npm run dev

# Start server with monitoring (auto-restart on crashes)
npm run dev:monitor

# Check server status
npm run dev:status

# Restart server
npm run dev:restart
```

## Issues Fixed

### 1. React Hook Ordering Issue
**Problem**: `ConversationalChat.tsx` had a "Cannot access 'startConversation' before initialization" error causing server crashes.

**Fix**: Moved the `startConversation` function definition before its usage in useEffect dependencies.

**Location**: `/Users/jonathanjaklitsch/chefscart/chefscart/apps/web/components/ConversationalChat/ConversationalChat.tsx`

## Monitoring Features

The `monitor-dev-server.sh` script provides:

- **Auto-restart**: Restarts server if it crashes or becomes unresponsive
- **Health checks**: Periodically checks if server responds to HTTP requests
- **Process management**: Tracks server PID and handles clean shutdowns
- **Logging**: Maintains monitor.log for debugging server issues

## Server Management Commands

### Via NPM Scripts
```bash
npm run dev:monitor    # Start with monitoring
npm run dev:status     # Check if server is running
npm run dev:restart    # Force restart server
```

### Direct Script Usage
```bash
./monitor-dev-server.sh start     # Start server
./monitor-dev-server.sh stop      # Stop server
./monitor-dev-server.sh restart   # Restart server
./monitor-dev-server.sh monitor   # Monitor and auto-restart
./monitor-dev-server.sh status    # Check status
```

## Log Files

- `dev.log` - Next.js development server output
- `monitor.log` - Server monitoring activity
- `dev-server.pid` - Current server process ID

## Troubleshooting

### Server Won't Start
1. Check if port 3000 is already in use: `lsof -i :3000`
2. Kill existing processes: `pkill -f "next dev"`
3. Remove stale PID file: `rm -f dev-server.pid`
4. Try starting again: `npm run dev:restart`

### Server Keeps Crashing
1. Check `dev.log` for error messages
2. Check `monitor.log` for restart patterns
3. Look for TypeScript errors: `npm run build`
4. Check for missing environment variables

### Server Not Responsive
The monitor checks server health by making HTTP requests to localhost:3000. If the server process exists but doesn't respond, it will be restarted automatically.

## Environment Requirements

- Node.js 20+
- Next.js 14.2.30+
- Environment variables configured in `/Users/jonathanjaklitsch/chefscart/chefscart/.env.local`

## Performance Notes

- Server typically uses 150-200MB RAM during development
- TypeScript compilation increases memory usage temporarily
- Monitor checks every 30 seconds (configurable in script)
- Health checks use minimal resources via curl