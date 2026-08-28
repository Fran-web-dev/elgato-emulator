// StreamDeck Emulator PC bridge (Windows-friendly).
// Hosts a room on the relay server and shows a 6-digit pairing code.
// Executes phone actions on the PC: open links/paths and play sounds.
//
// Usage:
//   node index.mjs --relay wss://your-relay.workers.dev
//   optional: --code 123456
import { WebSocket } from 'ws'
import { spawn } from 'node:child_process'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// ---------- args ----------
const argv = process.argv.slice(2)
function arg(name, def) {
  const i = argv.indexOf('--' + name)
  if (i >= 0 && argv[i + 1]) return argv[i + 1]
  const env = process.env['SDE_' + name.toUpperCase()]
  return env || def
}
const RELAY = arg('relay', 'wss://elgato-relay.franwebdev-relay.workers.dev')
const FIXED_CODE = arg('code', '')

let relayWs = null
let myCode = null

function log(...a) {
  console.log(...a)
}

// ---------- relay ----------
function connectRelay() {
  const base = RELAY.trim().replace(/\/+$/, '')
  const qs = FIXED_CODE ? `&code=${encodeURIComponent(FIXED_CODE)}` : ''
  const ws = new WebSocket(`${base}/?mode=host${qs}`)
  relayWs = ws
  ws.on('message', (data) => {
    let m
    try {
      m = JSON.parse(String(data))
    } catch {
      return
    }
    if (m.t === 'code') {
      myCode = m.code
      printBanner()
    } else if (m.t === 'peer') {
      log('📱 A device linked.')
    } else if (m.t === 'key') {
      handleAction(m.action || {})
    }
  })
  ws.on('close', () => {
    log('Relay connection closed — retrying in 3s…')
    relayWs = null
    setTimeout(connectRelay, 3000)
  })
  ws.on('error', (e) => {
    log('Relay error:', e.message)
  })
}

function printBanner() {
  const line = '═'.repeat(46)
  const code = myCode ?? '······'
  console.log(`
┌${line}┐
│  STREAMDECK EMULATOR — PC BRIDGE               │
│                                                │
│  PAIRING CODE:   ${code.slice(0, 3)} ${code.slice(3, 6)}                    │
│                                                │
│  Open the app on your phone/tablet, tap        │
│  "PC" → Link with PC and enter this code.      │
└${line}┘
  Relay:  ${RELAY}
`)
}

// ---------- actions from the phone ----------
function handleAction(a) {
  switch (a.kind) {
    case 'url':
      if (a.url) {
        log('Opening link/path:', a.url)
        spawn('cmd', ['/c', 'start', '', a.url], { detached: true, stdio: 'ignore' }).unref()
      }
      break
    case 'synth':
      playSynthPc(a.name)
      break
    case 'sound':
      if (a.dataUrl) playDataUrlPc(a.dataUrl)
      break
    default:
      log('Unknown action:', a.kind)
  }
}

// ---------- sound on the PC (Windows) ----------
function ps(cmd) {
  spawn('powershell', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', cmd], {
    detached: true,
    stdio: 'ignore',
  }).unref()
}

function playSynthPc(name) {
  const map = {
    beep: '[console]::beep(880,180)',
    chirp: '[console]::beep(420,70); Start-Sleep -Milliseconds 60; [console]::beep(950,90)',
    kick: '[console]::beep(150,140); [console]::beep(90,180)',
    success: '[console]::beep(660,110); Start-Sleep -Milliseconds 90; [console]::beep(990,140)',
  }
  if (map[name]) ps(map[name])
}

function playDataUrlPc(dataUrl) {
  const m = /^data:(audio\/[a-z0-9.+-]+);base64,(.+)$/.exec(dataUrl)
  if (!m) return log('Unsupported sound payload')
  const mime = m[1]
  if (!/wav|mpeg|mp3|mp4|m4a|aac|flac/.test(mime)) {
    return log(`Sound format ${mime} not playable on PC — use MP3/WAV`)
  }
  const ext = mime.includes('wav') ? 'wav' : mime.includes('mpeg') ? 'mp3' : 'm4a'
  try {
    const dir = mkdtempSync(join(tmpdir(), 'sde-'))
    const file = join(dir, `sound.${ext}`).replace(/'/g, "''")
    writeFileSync(file, Buffer.from(m[2], 'base64'))
    ps(
      `Add-Type -AssemblyName PresentationCore; ` +
        `$p = New-Object System.Windows.Media.MediaPlayer; ` +
        `$p.Open([Uri]'${file}'); $p.Play(); Start-Sleep -Milliseconds 5000; $p.Close()`,
    )
    log('Playing sound on PC')
  } catch (e) {
    log('Sound playback failed:', e.message)
  }
}

connectRelay()
