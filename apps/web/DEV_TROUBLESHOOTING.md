# Development Troubleshooting Guide

## Common Issues and Solutions

### 1. React Rendering Error: "Objects are not valid as a React child"

**Issue**: Server crashes with React rendering errors when accessing certain pages.

**Cause**: Incorrect import statements for default exports being destructured.

**Solution**: 
- Fixed in `/src/app/chat/page.tsx` - Changed from `import { ConversationalChat }` to `import ConversationalChat`
- Always check import statements match the export type (default vs named)

### 2. Development Server Instability

**Issue**: Next.js dev server crashes intermittently or fails to hot reload properly.

**Solutions Applied**:
1. Updated `next.config.mjs` with:
   - `reactStrictMode: true` for better error detection
   - `swcMinify: true` for faster builds
   - Custom webpack config for better source maps and watch options
   - Disabled polling and ignored node_modules for performance

2. Created startup scripts:
   - `start-dev.sh` - Ensures clean server startup
   - Use `npm run dev:safe` for a clean start
   - Use `npm run dev:clean` to clear .next cache and start fresh

### 3. Port Already in Use

**Issue**: Port 3000 is already in use when starting the dev server.

**Solution**: The `start-dev.sh` script now:
- Automatically detects port conflicts
- Kills stale processes
- Ensures clean startup

### 4. Hot Reload Not Working

**Issue**: Changes not reflected in the browser automatically.

**Solutions**:
1. Ensure `reactStrictMode` is enabled in `next.config.mjs`
2. Check that file watching is not disabled
3. Try `npm run dev:clean` to clear cache
4. Verify no syntax errors in modified files

## Recommended Development Workflow

1. **First Time Setup**:
   ```bash
   npm install
   npm run dev:clean
   ```

2. **Daily Development**:
   ```bash
   npm run dev:safe  # Clean startup without cache clear
   # or
   npm run dev       # Standard startup
   ```

3. **If Issues Occur**:
   ```bash
   npm run dev:restart  # Restart the server
   # or
   npm run dev:clean    # Full cache clear and restart
   ```

4. **Monitor Server Health**:
   ```bash
   npm run dev:monitor  # Auto-restart on crashes
   npm run dev:status   # Check if server is running
   ```

## Environment Variables

Ensure `.env.local` exists in the project root with all required variables.
Server restart is required after modifying `.env.local`.

## TypeScript Strict Mode

The project enforces TypeScript strict mode. Common issues:
- Uninitialized variables
- Implicit any types
- Null/undefined checks

Always run `npm run build` before committing to catch TypeScript errors.

## Performance Tips

1. Keep browser DevTools closed when not debugging
2. Disable React DevTools browser extension in development
3. Use `npm run dev:clean` if build times become slow
4. Consider increasing Node.js memory: `NODE_OPTIONS='--max_old_space_size=4096' npm run dev`