// StreamDeck Emulator PC bridge (Windows-friendly).
// Connects to OBS Studio locally, hosts a room on the relay server,
// and shows a 6-digit pairing code to enter in the web app.
//
// Usage:
//   node index.mjs --relay wss://your-relay.up.railway.app
//   optional: --code 123456  --obs ws://localhost:4455  --password xxx
import { WebSocket } from 'ws'
import OBSWebSocket, { EventSubscription } from 'obs-websocket-js'
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
const RELAY = arg('relay', 'ws://localhost:8080')
const FIXED_CODE = arg('code', '')
const OBS_URL = arg('obs', 'ws://localhost:4455')
const OBS_PASS = arg('password', '')

// ---------- state ----------
const obs = new OBSWebSocket()
let relayWs = null
let myCode = null
const status = { scene: undefined, streaming: false, recording: false, muted: [] }
const muted = new Set()
let scenes = []

function log(...a) {
  console.log(...a)
}

// ---------- relay ----------
function connectRelay() {
  const base = RELAY.trim().replace(/\/+$/, '')
  const qs = FIXED_CODE ? `&code=${encodeURIComponent(FIXED_CODE)}` : ''
  const ws = new WebSocket(`${base}/?mode=host${qs}`)
  relayWs = ws
  ws.on('open', () => {
    /* room opened via ?mode=host */
  })
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
      log('📱 A device linked. Sending current state…')
      sendState()
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

function send(msg) {
  if (relayWs && relayWs.readyState === WebSocket.OPEN) relayWs.send(JSON.stringify(msg))
}

function sendState() {
  send({ t: 'state', status, scenes })
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
│  "PC" → Link with PC, set the relay URL and    │
│  enter this code.                              │
└${line}┘
  Relay:  ${RELAY}
  OBS:    ${OBS_URL}
`)
}

// ---------- actions from the phone ----------
function handleAction(a) {
  switch (a.kind) {
    case 'obs-scene':
    case 'obs-mute':
    case 'obs-stream':
    case 'obs-record':
      execObs(a).catch((e) => log('OBS action failed:', e.message))
      break
    case 'url':
      if (a.url) {
        log('Opening URL:', a.url)
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

async function execObs(a) {
  switch (a.kind) {
    case 'obs-scene':
      await obs.call('SetCurrentProgramScene', { sceneName: a.scene })
      status.scene = a.scene
      break
    case 'obs-mute': {
      const name = a.source || 'Mic/Aux'
      const cur = await obs.call('GetInputMute', { inputName: name })
      await obs.call('SetInputMute', { inputName: name, inputMuted: !cur.inputMuted })
      break
    }
    case 'obs-stream': {
      await obs.call('ToggleStream')
      const r = await obs.call('GetStreamStatus')
      status.streaming = r.outputActive
      break
    }
    case 'obs-record': {
      await obs.call('ToggleRecord')
      const r = await obs.call('GetRecordStatus')
      status.recording = r.outputActive
      break
    }
  }
  sendState()
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

// ---------- OBS connection ----------
async function connectObs() {
  try {
    await obs.connect(OBS_URL, OBS_PASS, {
      rpcVersion: 1,
      eventSubscriptions: EventSubscription.All,
    })
    log('Connected to OBS Studio')
    const [sceneList, program, stream, record, inputs] = await Promise.all([
      obs.call('GetSceneList'),
      obs.call('GetCurrentProgramScene'),
      obs.call('GetStreamStatus'),
      obs.call('GetRecordStatus'),
      obs.call('GetInputList'),
    ])
    scenes = sceneList.scenes.map((s) => s.sceneName)
    status.scene = program.currentProgramSceneName
    status.streaming = stream.outputActive
    status.recording = record.outputActive
    muted.clear()
    for (const input of inputs.inputs) {
      if (input.inputMuted) muted.add(input.inputName)
    }
    status.muted = [...muted]
    sendState()
  } catch (e) {
    log(`OBS not reachable (${e.message}) — retrying in 5s…`)
    setTimeout(connectObs, 5000)
    return
  }

  obs.on('CurrentProgramSceneChanged', ({ sceneName }) => {
    status.scene = sceneName
    sendState()
  })
  obs.on('StreamStateChanged', ({ outputActive }) => {
    status.streaming = outputActive
    sendState()
  })
  obs.on('RecordStateChanged', ({ outputActive }) => {
    status.recording = outputActive
    sendState()
  })
  obs.on('InputMuteStateChanged', ({ inputName, inputMuted }) => {
    if (inputMuted) muted.add(inputName)
    else muted.delete(inputName)
    status.muted = [...muted]
    sendState()
  })
  obs.on('ConnectionClosed', () => {
    log('OBS connection closed — retrying in 5s…')
    setTimeout(connectObs, 5000)
  })
}

connectRelay()
connectObs()
