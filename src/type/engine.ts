import { COMMON } from '../data/words'

export type Mode = { kind: 'time' | 'words'; n: number }
export const modeKey = (m: Mode) => `${m.kind}-${m.n}`
export const modeLabel = (m: Mode) => (m.kind === 'time' ? `time ${m.n}s` : `${m.n} words`)

/** Random common words, never the same word twice in a row */
export function makeWords(count: number, after?: string) {
  const out: string[] = []
  let last = after
  while (out.length < count) {
    const w = COMMON[Math.floor(Math.random() * COMMON.length)]
    if (w !== last) out.push((last = w))
  }
  return out
}

export type Chars = { correct: number; incorrect: number; extra: number; missed: number }

/** Counts letters by kind, plus the characters that count toward WPM (fully correct words and their spaces) */
export function tally(words: string[], typed: string[], cur: number) {
  const chars: Chars = { correct: 0, incorrect: 0, extra: 0, missed: 0 }
  let good = 0
  for (let i = 0; i <= cur && i < words.length; i++) {
    const w = words[i]
    const t = typed[i] ?? ''
    for (let j = 0; j < Math.max(w.length, t.length); j++) {
      if (j >= w.length) chars.extra++
      else if (j >= t.length) {
        if (i < cur) chars.missed++
      } else if (t[j] === w[j]) chars.correct++
      else chars.incorrect++
    }
    if (i < cur && t === w) good += w.length + 1
    if (i === cur && w.startsWith(t)) good += t.length
  }
  return { chars, good }
}

export const wpmOf = (chars: number, seconds: number) => (seconds > 0 ? chars / 5 / (seconds / 60) : 0)

export type Sample = { t: number; wpm: number; raw: number; errors: number }

export type Result = {
  mode: Mode
  wpm: number
  raw: number
  acc: number
  consistency: number
  seconds: number
  chars: Chars
  samples: Sample[]
}

/** Steadiness of the raw speed second to second: 100 means perfectly even */
export function consistency(raws: number[]) {
  if (raws.length < 2) return 100
  const mean = raws.reduce((a, b) => a + b, 0) / raws.length
  if (!mean) return 0
  const sd = Math.sqrt(raws.reduce((a, b) => a + (b - mean) ** 2, 0) / raws.length)
  return Math.max(0, Math.round(100 * (1 - sd / mean)))
}
