import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Crown, LoaderCircle } from 'lucide-react'
import { fetchDaily, usePlayer, type DailyGame, type Score } from '../lib/online'
import { clock } from '../mini/logic'

const extraText = (game: DailyGame, n: number | null) => (n === null ? '' : game === 'word' ? `${n}/6` : n === 0 ? 'perfect' : `${n} ${n === 1 ? 'miss' : 'misses'}`)

/** One daily puzzle's leaderboard, fastest first, with your own row picked out */
export default function DailyBoard({ game, day, refresh = 0, max = 50 }: { game: DailyGame; day: number; refresh?: number; max?: number }) {
  const me = usePlayer()
  const id = `${game}:${day}:${refresh}`
  const [loaded, setLoaded] = useState<{ id: string; rows: Score[] } | null>(null)
  const rows = loaded?.id === id ? loaded.rows : null

  useEffect(() => {
    let live = true
    fetchDaily(game, day).then((r) => live && setLoaded({ id: `${game}:${day}:${refresh}`, rows: r }))
    return () => {
      live = false
    }
  }, [game, day, refresh])

  if (rows === null)
    return (
      <div className="grid h-40 place-items-center text-sub">
        <LoaderCircle className="size-5 animate-spin" aria-label="Loading leaderboard" />
      </div>
    )
  if (!rows.length) return <p className="grid h-40 place-items-center text-center text-sm text-sub">No one has finished this one yet. Be the first.</p>

  const mine = rows.findIndex((r) => r.player === me?.id)
  const shown = rows.slice(0, max)
  return (
    <ol className="max-h-[42dvh] space-y-1 overflow-y-auto pr-1">
      {shown.map((r, i) => {
        const isMe = i === mine
        return (
          <motion.li
            key={`${r.player}-${i}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: Math.min(i, 12) * 0.025 }}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${isMe ? 'bg-accent/12 ring-1 ring-accent/40' : i % 2 ? '' : 'bg-bg/60'}`}
          >
            <span className={`w-6 text-right font-mono text-sm ${i < 3 ? 'text-warn' : 'text-sub'}`}>{i + 1}</span>
            <span className="flex min-w-0 flex-1 items-center gap-1.5 font-medium">
              <span className="truncate">{r.name}</span>
              {i === 0 && <Crown className="size-3.5 shrink-0 text-warn" aria-label="Fastest" />}
              {isMe && <span className="shrink-0 text-xs text-accent">you</span>}
            </span>
            <span className="text-xs text-sub">{extraText(game, r.extra)}</span>
            <span className="w-12 text-right font-mono text-sm tabular-nums">{clock(r.seconds)}</span>
          </motion.li>
        )
      })}
      {mine >= max && <li className="px-3 pt-2 text-center text-xs text-sub">You’re #{mine + 1} on this one</li>}
    </ol>
  )
}
