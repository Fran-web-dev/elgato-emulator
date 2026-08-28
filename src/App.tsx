import { useState } from 'react'
import { Scene } from './three/Scene'
import { TopBar } from './ui/TopBar'
import { EditorSheet } from './ui/EditorSheet'
import { GridMode } from './ui/GridMode'
import { useStore } from './store'

function Toast() {
  const toast = useStore((s) => s.toast)
  if (!toast) return null
  return <div className="toast">{toast}</div>
}

function Hint() {
  const [open, setOpen] = useState(!localStorage.getItem('sde-hint-seen'))
  if (!open) return null
  return (
    <div className="hint" onClick={() => { localStorage.setItem('sde-hint-seen', '1'); setOpen(false) }}>
      Drag to rotate · Tap a key to use it · ✏️ to edit · ▦ for flat grid
      <span className="hint-x">✕</span>
    </div>
  )
}

export default function App() {
  const selectedId = useStore((s) => s.selectedId)
  const viewMode = useStore((s) => s.viewMode)
  return (
    <div id="app">
      {viewMode === '3d' ? <Scene /> : <GridMode />}
      <TopBar />
      {selectedId && <EditorSheet />}
      <Toast />
      <Hint />
    </div>
  )
}
