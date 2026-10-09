import { load, save } from './storage'

// Every sound is made on the fly with the Web Audio API, so there are no files to load
let ctx: AudioContext | null = null
let noise: AudioBuffer | null = null
let muted = load('muted', false)

export const isMuted = () => muted
export function setMuted(m: boolean) {
  muted = m
  save('muted', m)
}

function audio() {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, { at = 0, dur = 0.12, gain = 0.06, type = 'sine' as OscillatorType, to }: { at?: number; dur?: number; gain?: number; type?: OscillatorType; to?: number } = {}) {
  const c = audio()
  const t = c.currentTime + at
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(c.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

/** A soft mechanical key click: a short burst of filtered noise, slightly different each time */
export function click(error = false) {
  if (muted) return
  const c = audio()
  if (!noise) {
    noise = c.createBuffer(1, c.sampleRate * 0.05, c.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3
  }
  const t = c.currentTime
  const src = c.createBufferSource()
  const f = c.createBiquadFilter()
  const g = c.createGain()
  src.buffer = noise
  f.type = 'bandpass'
  f.frequency.value = error ? 700 : 2200 + Math.random() * 1200
  f.Q.value = 1.1
  g.gain.setValueAtTime(error ? 0.5 : 0.35, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045)
  src.connect(f).connect(g).connect(c.destination)
  src.start(t)
  if (error) tone(150, { dur: 0.08, gain: 0.05, type: 'triangle' })
}

/** One tick per tile as a Word row turns over, rising in pitch */
export function flip(i: number) {
  if (!muted) tone(420 + i * 70, { dur: 0.07, gain: 0.035, type: 'triangle' })
}

export function bump() {
  if (!muted) tone(180, { dur: 0.12, gain: 0.06, type: 'triangle', to: 110 })
}

export function win() {
  if (muted) return
  ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, { at: i * 0.09, dur: 0.28, gain: 0.05 }))
}

export function lose() {
  if (muted) return
  ;[392, 329.63, 261.63].forEach((f, i) => tone(f, { at: i * 0.14, dur: 0.32, gain: 0.05, type: 'triangle' }))
}
