#!/bin/bash
# Start the stack with HTTPS on ports 80 and 443

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
NGINX_CONF="$PROJECT_DIR/nginx/nginx.conf"
ENV_FILE="${ENV_FILE:-$PROJECT_DIR/.env}"

echo "[start-https] Starting HTTPS stack..."
echo ""

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | xargs)
else
    echo "⚠️  Warning: .env file not found at $ENV_FILE"
fi

# Stop existing services
echo "[start-https] Stopping existing services..."
"$SCRIPT_DIR/stop_nginx_stack.sh" 2>/dev/null || true
sleep 1

# Test nginx config
echo "[start-https] Testing nginx configuration..."
nginx -t -c "$NGINX_CONF" || {
    echo "❌ Nginx config test failed"
    exit 1
}

# Start Node app
echo "[start-https] Starting Node app..."
cd "$PROJECT_DIR"
node app.js > /tmp/lubee-node.log 2>&1 &
echo $! > /tmp/lubee-node.pid
sleep 1

# Start nginx with sudo (for ports 80/443)
echo "[start-https] Starting nginx on ports 80 and 443 (requires sudo)..."
sudo nginx -c "$NGINX_CONF"

sleep 2

# Verify services
if ps -p $(cat /tmp/lubee-node.pid) > /dev/null 2>&1; then
    echo "✅ Node app running (PID: $(cat /tmp/lubee-node.pid))"
else
    echo "❌ Node app failed to start"
    exit 1
fi

if pgrep -f "nginx.*$NGINX_CONF" > /dev/null; then
    echo "✅ Nginx running"
else
    echo "❌ Nginx failed to start"
    exit 1
fi

echo ""
echo "✅ HTTPS stack started successfully!"
echo ""
echo "Access URLs:"
echo "  ✅ https://lube.fun"
echo "  ✅ https://www.lube.fun"
echo "  ✅ http://lube.fun (redirects to HTTPS)"
echo ""
echo "Note: Browser will show 'Not Secure' warning with self-signed certificate"
echo "Click 'Advanced' → 'Proceed to lube.fun' to continue"
echo ""
echo "To stop: $SCRIPT_DIR/stop_nginx_stack.sh"
