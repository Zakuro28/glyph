import { MINIS, type Mini } from '../data/minis'
import type { DayStatus } from '../components/Archive'
import { pickDaily } from '../lib/stats'
import { load } from '../lib/storage'

export type Dir = 'a' | 'd'
export type Entry = { num: number; dir: Dir; cells: number[]; answer: string; clue: string }
export type Board = { size: number; solution: (string | null)[]; nums: (number | null)[]; entries: Entry[] }

/** Numbers the grid the usual way (left to right, top to bottom) and lists every across and down answer */
export function build(p: Mini): Board {
  const size = p.rows.length
  const solution = p.rows.join('').split('').map((ch) => (ch === '#' ? null : ch))
  const open = (r: number, c: number) => r >= 0 && c >= 0 && r < size && c < size && solution[r * size + c] !== null
  const nums: (number | null)[] = Array(size * size).fill(null)
  const entries: Entry[] = []
  let n = 0
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!open(r, c)) continue
      const startsA = !open(r, c - 1) && open(r, c + 1)
      const startsD = !open(r - 1, c) && open(r + 1, c)
      if (!startsA && !startsD) continue
      nums[r * size + c] = ++n
      for (const dir of ['a', 'd'] as const) {
        if (dir === 'a' ? !startsA : !startsD) continue
        const cells: number[] = []
        for (let k = 0; dir === 'a' ? open(r, c + k) : open(r + k, c); k++) cells.push(dir === 'a' ? r * size + c + k : (r + k) * size + c)
        const answer = cells.map((i) => solution[i]).join('')
        entries.push({ num: n, dir, cells, answer, clue: p.clues[answer] ?? '' })
      }
    }
  }
  return { size, solution, nums, entries }
}

/** Progress on one mini: letters typed, seconds spent, whether it's solved and whether help was used */
export type MiniState = { fill: string[]; seconds: number; done: boolean; assisted: boolean; revealed: number[]; wrong: number[] }
export const freshMini = (b: Board): MiniState => ({ fill: b.solution.map(() => ''), seconds: 0, done: false, assisted: false, revealed: [], wrong: [] })

export const dailyMini = (day: number) => pickDaily(MINIS, day, 7)

export function miniStatus(day: number): DayStatus {
  const s = load<MiniState | null>(`mini:d${day}`, null)
  return !s ? null : s.done ? 'won' : s.fill.some(Boolean) ? 'playing' : null
}

export const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export type Times = { best: number | null; total: number; count: number }
export const emptyTimes: Times = { best: null, total: 0, count: 0 }
