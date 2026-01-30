#!/bin/bash
# Fix local domain access by adding www.lube.fun to /etc/hosts

echo "🔧 Fixing local domain access for www.lube.fun"
echo ""
echo "This will add '127.0.0.1 www.lube.fun lube.fun' to /etc/hosts"
echo "You'll need to enter your password."
echo ""

# Check if already exists
if grep -q "lube.fun" /etc/hosts 2>/dev/null; then
    echo "⚠️  Domain already in /etc/hosts:"
    grep "lube.fun" /etc/hosts
    echo ""
    read -p "Update anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
    # Remove old entries
    sudo sed -i '' '/lube\.fun/d' /etc/hosts
fi

# Add new entry
echo "127.0.0.1 www.lube.fun lube.fun" | sudo tee -a /etc/hosts > /dev/null

if [ $? -eq 0 ]; then
    echo "✅ Success! www.lube.fun now points to localhost"
    echo ""
    echo "Test it: http://www.lube.fun:8080"
    echo ""
    echo "To remove this later, edit /etc/hosts and delete the line:"
    echo "  127.0.0.1 www.lube.fun lube.fun"
else
    echo "❌ Failed to update /etc/hosts"
    exit 1
fi
