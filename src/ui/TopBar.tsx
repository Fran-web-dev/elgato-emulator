import { useState } from 'react'
import { useStore } from '../store'
import { ConnectPanel } from './ConnectPanel'

export function TopBar() {
  const pages = useStore((s) => s.pages)
  const currentPageId = useStore((s) => s.currentPageId)
  const setPage = useStore((s) => s.setPage)
  const addPage = useStore((s) => s.addPage)
  const deletePage = useStore((s) => s.deletePage)
  const editMode = useStore((s) => s.editMode)
  const setEditMode = useStore((s) => s.setEditMode)
  const addShortcut = useStore((s) => s.addShortcut)
  const addLinkShortcut = useStore((s) => s.addLinkShortcut)
  const viewMode = useStore((s) => s.viewMode)
  const setViewMode = useStore((s) => s.setViewMode)
  const obsStatus = useStore((s) => s.obsStatus)
  const linkState = useStore((s) => s.link)
  const [panelOpen, setPanelOpen] = useState(false)

  const connected = obsStatus.connected || linkState.status === 'connected'

  return (
    <>
      <header className="topbar">
        <div className="topbar-row">
          <span className="logo">
            <span className="logo-mark" /> Deck<span className="dim">Emu</span>
          </span>
          <div className="row">
            <button
              className="icon-btn"
              onClick={() => setViewMode(viewMode === '3d' ? 'grid' : '3d')}
              title="Toggle 3D device / flat grid"
            >
              {viewMode === '3d' ? '▦ Grid' : '🎲 3D'}
            </button>
            <button
              className={'icon-btn' + (editMode ? ' active' : '')}
              onClick={() => setEditMode(!editMode)}
              title="Edit mode"
            >
              {editMode ? '✓' : '✏️'}
            </button>
            <button
              className={'icon-btn' + (connected ? ' active' : '')}
              onClick={() => setPanelOpen(true)}
              title="Connect to OBS or link with your PC"
            >
              <span className={'dot' + (connected ? ' ok' : ' err')} /> PC
            </button>
          </div>
        </div>
        <div className="topbar-row dots-row">
          <div className="dots">
            {pages.map((p) => (
              <button
                key={p.id}
                className={'dot-btn' + (p.id === currentPageId ? ' sel' : '')}
                onClick={() => setPage(p.id)}
                title={p.name}
              />
            ))}
          </div>
          {editMode && (
            <div className="row">
              <button className="icon-btn" onClick={addLinkShortcut} title="Add a link shortcut">＋ Link</button>
              <button className="icon-btn" onClick={addShortcut} title="Add a new shortcut">＋ Key</button>
              <button className="icon-btn" onClick={addPage} title="Add page">＋ Page</button>
              {pages.length > 1 && (
                <button
                  className="icon-btn danger"
                  onClick={() => {
                    if (window.confirm('Delete this page?')) deletePage(currentPageId)
                  }}
                  title="Delete page"
                >
                  🗑
                </button>
              )}
            </div>
          )}
        </div>
      </header>
      {panelOpen && <ConnectPanel onClose={() => setPanelOpen(false)} />}
    </>
  )
}
