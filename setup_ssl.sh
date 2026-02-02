#!/bin/bash
# Script to set up SSL certificates for www.lube.fun
# Run this after DNS is updated to point to this server

echo "Setting up SSL certificates for www.lube.fun and lube.fun..."

# Obtain SSL certificates using standalone mode
sudo certbot certonly --standalone \
  -d www.lube.fun \
  -d lube.fun \
  --non-interactive \
  --agree-tos \
  --email admin@lube.fun \
  --preferred-challenges http

if [ $? -eq 0 ]; then
  echo "✓ SSL certificates obtained successfully"
  echo "Now updating nginx configuration..."
  
  # The nginx config will need to be updated with SSL paths
  # This can be done manually or by running certbot --nginx
  sudo certbot --nginx -d www.lube.fun -d lube.fun --non-interactive --redirect
  
  if [ $? -eq 0 ]; then
    echo "✓ SSL setup complete! Your site should now be accessible at https://www.lube.fun"
  else
    echo "⚠ Certbot nginx plugin failed. You may need to manually update nginx config."
  fi
else
  echo "✗ Failed to obtain SSL certificates. Please ensure DNS is pointing to this server."
  exit 1
fi
