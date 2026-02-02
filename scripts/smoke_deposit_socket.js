/**
 * Socket.IO deposit smoke test.
 *
 * Why:
 * - Deposits are executed over Socket.IO (`request` event) and return an `offers/crypto_payment` message.
 * - This script logs in with a browser-like User-Agent, connects with the same UA (device hash must match),
 *   triggers a crypto deposit, and asserts we receive a payment address.
 */

const { io } = require('socket.io-client');
const http = require('http');
const querystring = require('querystring');

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const CURRENCY = process.env.SMOKE_CURRENCY || 'sol';
const VALUE = process.env.SMOKE_VALUE || '1';

const EMAIL = process.env.SMOKE_EMAIL || `smoke_${Date.now()}@test.local`;
const PASSWORD = process.env.SMOKE_PASSWORD || 'Test123!@#';
const NAME = process.env.SMOKE_NAME || 'SmokeUser';

const USER_AGENT = process.env.SMOKE_UA || 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

function postForm(path, form) {
  return new Promise((resolve, reject) => {
    const data = querystring.stringify(form);
    const url = new URL(BASE_URL + path);

    const req = http.request(
      {
        method: 'POST',
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        headers: {
          'User-Agent': USER_AGENT,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          resolve({ status: res.statusCode, headers: res.headers, body });
        });
      }
    );

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('[smoke] registering', EMAIL);
  await postForm('/auth/register', {
    name: NAME,
    email: EMAIL,
    password: PASSWORD,
    confirm_password: PASSWORD,
  });

  console.log('[smoke] logging in');
  const loginRes = await postForm('/auth/login', { email: EMAIL, password: PASSWORD });

  // The app’s auth cookie is `session=...` set by the JSON response flow; express-session sets `connect.sid`.
  // For Socket.IO auth, the important cookie is `session`.
  const setCookie = loginRes.headers['set-cookie'] || [];
  const cookieHeader = Array.isArray(setCookie)
    ? setCookie.map((c) => c.split(';')[0]).join('; ')
    : String(setCookie).split(';')[0];

  if (!cookieHeader.includes('session=')) {
    console.error('[smoke] login did not set `session` cookie. Response status:', loginRes.status);
    console.error(loginRes.body);
    process.exit(1);
  }

  console.log('[smoke] connecting socket with cookies');

  const socket = io(BASE_URL, {
    transports: ['polling', 'websocket'],
    extraHeaders: {
      Cookie: cookieHeader,
      'User-Agent': USER_AGENT,
      Referer: `${BASE_URL}/deposit/crypto/${CURRENCY}`,
    },
  });

  const timeout = setTimeout(() => {
    console.error('[smoke] timed out waiting for crypto_payment');
    socket.close();
    process.exit(1);
  }, 20000);

  socket.on('connect', () => {
    console.log('[smoke] socket connected:', socket.id);

    // Give the server a moment to emit site connected.
    setTimeout(() => {
      console.log('[smoke] sending deposit request', { currency: CURRENCY, value: VALUE });
      socket.emit('request', {
        type: 'crypto',
        command: 'deposit',
        currency: CURRENCY,
        value: VALUE,
      });
    }, 500);
  });

  socket.on('message', (msg) => {
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'message' && msg.method === 'error') {
      console.error('[smoke] server error:', msg.data);
    }

    if (msg.type === 'offers' && msg.method === 'crypto_payment') {
      const address = msg.data && msg.data.payment && msg.data.payment.address;
      console.log('[smoke] received crypto_payment address:', address);

      if (!address) {
        console.error('[smoke] crypto_payment missing address:', msg);
        clearTimeout(timeout);
        socket.close();
        process.exit(1);
      }

      clearTimeout(timeout);
      socket.close();
      console.log('[smoke] ✅ deposit socket flow OK');
      process.exit(0);
    }
  });

  socket.on('connect_error', (err) => {
    console.error('[smoke] connect_error', err && err.message ? err.message : err);
  });
}

main().catch((err) => {
  console.error('[smoke] fatal', err);
  process.exit(1);
});
