### Run behind Nginx reverse proxy (HTTP + WebSocket)

This repo is a single Node/Express app that also runs Socket.IO. Nginx should sit in front of it to:
- Serve as the public entrypoint
- Forward client IP/proto headers
- Support Socket.IO **WebSocket upgrades**

### What was added/changed

- **Nginx config**: `nginx/nginx.conf` (listens on `:8080` by default)
- **Health endpoint**: `GET /healthz` (works even if DB is down)
- **Socket.IO**: enabled `websocket` transport (keeps polling fallback)
- **DB driver**: switched from `mysql` to `mysql2` to support modern MySQL auth plugins

### Minimal environment variables

The app **requires** at least:
- `APP_ENV=production`
- `APP_PORT` (internal Node listen port)
- `SESSION_SECRET`
- `DB_DATABASE`, `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD` (and optionally `DB_PORT`)

### Recommended reverse-proxy setup (TLS terminated at Nginx)

Use these settings:
- `APP_LISTEN_SECURE=false` (Node listens HTTP)
- `APP_PUBLIC_SECURE=true` (your public site is HTTPS)
- `APP_PUBLIC_URL=https://your-domain.com`

This keeps cookies correct (`express-session` uses `secure: 'auto'`) and makes `req.secure` accurate thanks to:
- `app.set('trust proxy', 1)`
- `X-Forwarded-Proto` from nginx

### Start (local/dev example)

1) Create a `.env` (example keys only):

```bash
APP_ENV=production
APP_PORT=3000
SESSION_SECRET=change-me

APP_PUBLIC_URL=http://localhost:8080
APP_PUBLIC_SECURE=false
APP_LISTEN_SECURE=false

DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=vgowitch
DB_USERNAME=vgowitch
DB_PASSWORD=change-me
```

2) Start Node:

```bash
export $(grep -v '^#' .env | xargs) && node app.js
```

3) Start nginx (repo-local config):

```bash
nginx -c "$(pwd)/nginx/nginx.conf"
```

4) Verify:

```bash
curl -fsS http://127.0.0.1:8080/healthz
node scripts/smoke_socketio_websocket.js ws://127.0.0.1:8080
```

### Database initialization

If you have a MySQL user with permissions to create tables in `DB_DATABASE`, you can run:

```bash
export $(grep -v '^#' .env | xargs) && node scripts/database.js
```

This reads `sql/*.sql` and will create missing tables.

