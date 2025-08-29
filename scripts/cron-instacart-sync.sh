#!/bin/bash

# Instacart API Cache Sync - Monthly Cron Job
# 
# This script runs the Instacart cache population job on a monthly schedule.
# It's designed to be run via cron on the 1st of each month at 2 AM.
# 
# Add to crontab with:
# 0 2 1 * * /path/to/chefscart/scripts/cron-instacart-sync.sh
#
# Or for Vercel deployment, use Vercel Cron with this script as a webhook trigger

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$SCRIPT_DIR/logs/instacart-sync-$(date +%Y%m%d).log"
NODE_SCRIPT="$SCRIPT_DIR/populate-instacart-cache.js"
WAITLIST_SCRIPT="$SCRIPT_DIR/cron-waitlist-notification.js"

# Ensure log directory exists
mkdir -p "$SCRIPT_DIR/logs"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to send notification (customize for your needs)
notify() {
    local status="$1"
    local message="$2"
    
    # Example: Send to Slack, email, or logging service
    # curl -X POST -H 'Content-type: application/json' \
    #   --data '{"text":"Instacart Sync: '$status' - '$message'"}' \
    #   "$SLACK_WEBHOOK_URL"
    
    log "NOTIFICATION: $status - $message"
}

# Start sync job
log "Starting Instacart API cache sync job..."
log "Script directory: $SCRIPT_DIR"
log "Project directory: $PROJECT_DIR"
log "Node script: $NODE_SCRIPT"

cd "$PROJECT_DIR" || {
    log "ERROR: Could not change to project directory: $PROJECT_DIR"
    notify "FAILED" "Could not access project directory"
    exit 1
}

# Check if Node.js script exists
if [ ! -f "$NODE_SCRIPT" ]; then
    log "ERROR: Node.js script not found: $NODE_SCRIPT"
    notify "FAILED" "Sync script not found"
    exit 1
fi

# Check environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ] || [ -z "$INSTACART_API_KEY" ]; then
    log "ERROR: Required environment variables not set"
    log "Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, INSTACART_API_KEY"
    notify "FAILED" "Environment variables not configured"
    exit 1
fi

# Run the sync job (full refresh, not test mode)
log "Executing Node.js sync script..."
START_TIME=$(date +%s)

# Run with timeout (4 hours max) and capture exit code
timeout 14400 node "$NODE_SCRIPT" >> "$LOG_FILE" 2>&1
EXIT_CODE=$?

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Check result
case $EXIT_CODE in
    0)
        log "SUCCESS: Sync job completed successfully in ${DURATION}s"
        notify "SUCCESS" "Instacart cache sync completed in ${DURATION}s"
        
        # After successful sync, run waitlist notifications
        log "Starting waitlist notification job..."
        WAITLIST_START_TIME=$(date +%s)
        
        node "$WAITLIST_SCRIPT" >> "$LOG_FILE" 2>&1
        WAITLIST_EXIT_CODE=$?
        
        WAITLIST_END_TIME=$(date +%s)
        WAITLIST_DURATION=$((WAITLIST_END_TIME - WAITLIST_START_TIME))
        
        if [ $WAITLIST_EXIT_CODE -eq 0 ]; then
            log "SUCCESS: Waitlist notification job completed successfully in ${WAITLIST_DURATION}s"
            notify "SUCCESS" "Waitlist notifications sent in ${WAITLIST_DURATION}s"
        else
            log "WARNING: Waitlist notification job failed with exit code $WAITLIST_EXIT_CODE"
            notify "WARNING" "Waitlist notifications failed but sync completed"
        fi
        ;;
    124)
        log "ERROR: Sync job timed out after 4 hours"
        notify "FAILED" "Sync job timed out"
        exit 1
        ;;
    *)
        log "ERROR: Sync job failed with exit code $EXIT_CODE"
        notify "FAILED" "Sync job failed with exit code $EXIT_CODE"
        exit 1
        ;;
esac

# Clean up old log files (keep last 6 months)
log "Cleaning up old log files..."
find "$SCRIPT_DIR/logs" -name "instacart-sync-*.log" -type f -mtime +180 -delete 2>/dev/null || true

log "Monthly sync job completed successfully"
exit 0