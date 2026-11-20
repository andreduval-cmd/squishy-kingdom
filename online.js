/* Transport and chat UI; the existing game supplies avatar and world state. */
class SquishyOnline {
  constructor({ state, players, status }) {
    this.state = state; this.players = players; this.status = status;
    this.generation = 0; this.retry = 0; this.id = null; this.code = null; this.connected = false;
    this.panel = document.createElement('section');
    this.panel.className = 'online-panel'; this.panel.hidden = true;
    this.panel.setAttribute('aria-label', 'Live multiplayer');
    this.panel.innerHTML = `<div class="online-heading"><b id="online-status" role="status">Connecting…</b><button type="button" id="online-invite" hidden>Copy invite</button><button type="button" id="online-toggle" aria-expanded="true" aria-controls="online-body">Hide chat</button></div>
      <div id="online-body"><p class="online-note">Live players · keep personal details private. Collections stay on this device.</p><div id="online-log" role="log" aria-label="Room chat" aria-live="polite"></div><form id="online-form"><input id="online-message" aria-label="Message to room" placeholder="Say hello…" maxlength="160" autocomplete="off" disabled><button disabled>Send</button></form></div>`;
    document.getElementById('world').append(this.panel);
    this.log = this.panel.querySelector('#online-log');
    this.form = this.panel.querySelector('form'); this.input = this.form.querySelector('input');
    this.form.addEventListener('submit', e => { e.preventDefault(); if (this.send({ type: 'chat', text: this.input.value }) && this.input.value.trim()) this.input.value = ''; });
    this.panel.querySelector('#online-toggle').onclick = e => {
      const body = this.panel.querySelector('#online-body'); body.hidden = !body.hidden;
      e.target.textContent = body.hidden ? 'Show chat' : 'Hide chat'; e.target.setAttribute('aria-expanded', String(!body.hidden));
    };
    this.panel.querySelector('#online-invite').onclick = async () => {
      const url = new URL(location.href); url.search = ''; url.hash = ''; url.searchParams.set('room', this.code);
      try { await navigator.clipboard.writeText(url.href); this.line('Invite copied. Send it to a friend.'); }
      catch { this.line(`Invite: ${url.href}`); }
    };
    this.timer = setInterval(() => {
      if (this.connected) this.send({ type: 'state', ...this.state() });
    }, 100);
    addEventListener('pagehide', () => this.disconnect());
    addEventListener('online', () => { if (this.selection && !this.connected) this.connect(this.generation); });
  }
  line(text) {
    const row = document.createElement('p'); row.textContent = text; this.log.append(row);
    while (this.log.children.length > 60) this.log.firstChild.remove();
    this.log.scrollTop = this.log.scrollHeight;
  }
  setStatus(text) { this.panel.querySelector('#online-status').textContent = text; this.status(text); }
  enable(on) { this.connected = on; this.input.disabled = !on; this.form.querySelector('button').disabled = !on; }
  send(data) {
    if (this.socket?.readyState !== WebSocket.OPEN || this.socket.bufferedAmount > 65536) return false;
    this.socket.send(JSON.stringify(data)); return true;
  }
  disconnect() {
    this.generation++; clearTimeout(this.retryTimer); clearTimeout(this.joinTimer);
    this.selection = null; this.enable(false); this.socket?.close(); this.socket = null;
    this.players([]); this.panel.hidden = true; this.id = null; this.code = null;
  }
  join(selection) {
    this.disconnect(); this.selection = { ...selection }; this.retry = 0;
    this.log.replaceChildren(); this.panel.hidden = false; this.connect(this.generation);
  }
  connect(generation) {
    if (generation !== this.generation || !this.selection || this.socket && this.socket.readyState < 2) return;
    clearTimeout(this.retryTimer);
    this.setStatus('Connecting…');
    if (!/^https?:$/.test(location.protocol)) { this.setStatus('Start the game server to play online'); return; }
    const url = new URL('/multiplayer', location.href); url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = this.socket = new WebSocket(url); let failed = false;
    const current = () => this.generation === generation && this.socket === ws;
    this.joinTimer = setTimeout(() => { if (current() && !this.connected) ws.close(); }, 8000);
    ws.onopen = () => { if (current()) this.send({ type: 'join', ...this.selection }); };
    ws.onmessage = e => {
      if (!current()) return;
      let msg; try { msg = JSON.parse(e.data); } catch { return; }
      if (msg.type === 'joined') {
        clearTimeout(this.joinTimer); this.id = msg.id; this.code = msg.code; this.retry = 0; this.enable(true);
        if (this.code) this.selection = { ...this.selection, mode: 'private', code: this.code };
        this.panel.querySelector('#online-invite').hidden = !this.code;
        this.setStatus(msg.public ? 'Public room · connected' : `Friends room · ${this.code}`);
        this.line('Connected. Walk around to meet other players.'); this.send({ type: 'state', ...this.state() });
      } else if (msg.type === 'snapshot') {
        this.players(msg.players.filter(p => p.id !== this.id));
        this.setStatus(`${this.code ? 'Friends room' : 'Public room'} · ${msg.players.length} online`);
      } else if (msg.type === 'chat') {
        this.line(`${msg.name}: ${msg.text}`);
        this.onChat?.(msg);
      } else if (msg.type === 'arrived' && msg.id !== this.id) this.line(`${msg.name} joined.`);
      else if (msg.type === 'left') this.line(`${msg.name} left.`);
      else if (msg.type === 'error') {
        this.line(msg.message);
        if (!this.connected) { failed = true; this.setStatus(msg.message); ws.close(); }
      }
    };
    ws.onerror = () => {};
    ws.onclose = () => {
      if (!current()) return;
      clearTimeout(this.joinTimer); this.enable(false); this.players([]);
      this.panel.querySelector('#online-invite').hidden = true;
      if (failed) return;
      this.setStatus('Disconnected · reconnecting…');
      this.retryTimer = setTimeout(() => this.connect(generation), Math.min(15000, 1000 * 2 ** Math.min(this.retry++, 4)));
    };
  }
}
window.SquishyOnline = SquishyOnline;
