export type LinkStatus = 'disconnected' | 'connecting' | 'connected'

type StatusCb = (s: { status: LinkStatus; error?: string }) => void
type MsgCb = (msg: { t: string; [k: string]: unknown }) => void

class LinkService {
  private ws: WebSocket | null = null
  private statusCb: StatusCb | null = null
  private msgCb: MsgCb | null = null

  onStatus(cb: StatusCb) {
    this.statusCb = cb
  }
  onMessage(cb: MsgCb) {
    this.msgCb = cb
  }

  private setStatus(status: LinkStatus, error?: string) {
    this.statusCb?.({ status, error })
  }

  connect(relayUrl: string, code: string) {
    this.disconnect()
    this.setStatus('connecting')
    try {
      const base = relayUrl.trim().replace(/\/+$/, '')
      const ws = new WebSocket(`${base}/?mode=join&code=${encodeURIComponent(code.trim())}`)
      this.ws = ws
      ws.onopen = () => {
        this.setStatus('connected')
      }
      ws.onerror = () => {
        this.close()
        this.setStatus('disconnected', 'Could not reach the relay server')
      }
      ws.onclose = () => {
        if (this.ws === ws) {
          this.ws = null
          this.setStatus('disconnected')
        }
      }
      ws.onmessage = (e) => {
        try {
          const m = JSON.parse(String(e.data))
          if (m.t === 'error') {
            this.close()
            this.setStatus('disconnected', String(m.msg || 'Relay error'))
            return
          }
          this.msgCb?.(m)
        } catch {
          /* ignore non-JSON */
        }
      }
    } catch {
      this.setStatus('disconnected', 'Invalid relay URL')
    }
  }

  send(msg: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  private close() {
    if (this.ws) {
      const ws = this.ws
      this.ws = null
      ws.onclose = ws.onerror = ws.onmessage = ws.onopen = null
      try {
        ws.close()
      } catch {
        /* noop */
      }
    }
  }

  disconnect() {
    this.close()
  }

  get connected() {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}

export const link = new LinkService()
