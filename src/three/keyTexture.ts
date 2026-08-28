import type { KeyConfig, RuntimeState } from '../types'
import { contrastFg, formatSeconds } from '../types'

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export interface KeyDrawOpts {
  ghost: boolean
  active: boolean
  editMode: boolean
  pressed: boolean
}

export function drawKey(
  canvas: HTMLCanvasElement,
  cfg: KeyConfig | null,
  rt: RuntimeState | undefined,
  opts: KeyDrawOpts,
  img?: HTMLImageElement | null,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const W = canvas.width
  ctx.clearRect(0, 0, W, W)

  if (!cfg) {
    ctx.fillStyle = opts.editMode ? '#191c24' : '#0d0e12'
    rr(ctx, 0, 0, W, W, 26)
    ctx.fill()
    if (opts.editMode) {
      ctx.fillStyle = '#6b7385'
      ctx.fillRect(W / 2 - 30, W / 2 - 5, 60, 10)
      ctx.fillRect(W / 2 - 5, W / 2 - 30, 10, 60)
    }
    return
  }

  const a = cfg.action
  const timerOn = !!rt?.timerRunning
  const timerDone = !!rt?.timerDone
  let bg = cfg.bg
  if (a.kind === 'toggle' && rt?.toggleOn) bg = '#16a34a'
  if (timerDone) bg = '#dc2626'
  if (timerOn) bg = '#0284c7'
  const fg = contrastFg(bg)

  ctx.fillStyle = bg
  rr(ctx, 0, 0, W, W, 26)
  ctx.fill()

  if (opts.active) {
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'
    ctx.lineWidth = 10
    rr(ctx, 6, 6, W - 12, W - 12, 20)
    ctx.stroke()
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = fg

  if (img && img.complete && img.naturalWidth > 0) {
    const pad = 28
    const box = W - pad * 2
    const scale = Math.min(box / img.naturalWidth, box / img.naturalHeight)
    const w = img.naturalWidth * scale
    const h = img.naturalHeight * scale
    ctx.drawImage(img, (W - w) / 2, (W - h) / 2, w, h)
    if (cfg.label) {
      ctx.font = '600 30px ui-sans-serif, system-ui, sans-serif'
      ctx.fillText(cfg.label, W / 2, W - 42)
    }
    if (opts.pressed) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      rr(ctx, 0, 0, W, W, 26)
      ctx.fill()
    }
    return
  }

  if (a.kind === 'timer' && (timerOn || timerDone)) {
    ctx.font = '700 84px ui-sans-serif, system-ui, sans-serif'
    ctx.fillText(formatSeconds(rt?.timerLeft ?? 0), W / 2, W / 2 - 8)
    ctx.font = '600 26px ui-sans-serif, system-ui, sans-serif'
    ctx.fillText(timerDone ? 'DONE' : 'running', W / 2, W / 2 + 62)
  } else if (a.kind === 'counter' && (rt?.counter ?? 0) > 0) {
    ctx.font = '700 96px ui-sans-serif, system-ui, sans-serif'
    ctx.fillText(String(rt?.counter), W / 2, W / 2 - 10)
    ctx.font = '600 26px ui-sans-serif, system-ui, sans-serif'
    ctx.fillText(cfg.label, W / 2, W / 2 + 66)
  } else {
    if (cfg.icon) {
      ctx.font = '84px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'
      ctx.fillText(cfg.icon, W / 2, W / 2 - 14)
    }
    if (cfg.label) {
      ctx.font = '600 30px ui-sans-serif, system-ui, sans-serif'
      ctx.fillText(cfg.label, W / 2, W - 42)
    }
  }

  if (opts.pressed) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    rr(ctx, 0, 0, W, W, 26)
    ctx.fill()
  }
}
