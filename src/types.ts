export type ActionKind =
  | 'none'
  | 'page'
  | 'sound'
  | 'timer'
  | 'toggle'
  | 'counter'
  | 'url'
  | 'app'
  | 'obs-scene'
  | 'obs-mute'
  | 'obs-stream'
  | 'obs-record'

export interface KeyAction {
  kind: ActionKind
  pageId?: string
  soundId?: string
  seconds?: number
  url?: string
  app?: string
  scene?: string
  source?: string
}

export interface KeyConfig {
  id: string
  label: string
  icon: string
  iconImage?: string
  bg: string
  action: KeyAction
}

export interface Page {
  id: string
  name: string
  keys: (KeyConfig | null)[]
}

export interface SoundItem {
  id: string
  name: string
  dataUrl: string
}

export interface RuntimeState {
  toggleOn?: boolean
  counter?: number
  timerLeft?: number
  timerRunning?: boolean
  timerDone?: boolean
}export const KEY_COUNT = 15
export const BUILTIN_SOUNDS = [
  { id: 'builtin:beep', name: 'Beep' },
  { id: 'builtin:chirp', name: 'Chirp' },
  { id: 'builtin:kick', name: 'Kick' },
  { id: 'builtin:success', name: 'Success' },
]

export function contrastFg(bg: string): string {
  const hex = bg.replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.6 ? '#101216' : '#f5f6f8'
}

export function normalizeUrl(raw: string | undefined): string {
  const u = (raw ?? '').trim()
  if (!u) return ''
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return u
  if (/^(\\\\|\/\/|[a-z]:[\\/])/i.test(u)) return u
  return 'https://' + u
}

export function faviconFor(raw: string | undefined): string | null {
  const u = normalizeUrl(raw)
  if (!/^https?:\/\//i.test(u)) return null
  try {
    const host = new URL(u).hostname
    if (!host || host.includes(' ')) return null
    return `https://www.google.com/s2/favicons?domain=${host}&sz=128`
  } catch {
    return null
  }
}

export function formatSeconds(total: number): string {
  const s = Math.max(0, Math.ceil(total))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

export function keyActive(cfg: KeyConfig, rt?: RuntimeState): boolean {
  return cfg.action.kind === 'toggle' && !!rt?.toggleOn
}
