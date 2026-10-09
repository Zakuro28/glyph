import { useState } from 'react'
import { motion } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Modal from './Modal'
import DailyBoard from './DailyBoard'
import { usePlayer, type DailyGame } from '../lib/online'
import { dateOf } from '../lib/storage'

const TABS: { id: DailyGame; label: string }[] = [
  { id: 'word', label: 'Wordl' },
  { id: 'link', label: 'Connect4' },
  { id: 'mini', label: 'MiniCross' },
]
const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })

/** The fastest finishers of each daily puzzle, for everyone */
export default function LeaderboardModal({ open, onClose, game: start, today }: { open: boolean; onClose: () => void; game: DailyGame; today: number }) {
  const player = usePlayer()
  const [game, setGame] = useState<DailyGame>(start)
  const [day, setDay] = useState(today)

  return (
    <Modal open={open} onClose={onClose} title="Daily leaderboard" wide>
      <p className="mt-1 text-sm text-sub">Fastest solves of each day’s puzzle. Practice and archive games don’t count.</p>
      <div className="mt-4 flex gap-1 rounded-full bg-bg p-1 ring-1 ring-line">
        {TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setGame(t.id)} className={`press relative isolate flex-1 rounded-full py-1.5 text-sm font-medium ${game === t.id ? 'text-bg' : 'text-sub hover:text-text'}`}>
            {game === t.id && <motion.span layoutId="lb-game" className="absolute inset-0 -z-10 rounded-full bg-accent" transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }} />}
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button type="button" onClick={() => setDay((d) => Math.max(0, d - 1))} disabled={day === 0} aria-label="Earlier day" className="press grid size-9 place-items-center rounded-full text-sub ring-1 ring-line hover:text-text disabled:opacity-30">
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-sm font-medium">
          Daily #{day + 1} <span className="text-sub">· {day === today ? 'Today' : fmt.format(dateOf(day))}</span>
        </p>
        <button type="button" onClick={() => setDay((d) => Math.min(today, d + 1))} disabled={day === today} aria-label="Later day" className="press grid size-9 place-items-center rounded-full text-sub ring-1 ring-line hover:text-text disabled:opacity-30">
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="mt-3 min-h-40">
        <DailyBoard game={game} day={day} />
      </div>
      {player && <p className="mt-4 text-center text-xs text-sub">Playing as {player.name}</p>}
    </Modal>
  )
}
