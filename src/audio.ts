let ctx: AudioContext | null = null

function ac(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function env(gain: GainNode, t: number, peak: number, dur: number) {
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(peak, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
}

export function playSynth(name: string) {
  const a = ac()
  const t = a.currentTime
  const g = a.createGain()
  g.connect(a.destination)
  if (name === 'chirp') {
    const o = a.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(420, t)
    o.frequency.exponentialRampToValueAtTime(950, t + 0.11)
    env(g, t, 0.25, 0.14)
    o.connect(g)
    o.start(t)
    o.stop(t + 0.16)
  } else if (name === 'kick') {
    const o = a.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(150, t)
    o.frequency.exponentialRampToValueAtTime(38, t + 0.22)
    env(g, t, 0.6, 0.28)
    o.connect(g)
    o.start(t)
    o.stop(t + 0.3)
  } else if (name === 'success') {
    ;[660, 990].forEach((f, i) => {
      const o = a.createOscillator()
      const og = a.createGain()
      o.type = 'triangle'
      o.frequency.value = f
      env(og, t + i * 0.11, 0.22, 0.16)
      o.connect(og)
      og.connect(a.destination)
      o.start(t + i * 0.11)
      o.stop(t + i * 0.11 + 0.2)
    })
    g.disconnect()
  } else {
    const o = a.createOscillator()
    o.type = 'square'
    o.frequency.value = 880
    env(g, t, 0.15, 0.15)
    o.connect(g)
    o.start(t)
    o.stop(t + 0.17)
  }
}

export function playDataUrl(dataUrl: string) {
  fetch(dataUrl)
    .then((r) => r.arrayBuffer())
    .then((b) => ac().decodeAudioData(b))
    .then((buf) => {
      const a = ac()
      const src = a.createBufferSource()
      src.buffer = buf
      src.connect(a.destination)
      src.start()
    })
    .catch(() => {})
}

export function playSound(soundId: string | undefined, fallback?: () => void) {
  if (!soundId) {
    fallback?.()
    return
  }
  if (soundId.startsWith('builtin:')) playSynth(soundId.slice(8))
  else playDataUrl(soundId)
}

export function timerBeep() {
  const a = ac()
  for (let i = 0; i < 3; i++) {
    const t = a.currentTime + i * 0.28
    const o = a.createOscillator()
    const g = a.createGain()
    o.type = 'square'
    o.frequency.value = 1040
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.2, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
    o.connect(g)
    g.connect(a.destination)
    o.start(t)
    o.stop(t + 0.22)
  }
}
