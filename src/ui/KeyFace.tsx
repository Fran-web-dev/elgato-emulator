import type { KeyConfig, ObsStatus, RuntimeState } from '../types'
import { contrastFg, formatSeconds, keyActive } from '../types'

interface Props {
  cfg: KeyConfig | null
  rt?: RuntimeState
  obsStatus: ObsStatus
  editMode: boolean
}

export function KeyFace({ cfg, rt, obsStatus, editMode }: Props) {
  const a = cfg?.action
  const timerOn = !!rt?.timerRunning
  const timerDone = !!rt?.timerDone
  const active = cfg ? keyActive(cfg, obsStatus, rt) : false

  let bg = cfg?.bg ?? (editMode ? '#1a1e28' : '#12141b')
  if (a?.kind === 'toggle' && rt?.toggleOn) bg = '#16a34a'
  if (timerDone) bg = '#dc2626'
  if (timerOn) bg = '#0284c7'
  const fg = contrastFg(bg)

  return (
    <div className="keyface" style={{ background: bg, color: fg }}>
      {cfg?.iconImage ? (
        <img className="keyface-img" src={cfg.iconImage} alt="" />
      ) : a?.kind === 'timer' && (timerOn || timerDone) ? (
        <>
          <span className="keyface-big">{formatSeconds(rt?.timerLeft ?? 0)}</span>
          <span className="keyface-sub">{timerDone ? 'DONE' : 'running'}</span>
        </>
      ) : a?.kind === 'counter' && (rt?.counter ?? 0) > 0 ? (
        <>
          <span className="keyface-big">{rt?.counter}</span>
          <span className="keyface-sub">{cfg?.label}</span>
        </>
      ) : (
        <>
          {cfg?.icon && <span className="keyface-icon">{cfg.icon}</span>}
          {cfg?.label && <span className="keyface-label">{cfg.label}</span>}
        </>
      )}
      {active && <span className="keyface-active" />}
    </div>
  )
}
