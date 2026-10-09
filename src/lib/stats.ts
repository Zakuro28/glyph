// Win/loss records shared by the daily games

export type Stats = { played: number; wins: number; dist: number[]; current: number; best: number; lastDay: number }
export const emptyStats = (buckets: number): Stats => ({ played: 0, wins: 0, dist: Array(buckets).fill(0), current: 0, best: 0, lastDay: -99 })

/** Daily streaks need consecutive days; practice streaks just count wins in a row. `bucket` picks the bar to grow on a win. */
export function record(s: Stats, won: boolean, bucket: number, day: number | null): Stats {
  const dist = [...s.dist]
  if (won) dist[bucket] = (dist[bucket] ?? 0) + 1
  const current = !won ? 0 : day === null ? s.current + 1 : s.lastDay === day - 1 ? s.current + 1 : 1
  return { played: s.played + 1, wins: s.wins + (won ? 1 : 0), dist, current, best: Math.max(s.best, current), lastDay: day ?? s.lastDay }
}

/** A daily streak only stands if yesterday or today was won */
export const liveCurrent = (s: Stats, today: number, daily: boolean) => (daily && s.lastDay < today - 1 ? 0 : s.current)

export const winRate = (s: Stats) => (s.played ? Math.round((s.wins / s.played) * 100) : 0)

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)

/** Picks the day's puzzle from a list in a scrambled order that uses every entry before repeating */
export function pickDaily<T>(list: T[], day: number, seed: number): T {
  const n = list.length
  let step = seed
  while (gcd(step, n) !== 1) step++
  return list[(((day * step + seed) % n) + n) % n]
}
