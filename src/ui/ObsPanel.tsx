import { useState } from 'react'
import { useStore } from '../store'
import { obs } from '../obs'

export function ObsPanel({ onClose }: { onClose: () => void }) {
  const settings = useStore((s) => s.obsSettings)
  const setObsSettings = useStore((s) => s.setObsSettings)
  const status = useStore((s) => s.obsStatus)
  const scenes = useStore((s) => s.obsScenes)
  const showToast = useStore((s) => s.showToast)
  const [connecting, setConnecting] = useState(false)

  const connect = async () => {
    setConnecting(true)
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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span className="sheet-title">OBS Studio (WebSocket)</span>
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        <div className={'status-pill' + (status.connected ? ' ok' : '')}>
          <span className="dot" />
          {status.connected ? 'Connected' : 'Disconnected'}
          {status.scene ? ` · ${status.scene}` : ''}
          {status.streaming ? ' · 🔴 LIVE' : ''}
          {status.recording ? ' · ⏺ REC' : ''}
        </div>

        <label className="field">
          <span>Server URL</span>
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

        <p className="hint-text">
          In OBS: Tools → WebSocket Server Settings → enable, note port &amp; password.
          On phones/tablets use your PC's LAN IP, e.g. ws://192.168.1.20:4455
        </p>
      </div>
    </div>
  )
}
