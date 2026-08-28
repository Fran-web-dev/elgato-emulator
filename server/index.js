// StreamDeck Emulator relay server (Node + ws).
// Pairs phones (guests) with a PC bridge (host) by a 6-digit room code
// and forwards messages between everyone in the room.
//
// Protocol: clients pass mode+code as query params on the WS handshake
//   /?mode=host[&code=123456]      -> opens a room, replies {t:'code', code}
//   /?mode=join&code=123456        -> joins, host receives {t:'peer'}
// Legacy in-message {t:'host'|'join'} protocol is still supported.
import http from 'node:http'
import { WebSocketServer } from 'ws'

const PORT = process.env.PORT || 8080
const rooms = new Map() // code -> Set<WebSocket>

function makeCode() {
  let c = ''
  for (let i = 0; i < 6; i++) c += String(Math.floor(Math.random() * 10))
  return c
}

function openRoom(ws, fixedCode) {
  if (ws.room) return
  const fixed = /^\d{6}$/.test(String(fixedCode || '')) ? String(fixedCode) : null
  let code = fixed || makeCode()
  while (rooms.has(code)) {
    if (fixed) {
      ws.send(JSON.stringify({ t: 'error', msg: 'That code is already in use' }))
      ws.close()
      return
    }
    code = makeCode()
  }
  rooms.set(code, new Set([ws]))
  ws.room = code
  ws.role = 'host'
  ws.send(JSON.stringify({ t: 'code', code }))
  console.log(`host opened room ${code}`)
}

function joinRoom(ws, code) {
  if (ws.room) return
  const room = rooms.get(String(code || ''))
  if (!room) {
    ws.send(JSON.stringify({ t: 'error', msg: 'Code not found — is the bridge running on your PC?' }))
    return
  }
  room.add(ws)
  ws.room = String(code)
  ws.role = 'guest'
  for (const other of room) {
    if (other !== ws && other.readyState === ws.OPEN) other.send(JSON.stringify({ t: 'peer' }))
  }
  console.log(`guest joined room ${ws.room} (${room.size} clients)`)
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('StreamDeck Emulator relay is running')
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
  ws.room = null
  ws.role = null

  // New-style handshake via query params.
  try {
    const u = new URL(req.url ?? '/', 'http://localhost')
    const mode = u.searchParams.get('mode')
    if (mode === 'host') openRoom(ws, u.searchParams.get('code'))
    else if (mode === 'join') joinRoom(ws, u.searchParams.get('code'))
  } catch {
    /* fall through to message protocol */
  }

  ws.on('message', (data) => {
    let msg
    try {
      msg = JSON.parse(String(data))
    } catch {
      return
    }

    if (msg.t === 'host') openRoom(ws, msg.code)
    else if (msg.t === 'join') joinRoom(ws, msg.code)
    else if (ws.room) {
      const room = rooms.get(ws.room)
      if (!room) return
      const payload = String(data)
      for (const other of room) {
        if (other !== ws && other.readyState === ws.OPEN) other.send(payload)
      }
    }
  })

  ws.on('close', () => {
    if (!ws.room) return
    const room = rooms.get(ws.room)
    if (!room) return
    room.delete(ws)
    if (room.size === 0) {
      rooms.delete(ws.room)
      console.log(`room ${ws.room} closed`)
    }
  })

  ws.on('error', () => {})
})

server.listen(PORT, () => {
  console.log(`StreamDeck relay listening on port ${PORT}`)
})
