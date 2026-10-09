import { useEffect, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import Modal from './Modal'

const EASE = [0.23, 1, 0.32, 1] as const

/** Time left until the next daily puzzles */
export function Countdown() {
  const left = () => {
    const now = new Date()
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    return Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000))
  }
  const [s, setS] = useState(left)
  useEffect(() => {
    const id = setInterval(() => setS(left()), 1000)
    return () => clearInterval(id)
  }, [])
  const p = (n: number) => String(n).padStart(2, '0')
  return (
    <div className="text-center">
      <p className="text-xs text-sub">Next puzzle in</p>
      <span className="font-mono text-2xl tabular-nums">{`${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`}</span>
    </div>
  )
}

export type Bar = { label: string; n: number }

/** Stats for a game: four headline numbers, an optional bar chart, then whatever actions fit (share, next puzzle) */
export default function StatsModal({ open, onClose, title, note, numbers, barsTitle, bars, highlight, board, footer }: { open: boolean; onClose: () => void; title: string; note?: ReactNode; numbers: [string, string | number][]; barsTitle?: string; bars?: Bar[]; highlight?: number | null; board?: ReactNode; footer?: ReactNode }) {
  const most = Math.max(...(bars ?? []).map((b) => b.n), 1)
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {note && <p className="mt-1 text-sm text-sub">{note}</p>}
      <dl className="mt-5 grid grid-cols-4 gap-2 text-center">
        {numbers.map(([label, n]) => (
          <div key={label}>
            <dd className="font-mono text-3xl font-medium tabular-nums">{n}</dd>
            <dt className="mt-1 text-xs leading-tight text-sub">{label}</dt>
          </div>
        ))}
      </dl>

      {bars && (
        <>
          <h3 className="mt-7 text-sm font-semibold text-sub">{barsTitle}</h3>
          <ol className="mt-3 grid grid-cols-[max-content_1fr] items-center gap-x-2.5 gap-y-1.5">
            {bars.map((b, i) => (
              <li key={b.label} className="contents font-mono text-sm">
                <span className="text-right text-xs whitespace-nowrap text-sub">{b.label}</span>
                <div className="flex-1">
                  <motion.div
                    className={`flex h-6 min-w-7 origin-left items-center justify-end rounded-md px-2 font-semibold ${highlight === i ? 'bg-accent text-bg' : 'bg-raise text-text'}`}
                    style={{ width: `${(b.n / most) * 100}%` }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5, ease: EASE, delay: 0.1 + i * 0.05 }}
                  >
                    {b.n}
                  </motion.div>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      {board && (
        <>
          <h3 className="mt-7 text-sm font-semibold text-sub">Today’s leaderboard</h3>
          <div className="mt-3">{board}</div>
        </>
      )}

      {footer && <div className="mt-7 flex flex-col items-center gap-4 border-t border-line pt-6">{footer}</div>}
    </Modal>
  )
}
