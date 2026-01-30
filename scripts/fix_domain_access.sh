#!/bin/bash
# Complete fix for lube.fun domain access

echo "🔧 Fixing lube.fun domain access..."
echo ""

# Step 1: Fix /etc/hosts
echo "Step 1: Updating /etc/hosts..."
sudo sh -c 'grep -v "lube.fun" /etc/hosts > /tmp/hosts.new && echo "127.0.0.1 www.lube.fun lube.fun" >> /tmp/hosts.new && cp /tmp/hosts.new /etc/hosts'

if [ $? -eq 0 ]; then
    echo "✅ /etc/hosts updated"
else
    echo "❌ Failed to update /etc/hosts"
    exit 1
fi

# Step 2: Flush DNS cache
echo ""
echo "Step 2: Flushing DNS cache..."
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
echo "✅ DNS cache flushed"

# Step 3: Verify
echo ""
echo "Step 3: Verifying..."
if grep -q "lube.fun" /etc/hosts; then
    echo "✅ /etc/hosts contains:"
    grep "lube.fun" /etc/hosts
else
    echo "❌ /etc/hosts not updated correctly"
    exit 1
fi

echo ""
echo "✅ Fix complete!"
echo ""
echo "IMPORTANT: You MUST use port 8080 in the URL:"
echo "  ✅ http://lube.fun:8080"
echo "  ✅ http://www.lube.fun:8080"
echo ""
echo "NOT: http://lube.fun (missing :8080)"
echo ""
echo "Next steps:"
echo "  1. Close ALL browser windows completely"
echo "  2. Reopen browser"
echo "  3. Try: http://lube.fun:8080"
