# DeckEmu — Stream Deck Emulator

A web-based Elgato Stream Deck for phones and tablets. 3D device (Three.js) or flat grid mode,
pages of shortcuts, soundboard (on your device or your PC), timers, custom image icons,
and link/route shortcuts that open on your PC via a pairing code.

## Run locally

```bash
npm install
npm run dev
```

Open the printed URL. On a phone/tablet use the LAN URL (e.g. `http://192.168.1.20:5173`).

## Linking with your PC (pairing code)

Three pieces:

1. **The web app** (this repo) — runs on your phone/tablet.
2. **A relay server** — pairs devices by a 6-digit code. Live one:
   `wss://elgato-relay.franwebdev-relay.workers.dev` (repo: `Fran-web-dev/elgato-relay`)
3. **The PC bridge** (`bridge/`) — runs on your PC.

### Run the bridge

Double-click `bridge/Iniciar Bridge.bat` (or: `cd bridge && npm install && node index.mjs`).

It shows a **pairing code** (e.g. `483 920`). Optional flags: `--code 123456`,
`--relay wss://...` (default: the Cloudflare relay above).

### Pair the app

Tap **PC → Link with PC**, enter the relay URL (saved after the first time) and the code.
Links and sounds now execute on your PC.

## Features

- 3D device (drag to rotate, pinch to zoom) or flat grid mode (▦ toggle; auto-selected on touch screens)
- Pages with dots navigation, add/delete pages (edit mode ✏️)
- Add shortcuts: edit mode → **＋ Link**, **＋ Key** or tap any empty slot
- Key editor: emoji or **custom image icon** (incl. site favicon), label, color, action
- Actions: open link/route (on the device, or on the PC when linked —
  web links, folders and files work), soundboard (built-in synths + uploaded audio,
  playable on device *or* PC), timer, toggle, counter, switch page
- Everything persists in localStorage

## Deploying the web app

It's a static Vite build (`netlify.toml` included):

```bash
npm run build   # outputs dist/
```

Host `dist/` on Vercel, Netlify, Cloudflare Pages, GitHub Pages, etc.

## Deploying your own relay

See `Fran-web-dev/elgato-relay` — Cloudflare Workers (free, no card) or any Node host.
