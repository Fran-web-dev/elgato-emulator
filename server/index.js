// StreamDeck Emulator relay server.
// Pairs phones (guests) with a PC bridge (host) by a 6-digit room code
// and forwards messages between everyone in the room.
// Deploy to any Node host (Render, Railway, Fly, VPS). TLS is handled by the host.
import http from 'node:http'
import { WebSocketServer } from 'ws'

const PORT = process.env.PORT || 8080
const rooms = new Map() // code -> Set<WebSocket>

function makeCode() {
  let c = ''
  for (let i = 0; i < 6; i++) c += String(Math.floor(Math.random() * 10))
  return c
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('StreamDeck Emulator relay is running')
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws) => {
  ws.room = null
  ws.role = null

  ws.on('message', (data) => {
    let msg
    try {
      msg = JSON.parse(String(data))
    } catch {
      return
    }

    if (msg.t === 'host') {
      let code = msg.code && /^\d{6}$/.test(String(msg.code)) ? String(msg.code) : makeCode()
      while (rooms.has(code)) code = makeCode()
      rooms.set(code, new Set([ws]))
      ws.room = code
      ws.role = 'host'
      ws.send(JSON.stringify({ t: 'code', code }))
      console.log(`host opened room ${code}`)
      return
    }

    if (msg.t === 'join') {
      const code = String(msg.code || '')
      const room = rooms.get(code)
      if (!room) {
        ws.send(JSON.stringify({ t: 'error', msg: 'Code not found — is the bridge running on your PC?' }))
        return
      }
      room.add(ws)
      ws.room = code
      ws.role = 'guest'
      for (const other of room) {
        if (other !== ws && other.readyState === ws.OPEN) {
          other.send(JSON.stringify({ t: 'peer' }))
        }
      }
      console.log(`guest joined room ${code} (${room.size} clients)`)
      return
    }

    // Any other message: forward to everyone else in the room.
    if (!ws.room) return
    const room = rooms.get(ws.room)
    if (!room) return
    const payload = String(data)
    for (const other of room) {
      if (other !== ws && other.readyState === ws.OPEN) other.send(payload)
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
