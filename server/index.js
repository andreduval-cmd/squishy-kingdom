import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';

const root = new URL('../', import.meta.url);
const assets = new Map([['/', ['index.html', 'text/html']], ['/index.html', ['index.html', 'text/html']], ['/online.js', ['online.js', 'text/javascript']], ['/online.css', ['online.css', 'text/css']]]);
for (const [path, type] of [['premium.css', 'text/css'], ['premium.js', 'text/javascript'], ['premium-world.js', 'text/javascript'], ['assets/kingdom-dawn.png', 'image/png']]) assets.set('/' + path, [path, type]);
const clean = (v, max) => typeof v === 'string' ? v.replace(/[\p{Cc}\p{Cf}]/gu, '').trim().slice(0, max) : '';
const integer = (v, max) => Number.isInteger(v) && v >= 0 && v <= max ? v : 0;
const avatarMax = { f: 5, h: 5, c: 43, b: 2, g: 1, s: 85, p: 9, e: 2, m: 2, n: 1, a: 5, t: 3 };

export function createGameServer({ maxPlayers = 24, roomTTL = 600000 } = {}) {
  const rooms = new Map();
  const server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/health') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true })); return; }
    const asset = assets.get(path);
    if (!asset || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(404); res.end('Not found'); return; }
    try {
      const data = await readFile(new URL(asset[0], root));
      res.writeHead(200, { 'Content-Type': `${asset[1]}; charset=utf-8`, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch { res.writeHead(500); res.end('Unable to load game'); }
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4096, perMessageDeflate: false });
  server.on('upgrade', (req, socket, head) => {
    // Browser clients must originate from this deployment. Explicit origins support reverse proxies.
    const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
    let originOK = !req.headers.origin;
    try { originOK ||= new URL(req.headers.origin).host === req.headers.host || allowed.includes(req.headers.origin); } catch {}
    const sameIP = [...wss.clients].filter(c => c.ip === req.socket.remoteAddress).length;
    if (req.url !== '/multiplayer' || !originOK || sameIP >= 12 || wss.clients.size >= 1000) { socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
  });
  const send = (ws, data) => { if (ws.readyState === WebSocket.OPEN && ws.bufferedAmount < 65536) ws.send(JSON.stringify(data)); };
  const broadcast = (room, data) => { for (const ws of room.players) send(ws, data); };
  function leave(ws) {
    const room = ws.room;
    if (!room) return;
    room.players.delete(ws); room.emptySince = Date.now(); ws.room = null;
    broadcast(room, { type: 'left', id: ws.id, name: ws.player.name });
  }
  wss.on('connection', (ws, req) => {
    ws.id = randomUUID(); ws.ip = req.socket.remoteAddress; ws.alive = true;
    ws.windowStart = Date.now(); ws.messages = 0; ws.lastChat = 0;
    ws.on('error', () => {});
    ws.on('pong', () => { ws.alive = true; });
    ws.on('close', () => leave(ws));
    ws.on('message', (raw, binary) => {
      const now = Date.now();
      if (now - ws.windowStart >= 1000) { ws.messages = 0; ws.windowStart = now; }
      if (++ws.messages > 40) { ws.close(1008, 'Too many messages'); return; }
      let msg;
      try { if (binary) throw Error(); msg = JSON.parse(raw.toString()); if (!msg || typeof msg !== 'object') throw Error(); } catch { send(ws, { type: 'error', message: 'Invalid message' }); return; }
      if (msg.type === 'join') {
        if (ws.room) { send(ws, { type: 'error', message: 'Already joined' }); return; }
        let room;
        if (msg.mode === 'public') {
          room = [...rooms.values()].find(r => r.public && r.players.size < maxPlayers);
          if (!room) { const id = randomUUID(); room = { id, public: true, players: new Set(), emptySince: now }; rooms.set(id, room); }
        } else if (msg.mode === 'create') {
          if (rooms.size >= 200) { send(ws, { type: 'error', message: 'Server is full. Try later.' }); return; }
          const id = randomBytes(6).toString('hex'); room = { id, public: false, players: new Set(), emptySince: now }; rooms.set(id, room);
        } else if (msg.mode === 'private' && typeof msg.code === 'string') {
          room = rooms.get(msg.code.toLowerCase());
          if (room?.public) room = null;
        }
        if (!room) { send(ws, { type: 'error', message: 'Room not found. Ask your friend for a new invite.' }); return; }
        if (room.players.size >= maxPlayers) { send(ws, { type: 'error', message: 'Room is full.' }); return; }
        ws.player = { id: ws.id, name: clean(msg.name, 20) || 'Mochi', x: 400, y: 505, avatar: {}, scene: 'world', moving: false };
        ws.room = room; room.players.add(ws);
        send(ws, { type: 'joined', id: ws.id, code: room.public ? null : room.id, public: room.public });
        broadcast(room, { type: 'arrived', id: ws.id, name: ws.player.name });
      } else if (msg.type === 'state' && ws.room) {
        if (!Number.isFinite(msg.x) || !Number.isFinite(msg.y)) return;
        ws.player.x = Math.max(14, Math.min(1146, msg.x));
        ws.player.y = Math.max(14, Math.min(1546, msg.y));
        ws.player.scene = msg.scene === 'world' ? 'world' : 'inside';
        ws.player.moving = msg.moving === true;
        const source = msg.avatar && typeof msg.avatar === 'object' ? msg.avatar : {};
        ws.player.avatar = Object.fromEntries(Object.entries(avatarMax).map(([key, max]) => [key, integer(source[key], max)]));
      } else if (msg.type === 'chat' && ws.room) {
        if (now - ws.lastChat < 1000) { send(ws, { type: 'error', message: 'Please wait a second between messages.' }); return; }
        const text = clean(msg.text, 160);
        if (!text) return;
        ws.lastChat = now;
        broadcast(ws.room, { type: 'chat', id: ws.id, name: ws.player.name, text });
      }
    });
  });
  const tick = setInterval(() => {
    for (const [id, room] of rooms) {
      if (!room.players.size) { if (Date.now() - room.emptySince > roomTTL) rooms.delete(id); continue; }
      broadcast(room, { type: 'snapshot', players: [...room.players].map(ws => ws.player) });
    }
  }, 100);
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.alive || (!ws.room && Date.now() - ws.windowStart > 15000)) { ws.terminate(); continue; }
      ws.alive = false; ws.ping();
    }
  }, 15000);
  return {
    server, rooms,
    async close() { clearInterval(tick); clearInterval(heartbeat); for (const ws of wss.clients) ws.terminate(); await new Promise(resolve => wss.close(resolve)); await new Promise(resolve => server.close(resolve)); }
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const game = createGameServer();
  game.server.listen(Number(process.env.PORT) || 3000, process.env.HOST || '0.0.0.0', () => console.log(`Squishy Kingdom listening on port ${game.server.address().port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await game.close(); process.exit(0); });
}
