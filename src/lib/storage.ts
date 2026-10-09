import { useCallback, useState } from 'react'

// Everything is kept in this browser. Storage can be blocked (private mode), so every call is guarded.
export function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(`glyph:${key}`)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(`glyph:${key}`, JSON.stringify(value))
  } catch {
    // Storage unavailable: the game still works, it just won't remember
  }
}

export function useStored<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => load(key, fallback))
  const set = useCallback(
    (next: T | ((prev: T) => T)) =>
      setValue((prev) => {
        const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
        save(key, v)
        return v
      }),
    [key],
  )
  return [value, set] as const
}

/** Days since launch (9 Oct 2026 is day 0, shown as Daily #1), in local time so the daily puzzles flip at midnight */
export function dayNumber(d = new Date()) {
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026, 9, 9)) / 86_400_000)
}

/** The calendar date a daily puzzle belongs to */
export const dateOf = (day: number) => new Date(2026, 9, 9 + day)

/** A streak that grows on consecutive days and resets after a missed one */
export type Streak = { current: number; best: number; lastDay: number }

export function bumpStreak(s: Streak, today = dayNumber()): Streak {
  if (s.lastDay === today) return s
  const current = s.lastDay === today - 1 ? s.current + 1 : 1
  return { current, best: Math.max(s.best, current), lastDay: today }
}

/** The streak as it stands today (zero if a day was missed) */
export const liveStreak = (s: Streak, today = dayNumber()) => (s.lastDay >= today - 1 ? s.current : 0)
