#!/bin/bash
# Stop nginx and node app

echo "[stop] Stopping services..."

# Stop nginx (check if running with sudo)
if pgrep -f "nginx.*nginx.conf" > /dev/null; then
    echo "[stop] Stopping nginx..."
    sudo nginx -s stop -c /Users/theepak/Desktop/lubefinal/lubee.rar/coca8424_77ac39e3/nginx/nginx.conf 2>/dev/null || true
    # Also try killing if stop doesn't work
    sudo pkill -f "nginx.*nginx.conf" 2>/dev/null || true
fi

# Stop node app
if [ -f /tmp/lubee-node.pid ]; then
    PID=$(cat /tmp/lubee-node.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo "[stop] Stopping node (pid=$PID)"
        kill $PID 2>/dev/null || true
        sleep 1
        kill -9 $PID 2>/dev/null || true
    fi
    rm -f /tmp/lubee-node.pid
fi

# Clean up any remaining processes
lsof -ti tcp:3000 | xargs -r kill -9 2>/dev/null || true
lsof -ti tcp:8080 | xargs -r kill -9 2>/dev/null || true

echo "[stop] Services stopped"
