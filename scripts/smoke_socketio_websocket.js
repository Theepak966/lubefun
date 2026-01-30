/**
 * Smoke test for Socket.IO WebSocket upgrade *through nginx*.
 *
 * Why this exists:
 * - Socket.IO will happily fall back to long-polling, so "the site loads" doesn't prove
 *   WebSocket upgrades are actually working.
 * - This script intentionally uses a raw `ws` client against Engine.IO's websocket endpoint
 *   to prove nginx upgrade headers + server transports are correct.
 *
 * Usage (example):
 *   node scripts/smoke_socketio_websocket.js ws://localhost:8080
 */

const WebSocket = require('ws');

function buildEngineIoWebSocketUrl(baseUrl) {
  const normalized = baseUrl.replace(/\/+$/, '');
  // Engine.IO v4 websocket endpoint (Socket.IO default path).
  return `${normalized}/socket.io/?EIO=4&transport=websocket`;
}

function run() {
  const baseUrl = process.argv[2] || 'ws://localhost:8080';
  const wsUrl = buildEngineIoWebSocketUrl(baseUrl);

  const socket = new WebSocket(wsUrl, {
    headers: {
      // Some intermediaries behave differently based on UA; keep it explicit.
      'User-Agent': 'lubee-smoke-test/1.0'
    }
  });

  const timeout = setTimeout(() => {
    console.error(`[smoke] timeout waiting for Engine.IO open packet from ${wsUrl}`);
    socket.terminate();
    process.exit(1);
  }, 5000);

  socket.on('open', () => {
    // If nginx upgrade works, we should reach open quickly.
    // Engine.IO should then send an "open" packet, which begins with "0".
  });

  socket.on('message', (data) => {
    const text = Buffer.isBuffer(data) ? data.toString('utf8') : String(data);
    if (text.startsWith('0')) {
      clearTimeout(timeout);
      console.log(`[smoke] websocket upgrade OK (received Engine.IO open packet) via ${wsUrl}`);
      socket.close();
      process.exit(0);
    }
  });

  socket.on('error', (err) => {
    clearTimeout(timeout);
    console.error(`[smoke] websocket error via ${wsUrl}:`, err && err.message ? err.message : err);
    process.exit(1);
  });

  socket.on('close', (code, reason) => {
    clearTimeout(timeout);
    if (code !== 1000) {
      console.error(`[smoke] websocket closed unexpectedly (code=${code}) reason=${reason}`);
      process.exit(1);
    }
    process.exit(0);
  });
}

run();

