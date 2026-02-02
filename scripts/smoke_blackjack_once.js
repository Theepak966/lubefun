/**
 * Smoke test: register a temporary user, credit a small balance, then play one blackjack hand via Socket.IO polling.
 *
 * Why:
 * - Verifies the full "real" path (HTTP auth cookie -> socket join -> game commands -> server emits).
 * - Avoids any browser automation dependencies.
 *
 * Usage:
 *   node scripts/smoke_blackjack_once.js
 */

require('dotenv').config();

const crypto = require('crypto');
const mysql = require('mysql2');

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';
const UA = process.env.SMOKE_UA || 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

function getRandomEmail(){
  const rand = crypto.randomBytes(6).toString('hex');
  return `smoketest_${rand}@example.com`;
}

function parseSetCookieForSession(setCookies){
  for(const c of setCookies){
    const part = c.split(';')[0].trim();
    if(part.startsWith('session=')) return part.split('=')[1];
  }
  return null;
}

function parseEngineIoPackets(payload){
  if(!payload) return [];
  return String(payload).split('\x1e').filter(Boolean);
}

function extractSid(openPacket){
  if(!openPacket || openPacket[0] !== '0') throw new Error('Unexpected open packet: ' + openPacket);
  const json = JSON.parse(openPacket.slice(1));
  return json.sid;
}

async function httpJson(path, body, cookieValue){
  const headers = {
    'User-Agent': UA,
    'Content-Type': 'application/json'
  };
  if(cookieValue) headers['Cookie'] = `session=${cookieValue}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }
  return { res, text, json };
}

function createDbPool(){
  return mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    connectionLimit: 4
  });
}

async function dbQuery(pool, sql, params){
  return await new Promise((resolve, reject) => {
    pool.query(sql, params, (err, rows) => {
      if(err) return reject(err);
      resolve(rows);
    });
  });
}

async function engineIoGet(sid, cookieValue){
  const url = sid
    ? `${BASE_URL}/socket.io/?EIO=4&transport=polling&sid=${encodeURIComponent(sid)}&t=${Date.now()}`
    : `${BASE_URL}/socket.io/?EIO=4&transport=polling&t=${Date.now()}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': UA,
      'Cookie': `session=${cookieValue}`
    }
  });
  const text = await res.text();
  return { status: res.status, text };
}

async function engineIoPost(sid, cookieValue, packet){
  const url = `${BASE_URL}/socket.io/?EIO=4&transport=polling&sid=${encodeURIComponent(sid)}&t=${Date.now()}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Cookie': `session=${cookieValue}`,
      'Content-Type': 'text/plain;charset=UTF-8'
    },
    body: packet
  });
  const text = await res.text();
  return { status: res.status, text };
}

async function main(){
  console.log(`[smoke] Base URL: ${BASE_URL}`);

  const email = getRandomEmail();
  const password = 'SmokeTest123!@#';
  const name = 'SmokeTest';

  console.log(`[smoke] Registering user ${email} ...`);
  const registerRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name,
      email,
      password,
      confirm_password: password
    })
  });

  // Node fetch exposes getSetCookie() in modern versions
  const setCookies = typeof registerRes.headers.getSetCookie === 'function'
    ? registerRes.headers.getSetCookie()
    : (registerRes.headers.get('set-cookie') ? [registerRes.headers.get('set-cookie')] : []);

  const registerBody = await registerRes.text();
  if(registerRes.status !== 200){
    throw new Error(`[smoke] Register failed: ${registerRes.status} ${registerBody}`);
  }

  const sessionCookie = parseSetCookieForSession(setCookies);
  if(!sessionCookie){
    throw new Error('[smoke] Could not find session cookie in Set-Cookie headers');
  }
  console.log('[smoke] Got session cookie');

  // Credit balance so the bet can be placed.
  const pool = createDbPool();
  try {
    const rows = await dbQuery(pool, 'SELECT userid FROM users WHERE email = ? LIMIT 1', [email]);
    if(!rows || rows.length === 0) throw new Error('[smoke] User not found in DB after register');
    const userid = rows[0].userid;

    await dbQuery(pool, 'UPDATE users SET balance = 10.00 WHERE userid = ?', [userid]);
    console.log(`[smoke] Credited balance for userid=${userid}`);
  } finally {
    pool.end();
  }

  // Engine.IO open
  console.log('[smoke] Opening Socket.IO polling transport...');
  const open = await engineIoGet(null, sessionCookie);
  if(open.status !== 200) throw new Error(`[smoke] Engine.IO open failed: ${open.status} ${open.text}`);
  const packets = parseEngineIoPackets(open.text);
  const sid = extractSid(packets[0]);
  console.log(`[smoke] Engine.IO sid=${sid}`);

  // Socket.IO connect
  await engineIoPost(sid, sessionCookie, '40');

  // Join event (must match browser behavior)
  const joinData = {
    session: sessionCookie,
    paths: ['blackjack'],
    history: 'all_bets',
    channel: 'en'
  };
  await engineIoPost(sid, sessionCookie, '42' + JSON.stringify(['join', joinData]));

  // Place bet (deal)
  console.log('[smoke] Placing blackjack bet...');
  await engineIoPost(sid, sessionCookie, '42' + JSON.stringify(['request', { type: 'blackjack', command: 'bet', amount: '0.50' }]));

  let gotBetConfirmed = false;
  let gotResult = false;

  const startedAt = Date.now();
  while(Date.now() - startedAt < 15000){
    const poll = await engineIoGet(sid, sessionCookie);
    if(poll.status !== 200) throw new Error(`[smoke] Poll failed: ${poll.status} ${poll.text}`);

    const pollPackets = parseEngineIoPackets(poll.text);
    for(const p of pollPackets){
      if(p === '2'){
        await engineIoPost(sid, sessionCookie, '3');
        continue;
      }

      if(!p.startsWith('42')) continue;
      const event = JSON.parse(p.slice(2));
      if(!Array.isArray(event) || event.length < 2) continue;

      const [eventName, payload] = event;
      if(eventName !== 'message') continue;

      if(payload && payload.type === 'blackjack' && payload.method === 'bet_confirmed'){
        gotBetConfirmed = true;
        console.log('[smoke] Received bet_confirmed');

        // Immediately stand to complete one hand.
        console.log('[smoke] Standing...');
        await engineIoPost(sid, sessionCookie, '42' + JSON.stringify(['request', { type: 'blackjack', command: 'stand' }]));
      }

      if(payload && payload.type === 'blackjack' && payload.method === 'result'){
        gotResult = true;
        console.log('[smoke] Received result:', payload.data && payload.data.result);
      }
    }

    if(gotResult) break;
    await sleep(250);
  }

  // If blackjack resolved instantly, we may never see bet_confirmed.
  if(!gotBetConfirmed){
    console.log('[smoke] Note: bet_confirmed was not observed (could be instant resolution).');
  }

  if(!gotResult){
    throw new Error('[smoke] Did not receive blackjack result within timeout');
  }

  console.log('[smoke] ✅ Blackjack one-hand smoke test passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

