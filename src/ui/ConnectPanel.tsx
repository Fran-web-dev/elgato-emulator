import { useState } from 'react'
import { useStore } from '../store'
import { obs } from '../obs'
import { link } from '../link'

export function ConnectPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'direct' | 'link'>('link')
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span className="sheet-title">Connect</span>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <div className="tabs">
          <button className={'tab' + (tab === 'link' ? ' sel' : '')} onClick={() => setTab('link')}>
            Link with PC
          </button>
          <button className={'tab' + (tab === 'direct' ? ' sel' : '')} onClick={() => setTab('direct')}>
            Direct (OBS)
          </button>
        </div>
        {tab === 'link' ? <LinkTab /> : <DirectTab />}
        <StatusAndScenes />
      </div>
    </div>
  )
}

function LinkTab() {
  const linkState = useStore((s) => s.link)
  const setLinkState = useStore((s) => s.setLinkState)
  const showToast = useStore((s) => s.showToast)

  const connect = () => {
    if (!linkState.url.trim() || !linkState.code.trim()) {
      showToast('Enter the relay URL and the code from your PC')
      return
    }
    if (obs.isConnected) obs.disconnect()
    link.connect(linkState.url, linkState.code)
  }

  const disconnect = () => {
    link.disconnect()
    showToast('Link closed')
  }

  const connected = linkState.status === 'connected'

  return (
    <>
      <label className="field">
        <span>Relay server URL</span>
        <input
          value={linkState.url}
          onChange={(e) => setLinkState({ url: e.target.value })}
          placeholder="wss://your-relay.up.railway.app"
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
        On your PC run the bridge app (see README). It shows a 6-digit code — enter it here.
        Use <b>wss://</b> if this page is served over HTTPS.
      </p>
    </>
  )
}

function DirectTab() {
  const settings = useStore((s) => s.obsSettings)
  const setObsSettings = useStore((s) => s.setObsSettings)
  const showToast = useStore((s) => s.showToast)
  const status = useStore((s) => s.obsStatus)
  const [connecting, setConnecting] = useState(false)

  const connect = async () => {
    setConnecting(true)
    link.disconnect()
    try {
      await obs.connect(settings.url, settings.password)
      showToast('OBS connected')
    } catch (e) {
      showToast(`OBS: ${(e as Error).message}`)
    } finally {
      setConnecting(false)
    }
  }

  const disconnect = () => {
    obs.disconnect()
    showToast('OBS disconnected')
  }

  return (
    <>
      <label className="field">
        <span>OBS WebSocket URL</span>
        <input
          value={settings.url}
          onChange={(e) => setObsSettings({ url: e.target.value })}
          placeholder="ws://localhost:4455"
        />
      </label>
      <label className="field">
        <span>Password</span>
        <input
          type="password"
          value={settings.password}
          onChange={(e) => setObsSettings({ password: e.target.value })}
          placeholder="From OBS → Tools → WebSocket Server Settings"
        />
      </label>
      <div className="row">
        {!status.connected ? (
          <button className="btn primary" disabled={connecting} onClick={connect}>
            {connecting ? 'Connecting…' : 'Connect'}
          </button>
        ) : (
          <button className="btn danger" onClick={disconnect}>Disconnect</button>
        )}
      </div>
      <p className="hint-text">
        Works when this page runs on the same PC or over LAN (http). On phones/tablets use your
        PC's LAN IP, e.g. ws://192.168.1.20:4455. For a hosted site use "Link with PC" instead.
      </p>
    </>
  )
}

function StatusAndScenes() {
  const status = useStore((s) => s.obsStatus)
  const scenes = useStore((s) => s.obsScenes)
  const linkState = useStore((s) => s.link)
  const viaLink = linkState.status === 'connected'

  return (
    <>
      <div className={'status-pill' + (status.connected || viaLink ? ' ok' : '')}>
        <span className="dot" />
        {viaLink
          ? 'Linked with PC'
          : status.connected
            ? 'OBS connected'
            : 'Not connected'}
        {status.scene ? ` · ${status.scene}` : ''}
        {status.streaming ? ' · 🔴 LIVE' : ''}
        {status.recording ? ' · ⏺ REC' : ''}
      </div>
      {scenes.length > 0 && (
        <>
          <span className="field-label">Scenes</span>
          <div className="chips">
            {scenes.map((s) => (
              <span key={s} className={'chip' + (status.scene === s ? ' sel' : '')}>{s}</span>
            ))}
          </div>
        </>
      )}
    </>
  )
}
