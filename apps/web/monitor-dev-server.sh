#!/bin/bash

# Development Server Monitor
# This script monitors the Next.js development server and restarts it if it crashes

LOG_FILE="dev.log"
PID_FILE="dev-server.pid"
SERVER_URL="http://localhost:3000"
CHECK_INTERVAL=30 # seconds

# Function to start the development server
start_server() {
    echo "$(date): Starting development server..." | tee -a monitor.log
    nohup npm run dev > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "$(date): Server started with PID $(cat $PID_FILE)" | tee -a monitor.log
}

# Function to check if server is running
is_server_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            # Process exists, check if server responds
            if curl -s "$SERVER_URL" > /dev/null 2>&1; then
                return 0 # Server is running and responsive
            else
                echo "$(date): Server process exists but not responsive" | tee -a monitor.log
                return 1 # Server not responsive
            fi
        else
            echo "$(date): Server process not found" | tee -a monitor.log
            return 1 # Process doesn't exist
        fi
    else
        echo "$(date): PID file not found" | tee -a monitor.log
        return 1 # No PID file
    fi
}

# Function to stop the server
stop_server() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            echo "$(date): Stopping server with PID $PID" | tee -a monitor.log
            kill $PID
            sleep 5
            # Force kill if still running
            if ps -p $PID > /dev/null 2>&1; then
                echo "$(date): Force killing server" | tee -a monitor.log
                kill -9 $PID
            fi
        fi
        rm -f "$PID_FILE"
    fi
}

# Function to restart the server
restart_server() {
    echo "$(date): Restarting development server..." | tee -a monitor.log
    stop_server
    sleep 2
    start_server
    sleep 10 # Give server time to start
}

# Main monitoring loop
monitor_server() {
    echo "$(date): Starting development server monitor" | tee -a monitor.log
    
    while true; do
        if ! is_server_running; then
            echo "$(date): Server is not running, restarting..." | tee -a monitor.log
            restart_server
        else
            echo "$(date): Server is running properly" | tee -a monitor.log
        fi
        
        sleep $CHECK_INTERVAL
    done
}

# Handle script termination
cleanup() {
    echo "$(date): Monitor script terminated, stopping server..." | tee -a monitor.log
    stop_server
    exit 0
}

trap cleanup SIGINT SIGTERM

# Command line handling
case "${1:-monitor}" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        restart_server
        ;;
    monitor)
        monitor_server
        ;;
    status)
        if is_server_running; then
            echo "Development server is running"
            exit 0
        else
            echo "Development server is not running"
            exit 1
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|monitor|status}"
        echo "  start   - Start the development server"
        echo "  stop    - Stop the development server"  
        echo "  restart - Restart the development server"
        echo "  monitor - Monitor and auto-restart server (default)"
        echo "  status  - Check server status"
        exit 1
        ;;
esac