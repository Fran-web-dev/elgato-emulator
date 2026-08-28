import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import type { ActionKind } from '../types'
import { normalizeUrl } from '../types'

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return null
    const blob = await res.blob()
    if (blob.size < 100) return null
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

async function fetchFavicon(rawUrl: string | undefined): Promise<string | null> {
  const u = normalizeUrl(rawUrl)
  if (!/^https?:\/\//i.test(u)) return null
  let host: string
  try {
    host = new URL(u).hostname
  } catch {
    return null
  }
  if (!host || host.includes(' ')) return null
  const candidates = [
    `https://favicone.com/${host}?s=128`,
    `https://www.google.com/s2/favicons?domain=${host}&sz=128`,
    `https://icons.duckduckgo.com/ip3/${host}.ico`,
  ]
  for (const c of candidates) {
    const data = await fetchAsDataUrl(c)
    if (data) return data
  }
  return null
}
import { BUILTIN_SOUNDS } from '../types'

const EMOJIS = ['🎬','🎮','🎙️','🔇','📡','⏺️','⏱️','🔢','💡','🔔','🥁','🌐','🎉','⭐','🔥','🏠','🐦','🏆','⏸️','🎮']

const COLORS = [
  '#2b3040','#111827','#ef4444','#f97316','#f59e0b','#84cc16',
  '#22c55e','#10b981','#06b6d4','#3b82f6','#6366f1','#8b5cf6',
  '#a855f7','#ec4899','#7c3aed','#475569',
]

const ACTIONS: { value: ActionKind; label: string }[] = [
  { value: 'none', label: 'No action' },
  { value: 'page', label: 'Switch page' },
  { value: 'sound', label: 'Play sound' },
  { value: 'timer', label: 'Timer' },
  { value: 'toggle', label: 'Toggle' },
  { value: 'counter', label: 'Counter' },
  { value: 'url', label: 'Open link / route' },
]

export function EditorSheet() {
  const selectedId = useStore((s) => s.selectedId)
  const pages = useStore((s) => s.pages)
  const currentPageId = useStore((s) => s.currentPageId)
  const sounds = useStore((s) => s.sounds)
  const updateKey = useStore((s) => s.updateKey)
  const removeKey = useStore((s) => s.removeKey)
  const select = useStore((s) => s.select)
  const addSound = useStore((s) => s.addSound)
  const removeSound = useStore((s) => s.removeSound)
  const showToast = useStore((s) => s.showToast)

  const fileRef = useRef<HTMLInputElement>(null)
  const iconFileRef = useRef<HTMLInputElement>(null)
  const [iconText, setIconText] = useState('')
  const [fetchingIcon, setFetchingIcon] = useState(false)

  const page = pages.find((p) => p.id === currentPageId)!
  const index = page.keys.findIndex((k) => k?.id === selectedId)
  const key = index >= 0 ? page.keys[index] : null

  useEffect(() => {
    setIconText(key?.icon ?? '')
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!key) return null
  const a = key.action

  const patchAction = (patch: Partial<typeof a>) => updateKey(index, { action: { ...a, ...patch } })
  const close = () => select(null)

  const onIconImage = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const size = 128
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight)
        const w = img.naturalWidth * scale
        const h = img.naturalHeight * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        updateKey(index, { iconImage: canvas.toDataURL('image/png') })
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const onUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const ok = addSound(file.name.replace(/\.[^.]+$/, ''), String(reader.result))
      if (ok) showToast(`Sound "${file.name}" added`)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="sheet">
      <div className="sheet-head">
        <span className="sheet-title">Edit key</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn danger" onClick={() => { removeKey(index); close() }}>Delete</button>
          <button className="btn" onClick={close}>Done</button>
        </div>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Icon</span>
          <input
            value={iconText}
            onChange={(e) => {
              setIconText(e.target.value)
              updateKey(index, { icon: e.target.value })
            }}
            placeholder="Emoji"
            maxLength={4}
          />
        </label>
        <label className="field grow">
          <span>Label</span>
          <input
            value={key.label}
            onChange={(e) => updateKey(index, { label: e.target.value })}
            placeholder="Label"
            maxLength={12}
          />
        </label>
      </div>

      <div className="emoji-grid">
        {EMOJIS.map((e) => (
          <button key={e} className="emoji-btn" onClick={() => { setIconText(e); updateKey(index, { icon: e, iconImage: undefined }) }}>
            {e}
          </button>
        ))}
      </div>

      <div className="row">
        <button className="btn" onClick={() => iconFileRef.current?.click()}>🖼 Custom icon</button>
        {key.iconImage && (
          <>
            <img className="icon-preview" src={key.iconImage} alt="" />
            <button className="btn danger" onClick={() => updateKey(index, { iconImage: undefined })}>
              Remove icon
            </button>
          </>
        )}
        <input
          ref={iconFileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onIconImage(f)
            e.target.value = ''
          }}
        />
      </div>

      <span className="field-label">Color</span>
      <div className="swatches">
        {COLORS.map((c) => (
          <button
            key={c}
            className={'swatch' + (key.bg === c ? ' sel' : '')}
            style={{ background: c }}
            onClick={() => updateKey(index, { bg: c })}
          />
        ))}
      </div>

      <label className="field">
        <span>Action</span>
        <select value={a.kind} onChange={(e) => patchAction({ kind: e.target.value as ActionKind })}>
          {ACTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      {a.kind === 'page' && (
        <label className="field">
          <span>Target page</span>
          <select value={a.pageId ?? ''} onChange={(e) => patchAction({ pageId: e.target.value })}>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
      )}

      {a.kind === 'sound' && (
        <div className="stack">
          <label className="field">
            <span>Sound</span>
            <select value={a.soundId ?? ''} onChange={(e) => patchAction({ soundId: e.target.value })}>
              <option value="" disabled>Pick a sound…</option>
              {BUILTIN_SOUNDS.map((s) => (
                <option key={s.id} value={s.id}>{s.name} (built-in)</option>
              ))}
              {sounds.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <div className="row">
            <button className="btn" onClick={() => fileRef.current?.click()}>+ Upload audio</button>
            {a.soundId && !a.soundId.startsWith('builtin:') && (
              <button className="btn danger" onClick={() => removeSound(a.soundId!)}>Remove sound</button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onUpload(f)
              e.target.value = ''
            }}
          />
        </div>
      )}

      {a.kind === 'timer' && (
        <div className="stack">
          <label className="field">
            <span>Seconds</span>
            <input
              type="number"
              min={5}
              max={7200}
              value={a.seconds ?? 60}
              onChange={(e) => patchAction({ seconds: Math.max(5, Number(e.target.value) || 60) })}
            />
          </label>
          <div className="row">
            {[60, 180, 300, 600].map((s) => (
              <button key={s} className="btn" onClick={() => patchAction({ seconds: s })}>
                {s / 60}m
              </button>
            ))}
          </div>
        </div>
      )}

      {a.kind === 'url' && (
        <div className="stack">
          <label className="field">
            <span>Link or route to navigate to</span>
            <input
              value={a.url ?? ''}
              onChange={(e) => patchAction({ url: e.target.value })}
              placeholder="https://youtube.com  ·  C:\Users\frank\Music"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
            />
          </label>
          <div className="row">
            <button
              className="btn"
              disabled={fetchingIcon}
              onClick={async () => {
                setFetchingIcon(true)
                try {
                  const data = await fetchFavicon(a.url)
                  if (data) {
                    updateKey(index, { iconImage: data })
                    showToast('Site icon added')
                  } else {
                    showToast('Could not fetch the site icon (site may block it)')
                  }
                } finally {
                  setFetchingIcon(false)
                }
              }}
            >
              {fetchingIcon ? '⏳ Fetching…' : '🌐 Use site icon'}
            </button>
          </div>
          <p className="hint-text">
            On phone/desktop it opens in a new tab. Linked with your PC? It opens there —
            web links, folders or files (e.g. D:\Music) all work.
          </p>
        </div>
      )}
    </div>
  )
}
