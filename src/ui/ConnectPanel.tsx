import { useStore } from '../store'
import { link } from '../link'

export function ConnectPanel({ onClose }: { onClose: () => void }) {
  const linkState = useStore((s) => s.link)
  const setLinkState = useStore((s) => s.setLinkState)
  const showToast = useStore((s) => s.showToast)

  const connect = () => {
    if (!linkState.url.trim() || !linkState.code.trim()) {
      showToast('Enter the relay URL and the code from your PC')
      return
    }
    link.connect(linkState.url, linkState.code)
  }

  const disconnect = () => {
    link.disconnect()
    showToast('Link closed')
  }

  const connected = linkState.status === 'connected'

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span className="sheet-title">Link with your PC</span>
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        <div className={'status-pill' + (connected ? ' ok' : '')}>
          <span className="dot" />
          {connected ? 'Linked with PC' : linkState.status === 'connecting' ? 'Linking…' : 'Not linked'}
        </div>

        <label className="field">
          <span>Relay server URL</span>
          <input
            value={linkState.url}
            onChange={(e) => setLinkState({ url: e.target.value })}
            placeholder="wss://your-relay.workers.dev"
          />
        </label>
        <label className="field">
          <span>Pairing code (shown on your PC)</span>
          <input
            value={linkState.code}
            onChange={(e) => setLinkState({ code: e.target.value.replace(/\D/g, '').slice(0, 6) })}
            placeholder="123456"
            inputMode="numeric"
            autoComplete="off"
          />
        </label>

        <div className="row">
          {!connected ? (
            <button className="btn primary" onClick={connect}>
              {linkState.status === 'connecting' ? 'Linking…' : 'Link with PC'}
            </button>
          ) : (
            <button className="btn danger" onClick={disconnect}>Unlink</button>
          )}
          {linkState.error && <span className="err-text">{linkState.error}</span>}
        </div>

        <p className="hint-text">
          On your PC run "Iniciar Bridge" — it shows the 6-digit code. Enter it here.
          With the link active, links and sounds open/play on your PC.
        </p>
      </div>
    </div>
  )
}
