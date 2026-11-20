import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { createGameServer } from '../server/index.js';

async function fixture(t) {
  const game = createGameServer();
  await new Promise(resolve => game.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${game.server.address().port}`;
  t.after(() => game.close());
  async function client() {
    const ws = new WebSocket(base.replace('http', 'ws') + '/multiplayer');
    const messages = []; const waiters = [];
    ws.on('message', data => {
      const msg = JSON.parse(data); messages.push(msg);
      for (const waiter of [...waiters]) if (waiter.predicate(msg)) { clearTimeout(waiter.timer); waiters.splice(waiters.indexOf(waiter), 1); waiter.resolve(msg); }
    });
    await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
    return { ws, messages, send: msg => ws.send(JSON.stringify(msg)), next: predicate => new Promise((resolve, reject) => {
      const waiter = { predicate, resolve }; waiter.timer = setTimeout(() => { waiters.splice(waiters.indexOf(waiter), 1); reject(Error('Message timeout')); }, 3000); waiters.push(waiter);
    }) };
  }
  return { game, base, client };
}

test('serves only game assets and health; denies arbitrary files and origins', async t => {
  const { base } = await fixture(t);
  assert.equal((await fetch(base)).status, 200);
  assert.equal((await fetch(base + '/online.js')).status, 200);
  assert.equal((await fetch(base + '/assets/geist-latin.woff2')).headers.get('content-type').split(';')[0], 'font/woff2');
  assert.deepEqual(await (await fetch(base + '/health')).json(), { ok: true });
  assert.equal((await fetch(base + '/server/index.js')).status, 404);
  assert.equal((await fetch(base + '/.git/config')).status, 404);
  const ws = new WebSocket(base.replace('http', 'ws') + '/multiplayer', { origin: 'https://example.invalid' });
  await new Promise(resolve => ws.once('error', resolve));
});

test('two real peers share presence, validated movement, chat and departure', async t => {
  const { client } = await fixture(t);
  const a = await client(), b = await client();
  let joined = a.next(m => m.type === 'joined'); a.send({ type: 'join', mode: 'public', name: 'Alice' }); const alice = await joined;
  joined = b.next(m => m.type === 'joined'); b.send({ type: 'join', mode: 'public', name: 'Bob' }); await joined;
  let snap = b.next(m => m.type === 'snapshot' && m.players.length === 2); await snap;
  snap = b.next(m => m.type === 'snapshot' && m.players.some(p => p.id === alice.id && p.x === 500));
  a.send({ type: 'state', x: 500, y: -100, avatar: { c: 43, p: 9999, n: 'bad' }, scene: 'world', moving: true, squish: true });
  const player = (await snap).players.find(p => p.id === alice.id);
  assert.equal(player.y, 14); assert.equal(player.avatar.c, 43); assert.equal(player.avatar.p, 0); assert.equal(player.avatar.n, 0);
  assert.equal(player.squish,true);
  const chat = b.next(m => m.type === 'chat'); a.send({ type: 'chat', text: 'Hi Bob!' }); assert.equal((await chat).text, 'Hi Bob!');
  const limited = a.next(m => m.type === 'error'); a.send({ type: 'chat', text: 'too fast' }); assert.match((await limited).message, /wait/);
  const left = b.next(m => m.type === 'left'); a.ws.close(); assert.equal((await left).id, alice.id);
});

test('invite rooms isolate peers, survive reconnect and reject bad codes', async t => {
  const { client } = await fixture(t);
  const host = await client(), friend = await client(), stranger = await client();
  let joined = host.next(m => m.type === 'joined'); host.send({ type: 'join', mode: 'create', name: 'Host' }); const { code } = await joined;
  assert.match(code, /^[a-f0-9]{12}$/);
  joined = friend.next(m => m.type === 'joined'); friend.send({ type: 'join', mode: 'private', code, name: 'Friend' }); await joined;
  joined = stranger.next(m => m.type === 'joined'); stranger.send({ type: 'join', mode: 'public' }); await joined;
  const snapshot = await stranger.next(m => m.type === 'snapshot'); assert.equal(snapshot.players.length, 1);
  const chat = friend.next(m => m.type === 'chat'); host.send({ type: 'chat', text: 'Friends only' }); await chat;
  assert.ok(!stranger.messages.some(m => m.type === 'chat'));
  const left = friend.next(m => m.type === 'left'); host.ws.close(); await left;
  const returning = await client(); joined = returning.next(m => m.type === 'joined'); returning.send({ type: 'join', mode: 'private', code }); assert.equal((await joined).code, code);
  const invalid = await client(); const error = invalid.next(m => m.type === 'error'); invalid.send({ type: 'join', mode: 'private', code: 'ffffffffffff' }); assert.match((await error).message, /not found/);
  invalid.ws.send('{'); assert.equal((await invalid.next(m => m.type === 'error')).message, 'Invalid message');
});

test('room capacity rejects extra private peers and splits public rooms', async t => {
  const game = createGameServer({ maxPlayers: 1 });
  await new Promise(resolve => game.server.listen(0, '127.0.0.1', resolve)); t.after(() => game.close());
  const url = `ws://127.0.0.1:${game.server.address().port}/multiplayer`;
  async function join(mode, code) {
    const ws = new WebSocket(url); await new Promise(resolve => ws.once('open', resolve));
    const response = new Promise(resolve => ws.once('message', data => resolve(JSON.parse(data)))); ws.send(JSON.stringify({ type: 'join', mode, code })); return response;
  }
  const host = await join('create'); const denied = await join('private', host.code); assert.equal(denied.type, 'error');
  await join('public'); await join('public'); assert.equal(game.rooms.size, 3);
});
