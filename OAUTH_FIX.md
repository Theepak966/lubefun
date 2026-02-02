# OAuth Redirect URI Configuration Fix

## Current Configuration ✅
Your application is correctly configured with these redirect URIs:
- **Google**: `https://lube.fun/auth/google/callback`
- **Discord**: `https://lube.fun/auth/discord/callback`

## The Problem
The OAuth providers (Google and Discord) require you to register these redirect URIs in their developer dashboards. The errors you're seeing indicate these URIs are not yet registered.

## How to Fix

### 🔵 Google OAuth Fix

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one if needed)
3. Navigate to: **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID (Client ID: `144384422702-a7kscjs2nu9driei8vilc93njir1967k.apps.googleusercontent.com`)
5. Click on it to edit
6. Under **"Authorized redirect URIs"**, click **"ADD URI"**
7. Add exactly: `https://lube.fun/auth/google/callback`
8. Click **"SAVE"**

**Important Notes:**
- The URI must match EXACTLY (including http://, no trailing slash)
- It may take a few minutes for changes to propagate
- Make sure your OAuth consent screen is configured

### 🟣 Discord OAuth Fix

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application (Client ID: `1466648965884940319`)
3. Click **"OAuth2"** in the left sidebar
4. Scroll down to **"Redirects"** section
5. Click **"Add Redirect"**
6. Add exactly: `https://lube.fun/auth/discord/callback`
7. Click **"Save Changes"**

**Important Notes:**
- The URI must match EXACTLY (including http://, no trailing slash)
- You can add multiple redirect URIs if needed
- Changes are usually immediate

## Verification

After adding the redirect URIs:
1. Wait 1-2 minutes for changes to propagate
2. Try logging in with Google/Discord again
3. The OAuth flow should now work correctly

## Troubleshooting

If it still doesn't work:
- Double-check the URI matches exactly (no typos, correct protocol http://)
- Make sure there are no extra spaces
- Verify your OAuth app credentials in `.env` match the dashboards
- Check that the OAuth apps are not in "testing" mode with restricted users (Google)

## Current Status
✅ Application code: Correctly configured
✅ Redirect URIs: Correctly set in code
⏳ OAuth Dashboards: Need to register redirect URIs (manual step)
