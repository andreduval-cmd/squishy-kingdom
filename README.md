# Squishy Kingdom

A fork of [smdbcba/squishy-kingdom](https://github.com/smdbcba/squishy-kingdom), adding real multiplayer to the existing collecting and exploration game.

## Play locally

Install Node.js 22 or newer, then run:

```sh
npm ci
npm start
```

Open http://localhost:3000. Choose a display name and **Join public**, or **Create friends room**. Open the game in another browser to see a second real player. To play across devices on the same network, visit the server computer's LAN address on port 3000. Internet play requires hosting the server below.

Friends rooms are free. **Copy invite** shares a URL with a random 12-character room code. A friend can open that link or enter the code in the room chooser. Anyone with the invite can join. Room limit: 24 players. Empty rooms expire after ten minutes; restarting the server clears all rooms. Invite links contain no save data. Clipboard copy requires HTTPS or localhost; otherwise the chat displays the link for manual copying.

## What works

- Real WebSocket connections, room membership and live player counts.
- Avatar appearance and world movement sent ten times per second, with interpolated peer rendering.
- Room chat, speech bubbles, arrival/departure notices, safe text rendering, message length and rate limits.
- Public rooms with automatic overflow, isolated invite rooms, solo mode, heartbeat cleanup and reconnect backoff.
- Existing collecting, NPC trading, battles, towers, quests, avatar editor and version 14 local saves.

The shared system covers presence and chat. Progression, enemies, coins, collections, gifts and NPC trades still run locally. Players cannot directly trade inventories or share battle rewards. There are no accounts, cloud saves, chat history, moderation console or authoritative economy yet. Display names are not verified identities. Client-reported world positions are bounded, but movement and unlocks are not enforced by the server. Do not use this version for purchases or a competitive economy.

## Host online

Run one persistent Node process or the included Docker image behind an HTTPS reverse proxy that forwards WebSocket upgrades to `/multiplayer`:

```sh
docker build -t squishy-kingdom .
docker run --rm -p 3000:3000 -e PORT=3000 squishy-kingdom
```

The same process serves the game and its WebSocket endpoint; no frontend URL editing or API keys are needed. `PORT` defaults to 3000; `HOST` defaults to `0.0.0.0`. Health endpoint: `/health`. The proxy must preserve the original `Host` header, or set `ALLOWED_ORIGINS` to the exact HTTPS origin (comma-separated for multiple origins). A single instance keeps rooms in memory; multiple replicas require a shared room service before scaling.

GitHub Pages can serve solo play, but cannot run this Node server. The repository is not automatically deployed to a public multiplayer host. A persistent WebSocket-capable host is required.

## Verify

```sh
npm test
npx playwright install chromium
npm run test:browser
```

For an installed Edge browser, set `BROWSER_CHANNEL=msedge` before the browser test. Server tests use real WebSocket clients. Browser tests exercise two players, movement, appearance updates, chat injection handling, reconnects, solo switching, private invites, mobile width and save reload. GitHub Actions runs both suites.

## Next milestones

1. Select a persistent host and configure HTTPS, operational logging and abuse handling.
2. Add accounts and server-owned inventories, then atomic player-to-player trading.
3. Move battles, rewards and progression validation to the server for co-op gameplay.
4. Add reporting, blocking and moderation before opening public chat broadly.

The historical HTML export and ZIP from upstream are retained as reference. `index.html` is the current game entry point. Upstream does not include a license file; this fork preserves its original attribution and does not add a license for upstream code.
