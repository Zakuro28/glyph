import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ChevronLeft, ChevronRight, Crown, LoaderCircle } from 'lucide-react'
import Modal from './Modal'
import { leaderboard, useAccount, type Row } from '../lib/online'
import { GAMES, type Game } from '../lib/route'
import { dateOf } from '../lib/storage'
import { clock } from '../mini/logic'

const TYPE_BOARDS = ['time-15', 'time-30', 'time-60', 'words-10', 'words-25', 'words-50']
const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })

const scoreText = (game: Game, n: number) => (game === 'type' ? `${n} wpm` : game === 'word' ? `${n}/6` : game === 'link' ? (n ? `${n} ${n === 1 ? 'miss' : 'misses'}` : 'Perfect') : clock(n))

/** Typing bests per mode, and each daily puzzle's board */
export default function LeaderboardModal({ open, onClose, game: start, today }: { open: boolean; onClose: () => void; game: Game; today: number }) {
  const account = useAccount()
  const [game, setGame] = useState<Game>(start)
  const [typeBoard, setTypeBoard] = useState('time-30')
  const [day, setDay] = useState(today)
  const board = game === 'type' ? typeBoard : `daily-${day + 1}`
  // Results are kept with the board they belong to, so switching boards shows the spinner until the new ones land
  const [loaded, setLoaded] = useState<{ id: string; rows: Row[] } | null>(null)
  const id = `${game}:${board}`
  const rows = loaded?.id === id ? loaded.rows : null

  useEffect(() => {
    if (!open) return
    let live = true
    leaderboard(game, board).then((r) => live && setLoaded({ id: `${game}:${board}`, rows: r }))
    return () => {
      live = false
    }
  }, [open, game, board])

  const chip = (on: boolean) => `press rounded-full px-3 py-1.5 text-sm font-medium ${on ? 'bg-raise text-text' : 'text-sub hover:text-text'}`

  return (
    <Modal open={open} onClose={onClose} title="Leaderboards" wide>
      <div className="mt-4 flex gap-1 rounded-full bg-bg p-1 ring-1 ring-line">
        {GAMES.map((g) => (
          <button key={g.id} type="button" onClick={() => setGame(g.id)} className={`press relative isolate flex-1 rounded-full py-1.5 text-sm font-medium ${game === g.id ? 'text-bg' : 'text-sub hover:text-text'}`}>
            {game === g.id && <motion.span layoutId="lb-game" className="absolute inset-0 -z-10 rounded-full bg-accent" transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }} />}
            {g.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex min-h-10 flex-wrap items-center gap-1">
        {game === 'type' ? (
          TYPE_BOARDS.map((b) => (
            <button key={b} type="button" onClick={() => setTypeBoard(b)} className={chip(typeBoard === b)}>
              {b.replace('time-', '').replace('words-', '')}
              {b.startsWith('time') ? 's' : ' words'}
            </button>
          ))
        ) : (
          <div className="flex w-full items-center justify-between">
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
        )}
      </div>

      <div className="mt-3 min-h-64">
        {rows === null ? (
          <div className="grid h-64 place-items-center text-sub">
            <LoaderCircle className="size-5 animate-spin" aria-label="Loading" />
          </div>
        ) : rows.length === 0 ? (
          <p className="grid h-64 place-items-center text-center text-sm text-sub">No results yet. Be the first.</p>
        ) : (
          <ol className="max-h-[50dvh] space-y-1 overflow-y-auto pr-1">
            {rows.map((r, i) => {
              const me = account?.username === r.username
              return (
                <motion.li
                  key={r.username}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: Math.min(i, 12) * 0.025 }}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${me ? 'bg-accent/12 ring-1 ring-accent/40' : i % 2 ? '' : 'bg-bg/60'}`}
                >
                  <span className={`w-6 text-right font-mono text-sm ${i < 3 ? 'text-warn' : 'text-sub'}`}>{i + 1}</span>
                  <span className="flex flex-1 items-center gap-1.5 truncate font-medium">
                    {r.username}
                    {i === 0 && <Crown className="size-3.5 text-warn" aria-label="First place" />}
                  </span>
                  <span className="font-mono text-sm tabular-nums">{scoreText(game, Number(r.score))}</span>
                </motion.li>
              )
            })}
          </ol>
        )}
      </div>
      {!account && <p className="mt-4 text-center text-xs text-sub">Sign in from the account button to post your results.</p>}
    </Modal>
  )
}
