import { LINKS, type LinkPuzzle } from '../data/links'
import type { DayStatus } from '../components/Archive'
import { pickDaily } from '../lib/stats'
import { load } from '../lib/storage'

export type { LinkPuzzle }

/** One Link game: the tile order on screen, groups found (in order), mistakes, and every guess for sharing */
export type LinkState = { order: string[]; solved: number[]; mistakes: number; guesses: string[][] }

export const MAX_MISTAKES = 4
export const LEVEL_BG = ['bg-l0', 'bg-l1', 'bg-l2', 'bg-l3']
export const LEVEL_HEX = ['#f0cf65', '#8be9c1', '#8fb4ff', '#c3a6ff']
const EMOJI = ['🟨', '🟩', '🟦', '🟪']

export const dailyIndex = (day: number) => LINKS.indexOf(pickDaily(LINKS, day, 17))

export function shuffle<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const fresh = (p: LinkPuzzle): LinkState => ({ order: shuffle(p.flatMap((g) => g.words)), solved: [], mistakes: 0, guesses: [] })

export const groupOf = (p: LinkPuzzle, word: string) => p.findIndex((g) => g.words.includes(word))

export const statusOf = (s: LinkState): 'won' | 'lost' | 'playing' => (s.solved.length === 4 ? 'won' : s.mistakes >= MAX_MISTAKES ? 'lost' : 'playing')

export function linkStatus(day: number): DayStatus {
  const s = load<LinkState | null>(`link:d${day}`, null)
  if (!s || !s.guesses.length) return null
  const st = statusOf(s)
  return st === 'playing' ? 'playing' : st
}

/** Each guess as a row of colored squares, one per word, colored by the group it really belongs to */
export const guessColors = (p: LinkPuzzle, guesses: string[][]) => guesses.map((g) => g.map((w) => LEVEL_HEX[p[groupOf(p, w)].level]))

export const shareText = (p: LinkPuzzle, s: LinkState, label: string) =>
  `glyph connect4 ${label}\n\n` + s.guesses.map((g) => g.map((w) => EMOJI[p[groupOf(p, w)].level]).join('')).join('\n')

export const MISS_LABELS = ['Perfect', '1 miss', '2 misses', '3 misses']
