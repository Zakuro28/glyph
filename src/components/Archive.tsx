import { motion } from 'motion/react'
import { Check, X } from 'lucide-react'
import Modal from './Modal'
import { dateOf } from '../lib/storage'
import { dailyHref, type Game } from '../lib/route'

export type DayStatus = 'won' | 'lost' | 'playing' | null

const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })

/** Every daily puzzle so far, newest first, marked solved, missed or started */
export default function Archive({ open, onClose, game, today, current, status }: { open: boolean; onClose: () => void; game: Game; today: number; current: number; status: (day: number) => DayStatus }) {
  const days = Array.from({ length: today + 1 }, (_, i) => today - i)
  const done = days.filter((d) => status(d) === 'won').length

  return (
    <Modal open={open} onClose={onClose} title="Archive" wide>
      <p className="mt-1 text-sm text-sub">
        {done} of {days.length} solved. Past puzzles don’t change your streak.
      </p>
      <ul className="-mx-1 mt-4 grid max-h-[55dvh] grid-cols-3 gap-2 overflow-y-auto p-1 sm:grid-cols-4">
        {days.map((d, i) => {
          const s = status(d)
          const on = d === current
          return (
            <motion.li key={d} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: Math.min(i, 16) * 0.02 }}>
              <a
                href={dailyHref(game, d, today)}
                onClick={onClose}
                aria-current={on ? 'true' : undefined}
                className={`press flex flex-col rounded-2xl p-3 ring-1 ${on ? 'bg-raise ring-accent/60' : 'ring-line hover:bg-raise'}`}
              >
                <span className="flex items-center justify-between">
                  <span className="font-mono text-lg font-medium">#{d + 1}</span>
                  {s === 'won' && <Check className="size-4 text-accent" aria-label="Solved" />}
                  {s === 'lost' && <X className="size-4 text-bad" aria-label="Missed" />}
                  {s === 'playing' && <span className="size-2 rounded-full bg-warn" aria-label="Started" />}
                </span>
                <span className="mt-0.5 text-xs text-sub">{d === today ? 'Today' : fmt.format(dateOf(d))}</span>
              </a>
            </motion.li>
          )
        })}
      </ul>
    </Modal>
  )
}
