import { ANSWERS } from '../data/answers'
import type { Mark } from '../lib/card'
import { pickDaily } from '../lib/stats'
import { load } from '../lib/storage'
import type { DayStatus } from '../components/Archive'

export type { Mark }

/** Green for the right spot, yellow for elsewhere in the word. Repeated letters only light up as many times as the answer has them. */
export function score(guess: string, answer: string): Mark[] {
  const marks: Mark[] = Array(5).fill('absent')
  const left: Record<string, number> = {}
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) marks[i] = 'correct'
    else left[answer[i]] = (left[answer[i]] ?? 0) + 1
  }
  for (let i = 0; i < 5; i++) {
    if (marks[i] !== 'correct' && left[guess[i]]) {
      marks[i] = 'present'
      left[guess[i]]--
    }
  }
  return marks
}

/** The day's word: steps through the list in a scrambled order, so no word repeats until all have been used */
export const dailyAnswer = (day: number) => pickDaily(ANSWERS, day, 389)

export const randomAnswer = (not?: string) => {
  let w = not
  while (w === not) w = ANSWERS[Math.floor(Math.random() * ANSWERS.length)]
  return w!
}

/** The guesses that are real words (loaded separately so the Type game stays light) */
export const loadValid = () => import('../data/guesses.txt?raw').then((m) => new Set(m.default.split('\n')))

export const PRAISE = ['Genius', 'Magnificent', 'Impressive', 'Splendid', 'Great', 'Phew']

export const shareText = (guesses: string[], answer: string, label: string, won: boolean) =>
  `glyph word ${label} ${won ? guesses.length : 'X'}/6\n\n` +
  guesses.map((g) => score(g, answer).map((m) => (m === 'correct' ? '🟩' : m === 'present' ? '🟨' : '⬛')).join('')).join('\n')


/** How a daily Word went, for the archive */
export function wordStatus(day: number): DayStatus {
  const g = load<string[]>(`word:d${day}`, [])
  if (g.at(-1) === dailyAnswer(day)) return 'won'
  return g.length >= 6 ? 'lost' : g.length ? 'playing' : null
}
