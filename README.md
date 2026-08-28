<h1 align="center">🎛️ DeckEmu — Stream Deck Emulator</h1>

<p align="center">
  <a href="#-quick-start"><img alt="status" src="https://img.shields.io/badge/status-active-brightgreen" /></a>
  <a href="LICENSE"><img alt="license" src="https://img.shields.io/badge/license-MIT-blue" /></a>
  <img alt="stack" src="https://img.shields.io/badge/React%2018-TypeScript-3178c6" />
  <img alt="3d" src="https://img.shields.io/badge/Three.js-R3F-orange" />
  <img alt="build" src="https://img.shields.io/badge/Vite-5-purple" />
</p>

<p align="center">
  A web-based <b>Elgato Stream Deck emulator</b> for phones and tablets.<br/>
  Control your PC from the couch: launch apps, open links, play sounds, run timers —
  all from a realistic 3D device or a flat glass grid.
</p>

---

## 📑 Table of contents

- [Features](#-features)
- [Architecture](#%EF%B8%8F-architecture)
- [Quick start](#-quick-start)
- [Project structure](#-project-structure)
- [Configuration](#%EF%B8%8F-configuration)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

## ✨ Features

| Area | What you get |
|---|---|
| **Two view modes** | Orbitable 3D device (Three.js / React Three Fiber) and a flat "glass grid" mode — auto-selected on touch screens |
| **Physical keys** | Glossy black keycaps with translucent glass, colored app-icon tiles, springy press animation with 3D tilt |
| **Pages** | Multiple pages with dot navigation, add/delete pages, page-switch keys |
| **Editor** | Per-key icon (emoji, uploaded image or site favicon), label, color and action |
| **Actions** | Open app (PC), open link/route, soundboard (built-in synths + uploaded audio), timer, toggle, counter, switch page |
| **PC linking** | Pair with your PC using a 6-digit code through a relay — actions run on your PC from anywhere |
| **Background sync** | Custom backgrounds sync between devices via Cloudflare KV |
| **PWA** | Installable, standalone, safe-area aware, mobile-first |

## 🏗️ Architecture

```
┌──────────────┐        wss         ┌─────────────────────┐        wss        ┌──────────────┐
│  Phone /     │ ◄────────────────► │  Relay (Cloudflare  │ ◄───────────────► │  PC Bridge   │
│  Tablet app  │    room code       │  Workers + DO/KV)   │    room code      │  (Node, ws)  │
└──────────────┘                    └─────────────────────┘                   └──────┬───────┘
                                                                                     │
                                                                              opens apps / links,
                                                                              plays sounds locally
```

- **App (this repo)** — React + TypeScript + Vite + Three.js. State in Zustand, persisted to `localStorage`.
- **Relay** — see [`Fran-web-dev/elgato-relay`](https://github.com/Fran-web-dev/elgato-relay). Pairs clients by 6-digit room code; stores synced backgrounds in KV.
- **Bridge** — Node script (`bridge/`) that joins the room as *host* and executes actions on the PC (Windows-first).

## 🚀 Quick start

```bash
git clone https://github.com/Fran-web-dev/elgato-emulator.git
cd elgato-emulator
npm install
npm run dev
```

Open the printed URL. To use from a phone/tablet, open the **Network** URL Vite prints
(e.g. `http://192.168.1.20:5173`) — both devices must share the same Wi-Fi.

### Link with your PC

1. Run `bridge/Iniciar Bridge.bat` (or `node bridge/index.mjs`) — it prints a 6-digit code
2. In the app: **PC → Link with PC** → relay URL + code
3. Press a key — apps, links and sounds now execute on your PC

## 📁 Project structure

```
elgato-emulator/
├── src/
│   ├── three/          # 3D device: scene, body, interactive LCD keys, canvas textures
│   ├── ui/             # Grid mode, key face, editor sheet, connect panel, top bar
│   ├── store.ts        # Zustand store (pages, keys, sounds, link, runtime) + persistence
│   ├── link.ts         # Relay client (pairing + action channel)
│   ├── audio.ts        # Web Audio synths + uploaded sample playback
│   └── types.ts        # Shared types & helpers
├── bridge/             # PC agent: pairs with the relay, runs actions locally
├── public/             # PWA icons & manifest
├── netlify.toml        # Netlify build config
└── index.html
```

## ⚙️ Configuration

### Bridge (CLI flags or `SDE_*` env vars)

| Flag | Env | Default | Description |
|---|---|---|---|
| `--relay` | `SDE_RELAY` | `wss://elgato-relay.franwebdev-relay.workers.dev` | Relay server URL |
| `--code` | `SDE_CODE` | random | Fixed 6-digit pairing code |

### App actions

| Action | On device | On linked PC |
|---|---|---|
| Open app | — (requires link) | ✅ alias (`spotify`, `discord`, `steam`…) or `.exe`/`.lnk` path |
| Open link/route | ✅ new tab | ✅ `start` (links, folders, files) |
| Play sound | ✅ Web Audio | ✅ MP3/WAV/M4A via MediaPlayer |
| Timer / toggle / counter / switch page | ✅ local | — |

## 🌐 Deployment

**Web app (static):** `npm run build` → deploy `dist/` to Netlify/Vercel/Cloudflare Pages.
`netlify.toml` is included — importing the repo into Netlify works with zero config.

**Relay:** follow the guide in [`elgato-relay`](https://github.com/Fran-web-dev/elgato-relay)
(Cloudflare Workers free plan, no credit card).

> [!IMPORTANT]
> If the app is served over **HTTPS**, browsers block plain `ws://` connections —
> use the relay link (`wss://`) instead of LAN addresses.

## 🔧 Troubleshooting

| Symptom | Fix |
|---|---|
| `Code not found` | The bridge isn't running, or the code is from a previous session — reopen it |
| `The PC disconnected` | The bridge window was closed — relaunch and pair again |
| Pairing fails from a hosted site | Ensure the relay URL uses `wss://` (not `ws://`) |
| Sounds don't play on PC | Use MP3/WAV; other codecs may not be supported by MediaPlayer |
| No sound at all on first tap | Browsers require a user gesture before audio — tap any key first |

## 📄 License

[MIT](LICENSE) © Fran-web-dev
