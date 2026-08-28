import type { KeyConfig, RuntimeState } from '../types'
import { formatSeconds, keyActive } from '../types'

interface Props {
  cfg: KeyConfig | null
  rt?: RuntimeState
}

export function KeyFace({ cfg, rt }: Props) {
  const a = cfg?.action
  const timerOn = !!rt?.timerRunning
  const timerDone = !!rt?.timerDone
  const active = cfg ? keyActive(cfg, rt) : false

  let tile = cfg?.bg ?? '#2b3040'
  if (a?.kind === 'toggle' && rt?.toggleOn) tile = '#16a34a'
  if (timerDone) tile = '#dc2626'
  if (timerOn) tile = '#0284c7'

  const special =
    a?.kind === 'timer' && (timerOn || timerDone)
      ? { big: formatSeconds(rt?.timerLeft ?? 0), sub: timerDone ? 'DONE' : 'running' }
      : a?.kind === 'counter' && (rt?.counter ?? 0) > 0
        ? { big: String(rt?.counter), sub: cfg?.label || '' }
        : null

  if (!cfg) {
    return (
      <div className="keyface glass premium ghost-face">
        <span className="gkey-plus">＋</span>
      </div>
    )
  }

  return (
    <div className="keyface glass premium">
      <span
        className={'key-tile' + (active ? ' on' : '')}
        style={{
          background: `linear-gradient(160deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.06) 42%, rgba(0,0,0,0.10) 78%, rgba(0,0,0,0.22) 100%), ${tile}`,
        }}
      >
        {cfg.iconImage ? (
          <img className="key-tile-img" src={cfg.iconImage} alt="" />
        ) : special ? (
          <span className="key-tile-text">
            <b>{special.big}</b>
            {special.sub && <i>{special.sub}</i>}
          </span>
        ) : (
          <span className="key-tile-icon">{cfg.icon}</span>
        )}
      </span>
      {cfg.label && !special && <span className="keyface-label">{cfg.label}</span>}
      {special?.sub && <span className="keyface-label">{special.sub}</span>}
    </div>
  )
}
