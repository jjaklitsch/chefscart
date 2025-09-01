#!/bin/bash

# Product Cache Update Cron Job Setup
# This script sets up a daily cron job to update the Amazon product cache

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CRON_SCRIPT="$SCRIPT_DIR/update-product-cache-cron.sh"
LOG_FILE="$PROJECT_DIR/logs/product-cache-update.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Create the cron script
cat << 'EOF' > "$CRON_SCRIPT"
#!/bin/bash

# Product Cache Update Cron Script
# This script is called by cron to update the Amazon product cache

# Load environment variables
source "$(dirname "$(dirname "$0")")/apps/web/.env.local"

# Configuration
API_URL="${NEXT_PUBLIC_APP_URL:-https://chefscart.ai}/api/shop/update-product-cache"
LOG_FILE="$(dirname "$(dirname "$0")")/logs/product-cache-update.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] Starting product cache update..." >> "$LOG_FILE"

# Make the API request
RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  "$API_URL" 2>&1)

CURL_EXIT_CODE=$?

if [ $CURL_EXIT_CODE -eq 0 ]; then
  # Parse the response to check if it was successful
  if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "[$TIMESTAMP] Product cache update completed successfully" >> "$LOG_FILE"
    echo "[$TIMESTAMP] Response: $RESPONSE" >> "$LOG_FILE"
  else
    echo "[$TIMESTAMP] Product cache update failed - API returned error" >> "$LOG_FILE"
    echo "[$TIMESTAMP] Response: $RESPONSE" >> "$LOG_FILE"
  fi
else
  echo "[$TIMESTAMP] Product cache update failed - curl error (exit code: $CURL_EXIT_CODE)" >> "$LOG_FILE"
  echo "[$TIMESTAMP] Error output: $RESPONSE" >> "$LOG_FILE"
fi

echo "[$TIMESTAMP] Product cache update process finished" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
EOF

# Make the cron script executable
chmod +x "$CRON_SCRIPT"

# Add to crontab (runs daily at 2:00 AM)
CRON_ENTRY="0 2 * * * $CRON_SCRIPT"

# Check if cron entry already exists
if crontab -l 2>/dev/null | grep -F "$CRON_SCRIPT" >/dev/null; then
  echo "Cron job already exists for product cache updates"
else
  # Add the new cron job
  (crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -
  echo "Added daily cron job: $CRON_ENTRY"
fi

echo "Setup complete!"
echo "Cron script created at: $CRON_SCRIPT"
echo "Logs will be written to: $LOG_FILE"
echo ""
echo "To view current cron jobs: crontab -l"
echo "To view logs: tail -f $LOG_FILE"
echo "To test manually: $CRON_SCRIPT"
echo ""
echo "Note: Make sure your .env.local file contains CRON_SECRET and NEXT_PUBLIC_APP_URL"