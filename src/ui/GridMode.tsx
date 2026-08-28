import { useState } from 'react'
import { useStore } from '../store'
import { KeyFace } from './KeyFace'
import type { KeyConfig } from '../types'

const BGS: { id: string; label: string; css: string; blobs: boolean }[] = [
  {
    id: 'aurora',
    label: 'Aurora',
    css: 'radial-gradient(1200px 700px at 80% -10%, rgba(59,130,246,0.16), transparent 60%), radial-gradient(900px 600px at 0% 110%, rgba(168,85,247,0.14), transparent 60%), #0a0b10',
    blobs: true,
  },
  {
    id: 'midnight',
    label: 'Midnight',
    css: 'radial-gradient(1000px 700px at 50% -20%, rgba(99,102,241,0.10), transparent 60%), #07080c',
    blobs: false,
  },
  {
    id: 'ocean',
    label: 'Ocean',
    css: 'radial-gradient(900px 600px at 15% 0%, rgba(6,182,212,0.28), transparent 60%), radial-gradient(900px 700px at 95% 100%, rgba(30,58,138,0.5), transparent 65%), #08111a',
    blobs: false,
  },
  {
    id: 'sunset',
    label: 'Sunset',
    css: 'radial-gradient(900px 600px at 85% 5%, rgba(244,63,94,0.30), transparent 60%), radial-gradient(900px 700px at 10% 100%, rgba(249,115,22,0.28), transparent 60%), #120a0e',
    blobs: false,
  },
  {
    id: 'forest',
    label: 'Forest',
    css: 'radial-gradient(900px 600px at 80% 0%, rgba(16,185,129,0.24), transparent 60%), radial-gradient(900px 700px at 5% 100%, rgba(20,83,45,0.45), transparent 65%), #081109',
    blobs: false,
  },
  {
    id: 'graphite',
    label: 'Graphite',
    css: 'linear-gradient(180deg, #17191f, #0c0d12)',
    blobs: false,
  },
]

function isImage(bg: string) {
  return bg.startsWith('data:')
}

