import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { BarChart3, CalendarDays } from 'lucide-react'

/** The row above each daily game: Daily or Practice, then the archive and stats buttons */
export default function DailyBar({ id, kind, onKind, dailyLabel, onArchive, onStats, extra, locked = false }: { id: string; kind: 'daily' | 'practice'; onKind: (k: 'daily' | 'practice') => void; dailyLabel: string; onArchive: () => void; onStats: () => void; extra?: ReactNode; locked?: boolean }) {
  const icon = 'press grid size-9 shrink-0 place-items-center rounded-full text-sub ring-1 ring-line hover:text-text'
  return (
    <div className="flex w-full items-center gap-2">
      <div className="flex rounded-full bg-panel p-1 text-sm ring-1 ring-line">
        {(['daily', 'practice'] as const).map((k) => (
          <button
            key={k}
            type="button"
            disabled={locked}
            onClick={() => onKind(k)}
            aria-pressed={kind === k}
            className={`press relative isolate rounded-full px-3.5 py-1.5 font-medium whitespace-nowrap ${kind === k ? 'text-text' : 'text-sub hover:text-text'}`}
          >
            {kind === k && <motion.span layoutId={`${id}-kind`} className="absolute inset-0 -z-10 rounded-full bg-raise" transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }} />}
            {k === 'daily' ? dailyLabel : 'Practice'}
          </button>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-2">
        {extra}
        <button type="button" onClick={onArchive} aria-label="Archive of past puzzles" className={icon}>
          <CalendarDays className="size-4" />
        </button>
        <button type="button" onClick={onStats} aria-label="Show stats" className={icon}>
          <BarChart3 className="size-4" />
        </button>
      </div>
    </div>
  )
}
