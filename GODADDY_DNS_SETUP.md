# GoDaddy DNS Configuration for lube.fun

## Server IP Address
**Your Server IP**: `20.221.76.211`

## DNS Records to Configure in GoDaddy

### Step-by-Step Instructions:

1. **Log in to GoDaddy**
   - Go to https://www.godaddy.com/
   - Sign in to your account
   - Navigate to "My Products" or "Domains"

2. **Access DNS Management**
   - Find your domain `lube.fun` in the list
   - Click on "DNS" or "Manage DNS"
   - This will open the DNS Management page

3. **Add/Update A Records**

   You need to create/update these **A Records**:

   | Type | Name | Value | TTL |
   |------|------|-------|-----|
   | A | @ | 20.221.76.211 | 600 (or Default) |
   | A | www | 20.221.76.211 | 600 (or Default) |

   **Detailed Steps:**
   
   **For `lube.fun` (root domain):**
   - Click "Add" or find existing A record for "@"
   - **Type**: A
   - **Name**: @ (or leave blank, or enter "lube.fun")
   - **Value**: `20.221.76.211`
   - **TTL**: 600 seconds (or use default)
   - Click "Save"

   **For `www.lube.fun`:**
   - Click "Add" to create a new record
   - **Type**: A
   - **Name**: www
   - **Value**: `20.221.76.211`
   - **TTL**: 600 seconds (or use default)
   - Click "Save"

4. **Remove Conflicting Records (if any)**
   - If there are any CNAME records for "@" or "www", remove them (A records and CNAME records conflict)
   - Keep only the A records mentioned above

5. **Save Changes**
   - Make sure to save all changes
   - DNS propagation can take 5 minutes to 48 hours, but usually happens within 1-2 hours

## Verification

After making the changes, you can verify DNS propagation:

```bash
# Check if DNS is resolving correctly
nslookup lube.fun
nslookup www.lube.fun

# Or use dig
dig lube.fun
dig www.lube.fun
```

Both should return: `20.221.76.211`

## Important Notes

1. **DNS Propagation**: Changes may take time to propagate globally (usually 1-2 hours, up to 48 hours)

2. **SSL/HTTPS**: Since you're using `https://lube.fun`, you'll need SSL certificates. Options:
   - **Let's Encrypt (Free)**: Use Certbot to get free SSL certificates
   - **GoDaddy SSL**: Purchase SSL certificate from GoDaddy

3. **Current Setup**: Your Nginx is configured to accept both:
   - `lube.fun`
   - `www.lube.fun`

4. **If Using HTTPS**: Make sure to:
   - Install SSL certificate on your server
   - Configure Nginx to listen on port 443
   - Set up automatic redirect from HTTP to HTTPS

## Quick Reference

**What to add in GoDaddy DNS:**
- A record: `@` → `20.221.76.211`
- A record: `www` → `20.221.76.211`

**What NOT to do:**
- Don't use CNAME for root domain (@)
- Don't point to a different IP
- Don't forget to save changes

## Troubleshooting

If the domain doesn't resolve after 2 hours:
1. Double-check the IP address is correct: `20.221.76.211`
2. Verify the A records are saved in GoDaddy
3. Clear your local DNS cache: `ipconfig /flushdns` (Windows) or `sudo systemd-resolve --flush-caches` (Linux)
4. Check DNS propagation: https://www.whatsmydns.net/#A/lube.fun
