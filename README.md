# StreamDeck Emulator

A web-based Elgato Stream Deck for phones and tablets. 3D device (Three.js) or flat grid mode,
pages of shortcuts, soundboard, timers, custom image icons, and full OBS Studio control —
either directly on your LAN or from anywhere via a pairing code linked to your PC.

## Run locally

```bash
npm install
npm run dev
```

Open the printed URL. On a phone/tablet use the LAN URL (e.g. `http://192.168.1.20:5173`).

## Linking with your PC (pairing code)

Three pieces:

1. **The web app** (this repo) — runs on your phone/tablet.
2. **A relay server** (`server/`) — pairs devices by a 6-digit code.
3. **The PC bridge** (`bridge/`) — runs on your PC next to OBS Studio.

### 1. Deploy the relay (once)

Any Node host with TLS works (Railway, Render, Fly, a VPS…). Example for Railway/Render:

- Root directory: `server/`
- Start command: `npm start` (listens on `$PORT`)

Note the public URL, e.g. `wss://your-relay.up.railway.app`.

### 2. Run the bridge on your PC

```bash
cd bridge
npm install
node index.mjs --relay wss://your-relay.up.railway.app
```

It prints a **pairing code** (e.g. `483 920`) and connects to OBS at `ws://localhost:4455`.
Optional flags: `--code 123456`, `--obs ws://localhost:4455`, `--password xxx`.

### 3. Pair the app

In the app tap **PC → Link with PC**, enter the relay URL and the code, tap **Link**.
Scene/stream/record/mute state now syncs live, and all OBS/URL/sound actions run on your PC.

> Use `wss://` when the app is served over HTTPS. The `ws://` direct-OBS mode only works when
> the page itself is opened over `http` (localhost or LAN).

## OBS setup

OBS Studio → Tools → WebSocket Server Settings → enable it, note the port (default 4455) and password.

## Features

- 3D device (drag to rotate, pinch to zoom) or flat grid mode (▦ toggle)
- Pages with dots navigation, add/delete pages (edit mode ✏️)
- Add shortcuts: edit mode → **＋ Key** or tap any empty slot
- Key editor: emoji or **custom image icon**, label, color, action
- Actions: OBS scene / mute / stream / record, switch page, soundboard
  (built-in synths + uploaded audio, playable on phone *or* on the PC), timer, toggle,
  counter, open URL
- Everything persists in localStorage

## Deploying the web app

It's a static Vite build:

```bash
npm run build   # outputs dist/
```

Host `dist/` on Vercel, Netlify, Cloudflare Pages, GitHub Pages, etc.
