import { useStore } from '../store'
import { KeyFace } from './KeyFace'
import type { KeyConfig } from '../types'

function GridKey({ index, cfg }: { index: number; cfg: KeyConfig | null }) {
  const editMode = useStore((s) => s.editMode)
  const rt = useStore((s) => (cfg ? s.runtime[cfg.id] : undefined))
  const press = useStore((s) => s.press)
  const select = useStore((s) => s.select)
  const addKey = useStore((s) => s.addKey)

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
        'gkey' + (cfg ? '' : ' ghost') + (editMode ? ' edit' : '')
      }
      onClick={onTap}
    >
      {cfg || editMode ? (
        <KeyFace cfg={cfg} rt={rt} editMode={editMode} />
      ) : null}
      {!cfg && editMode && <span className="gkey-plus">＋</span>}
    </button>
  )
}

export function GridMode() {
  const page = useStore((s) => s.pages.find((p) => p.id === s.currentPageId) ?? s.pages[0])

  return (
    <div className="grid-wrap">
      <div className="grid-bg">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
      </div>
      <div className="grid">
        {page.keys.map((k, i) => (
          <GridKey key={i} index={i} cfg={k} />
        ))}
      </div>
    </div>
  )
}