function bgStyle(gridBg: string): React.CSSProperties {
  if (isImage(gridBg)) {
    return {
      backgroundImage: `url(${gridBg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }
  const preset = BGS.find((b) => b.id === gridBg) ?? BGS[0]
  return { background: preset.css }
}

function GridKey({ index, cfg }: { index: number; cfg: KeyConfig | null }) {
  const editMode = useStore((s) => s.editMode)
  const rt = useStore((s) => (cfg ? s.runtime[cfg.id] : undefined))
  const press = useStore((s) => s.press)
  const select = useStore((s) => s.select)
  const addKey = useStore((s) => s.addKey)
  const [pressed, setPressed] = useState(false)

  const onTap = () => {
    if (!editMode) {
      if (cfg) press(cfg.id)
      return
    }
    if (cfg) select(cfg.id)
    else addKey(index)
  }

  return (
    <button
      className={
        'gkey' + (cfg ? '' : ' ghost') + (editMode ? ' edit' : '') + (pressed ? ' pressed' : '')
      }
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      onClick={onTap}
    >
      {cfg || editMode ? <KeyFace cfg={cfg} rt={rt} /> : null}
    </button>
  )
}

const DEFAULT_RELAY = 'https://elgato-relay.franwebdev-relay.workers.dev'

function genSyncId(): string {
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789'
  let s = ''
  const buf = new Uint8Array(6)
  crypto.getRandomValues(buf)
  for (const b of buf) s += abc[b % abc.length]
  return s
}

function BgPicker() {
  const gridBg = useStore((s) => s.gridBg)
  const setGridBg = useStore((s) => s.setGridBg)
  const relayUrl = useStore((s) => s.link.url)
  const showToast = useStore((s) => s.showToast)
  const [open, setOpen] = useState(false)
  const [syncId, setSyncId] = useState(() => localStorage.getItem('sde-sync-id') || genSyncId())
  const [syncing, setSyncing] = useState(false)

  const syncBase = ((relayUrl || DEFAULT_RELAY).trim().replace(/\/+$/, '')).replace(/^wss/, 'https')

  const saveId = (id: string) => {
    const clean = id.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)
    setSyncId(clean)
    if (clean) localStorage.setItem('sde-sync-id', clean)
  }

  const uploadBg = async () => {
    setSyncing(true)
    try {
      const res = await fetch(`${syncBase}/sync/${syncId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gridBg }),
      })
      showToast(res.ok ? 'Background synced ☁️' : 'Sync failed')
    } catch {
      showToast('Sync failed — check the relay URL')
    } finally {
      setSyncing(false)
    }
  }

  const downloadBg = async () => {
    setSyncing(true)
    try {
      const res = await fetch(`${syncBase}/sync/${syncId}`)
      const data = (await res.json()) as { gridBg?: string }
      if (data.gridBg) {
        setGridBg(data.gridBg)
        showToast('Background loaded ☁️')
      } else {
        showToast('Nothing saved under that code yet')
      }
    } catch {
      showToast('Sync failed — check the relay URL')
    } finally {
      setSyncing(false)
    }
  }

  const onUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const max = 900
        const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.naturalWidth * scale)
        canvas.height = Math.round(img.naturalHeight * scale)
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
        setGridBg(canvas.toDataURL('image/jpeg', 0.82))
        setOpen(false)
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="bg-picker-wrap">
      <button className="bg-btn" onClick={() => setOpen(!open)} title="Change background">
        🎨
      </button>
      {open && (
        <div className="bg-picker">
          <span className="field-label">Background</span>
          <div className="bg-options">
            {BGS.map((b) => (
              <button
                key={b.id}
                className={'bg-option' + (gridBg === b.id ? ' sel' : '')}
                style={{ background: b.css }}
                title={b.label}
                onClick={() => setGridBg(b.id)}
              />
            ))}
            {isImage(gridBg) && (
              <button
                className="bg-option sel img"
                style={{ backgroundImage: `url(${gridBg})`, backgroundSize: 'cover' }}
                title="Your image"
                onClick={() => setOpen(false)}
              />
            )}
          </div>
          <label className="btn upload">
            🖼 Upload image
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onUpload(f)
                e.target.value = ''
              }}
            />
          </label>

          <span className="field-label">Sync between devices ☁️</span>
          <div className="row">
            <input
              className="sync-input"
              value={syncId}
              onChange={(e) => saveId(e.target.value)}
              placeholder="sync code"
              autoCapitalize="off"
              autoCorrect="off"
            />
            <button className="btn" disabled={syncing} onClick={uploadBg} title="Save background to the cloud">⬆️</button>
            <button className="btn" disabled={syncing} onClick={downloadBg} title="Load background from the cloud">⬇️</button>
          </div>
          <p className="hint-text">
            Use the same code on your other device: ⬆️ to save, ⬇️ to load.
          </p>
        </div>
      )}
    </div>
  )
}

export function GridMode() {
  const gridBg = useStore((s) => s.gridBg)
  const page = useStore((s) => s.pages.find((p) => p.id === s.currentPageId) ?? s.pages[0])
  const preset = !isImage(gridBg) ? (BGS.find((b) => b.id === gridBg) ?? BGS[0]) : null

  return (
    <div className="grid-wrap">
      <div className="grid-bg" style={bgStyle(gridBg)}>
        {isImage(gridBg) && <span className="grid-scrim" />}
        {preset?.blobs && (
          <>
            <span className="blob b1" />
            <span className="blob b2" />
            <span className="blob b3" />
          </>
        )}
      </div>
      <div className="grid">
        {page.keys.map((k, i) => (
          <GridKey key={i} index={i} cfg={k} />
        ))}
      </div>
      <BgPicker />
    </div>
  )
}
