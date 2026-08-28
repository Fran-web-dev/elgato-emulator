import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { KeyConfig, KeyAction, Page, SoundItem, RuntimeState, ObsStatus } from './types'
import { KEY_COUNT, normalizeUrl } from './types'
import { playSound, timerBeep } from './audio'
import { obs } from './obs'
import { link } from './link'
import type { LinkStatus } from './link'

const uid = () => Math.random().toString(36).slice(2, 10)
const emptyKeys = () => Array(KEY_COUNT).fill(null) as (KeyConfig | null)[]

function defaultViewMode(): '3d' | 'grid' {
  if (typeof window === 'undefined') return '3d'
  const smallScreen = Math.min(window.innerWidth, window.innerHeight) <= 820
  const touch = window.matchMedia('(pointer: coarse)').matches
  return smallScreen || touch ? 'grid' : '3d'
}

function makeKey(partial: Partial<KeyConfig> & { action: KeyAction }): KeyConfig {
  return {
    id: uid(),
    label: '',
    icon: '⭐',
    bg: '#2b3040',
    ...partial,
  }
}

function defaultPages(): Page[] {
  return [
    {
      id: 'home',
      name: 'Home',
      keys: [
        makeKey({ label: 'Starting', icon: '🎬', bg: '#1f6feb', action: { kind: 'obs-scene', scene: 'Starting Soon' } }),
        makeKey({ label: 'Gameplay', icon: '🎮', bg: '#8b5cf6', action: { kind: 'obs-scene', scene: 'Gameplay' } }),
        makeKey({ label: 'Chatting', icon: '🎙️', bg: '#0ea5e9', action: { kind: 'obs-scene', scene: 'Just Chatting' } }),
        makeKey({ label: 'Mute', icon: '🔇', bg: '#374151', action: { kind: 'obs-mute', source: 'Mic/Aux' } }),
        makeKey({ label: 'Stream', icon: '📡', bg: '#dc2626', action: { kind: 'obs-stream' } }),
        makeKey({ label: 'Record', icon: '⏺️', bg: '#b45309', action: { kind: 'obs-record' } }),
        makeKey({ label: 'Timer', icon: '⏱️', bg: '#059669', action: { kind: 'timer', seconds: 300 } }),
        makeKey({ label: 'Counter', icon: '🔢', bg: '#7c3aed', action: { kind: 'counter' } }),
        makeKey({ label: 'Lights', icon: '💡', bg: '#ca8a04', action: { kind: 'toggle' } }),
        makeKey({ label: 'Beep', icon: '🔔', bg: '#334155', action: { kind: 'sound', soundId: 'builtin:beep' } }),
        makeKey({ label: 'Kick', icon: '🥁', bg: '#9d174d', action: { kind: 'sound', soundId: 'builtin:kick' } }),
        makeKey({ label: 'Open', icon: '🌐', bg: '#2563eb', action: { kind: 'url', url: 'https://example.com' } }),
        makeKey({ label: 'Fun', icon: '🎉', bg: '#db2777', action: { kind: 'page', pageId: 'fun' } }),
        null,
        null,
      ],
    },
    {
      id: 'fun',
      name: 'Fun',
      keys: [
        makeKey({ label: 'Back', icon: '🏠', bg: '#475569', action: { kind: 'page', pageId: 'home' } }),
        makeKey({ label: 'Chirp', icon: '🐦', bg: '#0d9488', action: { kind: 'sound', soundId: 'builtin:chirp' } }),
        makeKey({ label: 'Win', icon: '🏆', bg: '#f59e0b', action: { kind: 'sound', soundId: 'builtin:success' } }),
        null, null, null, null, null, null,
        null, null, null, null, null, null,
      ],
    },
  ]
}

interface AppState {
  pages: Page[]
  currentPageId: string
  editMode: boolean
  selectedId: string | null
  sounds: SoundItem[]
  viewMode: '3d' | 'grid'
  obsSettings: { url: string; password: string }
  obsStatus: ObsStatus
  obsScenes: string[]
  link: { url: string; code: string; status: LinkStatus; error?: string }
  runtime: Record<string, RuntimeState>
  toast: string | null

  setPage: (id: string) => void
  addPage: () => void
  deletePage: (id: string) => void
  setEditMode: (on: boolean) => void
  select: (id: string | null) => void
  addKey: (index: number) => void
  addShortcut: () => void
  addLinkShortcut: () => void
  updateKey: (index: number, patch: Partial<KeyConfig>) => void
  removeKey: (index: number) => void
  setViewMode: (mode: '3d' | 'grid') => void
  setLinkState: (patch: Partial<{ url: string; code: string; status: LinkStatus; error: string }>) => void
  linkPc: (action: Record<string, unknown>) => void
  addSound: (name: string, dataUrl: string) => boolean
  removeSound: (id: string) => void
  setObsSettings: (patch: Partial<{ url: string; password: string }>) => void
  setObsStatus: (patch: Partial<ObsStatus>) => void
  setObsScenes: (scenes: string[]) => void
  showToast: (msg: string) => void
  press: (keyId: string) => void
  bumpRuntime: (keyId: string, patch: RuntimeState) => void
}

const timers = new Map<string, ReturnType<typeof setInterval>>()

export const useStore = create<AppState>()(
  persist(
    (set, get) => {
      function setRuntime(keyId: string, patch: RuntimeState) {
        set((s) => ({ runtime: { ...s.runtime, [keyId]: { ...s.runtime[keyId], ...patch } } }))
      }

      function stopTimer(keyId: string) {
        const t = timers.get(keyId)
        if (t) {
          clearInterval(t)
          timers.delete(keyId)
        }
      }

      function startTimer(keyId: string, seconds: number) {
        stopTimer(keyId)
        setRuntime(keyId, { timerLeft: seconds, timerRunning: true, timerDone: false })
        timers.set(
          keyId,
          setInterval(() => {
            const rt = get().runtime[keyId] ?? {}
            const left = (rt.timerLeft ?? 0) - 1
            if (left <= 0) {
              stopTimer(keyId)
              timerBeep()
              setRuntime(keyId, { timerLeft: 0, timerRunning: false, timerDone: true })
              setTimeout(() => {
                const cur = get().runtime[keyId]
                if (cur?.timerDone) setRuntime(keyId, { timerDone: false })
              }, 4000)
            } else {
              setRuntime(keyId, { timerLeft: left })
            }
          }, 1000),
        )
      }

      return {
        pages: defaultPages(),
        currentPageId: 'home',
        editMode: false,
        selectedId: null,
        sounds: [],
        viewMode: defaultViewMode(),
        obsSettings: { url: 'ws://localhost:4455', password: '' },
        obsStatus: { connected: false, muted: [] },
        obsScenes: [],
        link: { url: '', code: '', status: 'disconnected' },
        runtime: {},
        toast: null,

        setPage: (id) => set({ currentPageId: id, selectedId: null }),
        addPage: () =>
          set((s) => {
            const id = uid()
            const page: Page = { id, name: `Page ${s.pages.length + 1}`, keys: emptyKeys() }
            return { pages: [...s.pages, page], currentPageId: id, selectedId: null }
          }),
        deletePage: (id) =>
          set((s) => {
            if (s.pages.length <= 1) return {}
            const pages = s.pages.filter((p) => p.id !== id)
            const currentPageId = s.currentPageId === id ? pages[0].id : s.currentPageId
            return { pages, currentPageId, selectedId: null }
          }),
        setEditMode: (on) => set({ editMode: on, selectedId: null }),

        select: (id) => set({ selectedId: id }),
        addKey: (index) => {
          const id = uid()
          set((s) => ({
            pages: s.pages.map((p) =>
              p.id === s.currentPageId
                ? {
                    ...p,
                    keys: p.keys.map((k, i) =>
                      i === index
                        ? makeKey({ id, icon: '⭐', bg: '#2b3040', action: { kind: 'none' } })
                        : k,
                    ),
                  }
                : p,
            ),
            selectedId: id,
          }))
        },
        addShortcut: () => {
          const s = get()
          const page = s.pages.find((p) => p.id === s.currentPageId)
          if (!page) return
          const idx = page.keys.findIndex((k) => !k)
          if (idx < 0) {
            s.showToast('Page is full — delete a key or add a page')
            return
          }
          s.addKey(idx)
        },
        addLinkShortcut: () => {
          const s = get()
          const page = s.pages.find((p) => p.id === s.currentPageId)
          if (!page) return
          const idx = page.keys.findIndex((k) => !k)
          if (idx < 0) {
            s.showToast('Page is full — delete a key or add a page')
            return
          }
          s.addKey(idx)
          s.updateKey(idx, {
            icon: '🌐',
            label: 'Link',
            bg: '#1d4ed8',
            action: { kind: 'url', url: 'https://' },
          })
        },

        updateKey: (index, patch) =>
          set((s) => ({
            pages: s.pages.map((p) =>
              p.id === s.currentPageId
                ? { ...p, keys: p.keys.map((k, i) => (i === index && k ? { ...k, ...patch } : k)) }
                : p,
            ),
          })),
        removeKey: (index) =>
          set((s) => ({
            pages: s.pages.map((p) =>
              p.id === s.currentPageId
                ? { ...p, keys: p.keys.map((k, i) => (i === index ? null : k)) }
                : p,
            ),
            selectedId: null,
          })),

        addSound: (name, dataUrl) => {
          const total = get().sounds.reduce((n, s) => n + s.dataUrl.length, 0) + dataUrl.length
          if (total > 3_500_000) {
            get().showToast('Storage full: remove some sounds first')
            return false
          }
          const id = uid()
          set((s) => ({ sounds: [...s.sounds, { id, name, dataUrl }] }))
          return true
        },
        removeSound: (id) => set((s) => ({ sounds: s.sounds.filter((x) => x.id !== id) })),

        setViewMode: (mode) => set({ viewMode: mode }),
        setLinkState: (patch) => set((s) => ({ link: { ...s.link, ...patch } })),
        linkPc: (action) => link.send({ t: 'key', action }),

        setObsSettings: (patch) => set((s) => ({ obsSettings: { ...s.obsSettings, ...patch } })),
        setObsStatus: (patch) => set((s) => ({ obsStatus: { ...s.obsStatus, ...patch } })),
        setObsScenes: (scenes) => set({ obsScenes: scenes }),

        showToast: (msg) => {
          set({ toast: msg })
          setTimeout(() => {
            if (get().toast === msg) set({ toast: null })
          }, 2600)
        },

        bumpRuntime: (keyId, patch) => setRuntime(keyId, patch),

        press: (keyId) => {
          const state = get()
          const page = state.pages.find((p) => p.id === state.currentPageId)
          const key = page?.keys.find((k) => k?.id === keyId)
          if (!key) return
          const a = key.action
          switch (a.kind) {
            case 'page': {
              const target = a.pageId ? state.pages.find((p) => p.id === a.pageId) : undefined
              if (target) get().setPage(target.id)
              break
            }
            case 'sound':
              if (link.connected) {
                if (a.soundId?.startsWith('builtin:')) {
                  link.send({ t: 'key', action: { kind: 'synth', name: a.soundId.slice(8) } })
                } else {
                  const snd = get().sounds.find((x) => x.id === a.soundId)
                  if (snd) link.send({ t: 'key', action: { kind: 'sound', dataUrl: snd.dataUrl } })
                  else get().showToast('Sound not found')
                }
              } else {
                playSound(a.soundId)
              }
              break
            case 'timer': {
              const rt = state.runtime[keyId]
              if (rt?.timerRunning) {
                stopTimer(keyId)
                setRuntime(keyId, { timerRunning: false, timerLeft: a.seconds ?? 0 })
                get().showToast('Timer reset')
              } else {
                startTimer(keyId, a.seconds ?? 60)
              }
              break
            }
            case 'toggle':
              setRuntime(keyId, { toggleOn: !(state.runtime[keyId]?.toggleOn ?? false) })
              break
            case 'counter':
              setRuntime(keyId, { counter: (state.runtime[keyId]?.counter ?? 0) + 1 })
              break
            case 'url': {
              const target = normalizeUrl(a.url)
              if (!target) {
                get().showToast('No link set — edit this key')
                break
              }
              if (link.connected) {
                get().linkPc({ kind: 'url', url: target })
              } else {
                let win: Window | null = null
                try {
                  win = window.open(target, '_blank', 'noopener')
                } catch {
                  /* popup blocked */
                }
                if (!win) {
                  const anchor = document.createElement('a')
                  anchor.href = target
                  anchor.target = '_blank'
                  anchor.rel = 'noopener'
                  document.body.appendChild(anchor)
                  anchor.click()
                  anchor.remove()
                  get().showToast('Opening link…')
                }
              }
              break
            }
            case 'obs-scene':
            case 'obs-mute':
            case 'obs-stream':
            case 'obs-record':
              if (link.connected) {
                get().linkPc({ kind: a.kind, scene: a.scene, source: a.source })
              } else {
                obs
                  .exec({ kind: a.kind, scene: a.scene, source: a.source })
                  .catch((e: Error) => get().showToast(`OBS: ${e.message}`))
              }
              break
            case 'none':
              get().showToast('No action assigned — edit this key')
              break
          }
        },
      }
    },
    {
      name: 'streamdeck-emulator',
      version: 1,
      migrate: (persisted) => {
        const next = { ...(persisted as Record<string, unknown>) }
        delete next.viewMode
        return next as unknown as AppState
      },
      partialize: (s) => ({
        pages: s.pages,
        currentPageId: s.currentPageId,
        sounds: s.sounds,
        viewMode: s.viewMode,
        obsSettings: s.obsSettings,
        link: { url: s.link.url, code: s.link.code, status: 'disconnected' as LinkStatus },
      }),
    },
  ),
)

obs.onStatus((patch) => useStore.getState().setObsStatus(patch))
obs.onScenes((scenes) => useStore.getState().setObsScenes(scenes))

link.onMessage((m) => {
  const s = useStore.getState()
  if (m.t === 'state') {
    const status = m.status as ObsStatus | undefined
    if (status) s.setObsStatus({ ...status, connected: true })
    const scenes = m.scenes as string[] | undefined
    if (scenes) s.setObsScenes(scenes)
  }
})
link.onStatus(({ status, error }) => {
  const s = useStore.getState()
  s.setLinkState({ status, error })
  if (status === 'connected' && obs.isConnected) obs.disconnect()
})
