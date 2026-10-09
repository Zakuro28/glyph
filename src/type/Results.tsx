import { useEffect, useRef } from 'react'
import { animate, motion } from 'motion/react'
import { Flame, RotateCcw, Trophy } from 'lucide-react'
import ShareBar from '../components/ShareBar'
import { useToast } from '../components/Toast'
import { liveStreak, type Streak } from '../lib/storage'
import { win } from '../lib/sound'
import { modeLabel, type Result } from './engine'
import Chart from './Chart'

const EASE = [0.23, 1, 0.32, 1] as const

/** A number that counts up once when the results appear */
function Count({ to, className }: { to: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const c = animate(0, to, { duration: 0.7, ease: EASE, onUpdate: (v) => ref.current && (ref.current.textContent = String(Math.round(v))) })
    return () => c.stop()
  }, [to])
  return (
    <span ref={ref} className={className}>
      {Math.round(to)}
    </span>
  )
}

export default function Results({ result: r, prevBest, streak, onNext }: { result: Result; prevBest: number; streak: Streak; onNext: () => void }) {
  const [toast, show] = useToast()
  const wpm = Math.round(r.wpm)
  const isBest = wpm > prevBest && wpm > 0
  const days = liveStreak(streak)
  const beatBest = isBest && prevBest > 0

  // A little fanfare for beating your best
  useEffect(() => {
    if (beatBest) win()
  }, [beatBest])

  const stats: [string, string, string?][] = [
    ['raw', String(Math.round(r.raw))],
    ['characters', `${r.chars.correct}/${r.chars.incorrect}/${r.chars.extra}/${r.chars.missed}`, 'correct / incorrect / extra / missed'],
    ['consistency', `${r.consistency}%`],
    ['time', `${Math.round(r.seconds)}s`],
  ]

  const fade = (i: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, ease: EASE, delay: 0.05 + i * 0.06 } })

  return (
    <div className="flex flex-1 flex-col justify-center gap-10 py-8">
      {toast}
      <div className="grid items-center gap-8 md:grid-cols-[auto_1fr] md:gap-12">
        <div className="flex gap-10 md:flex-col md:gap-5">
          <motion.div {...fade(0)}>
            <p className="text-sm text-sub">wpm</p>
            <Count to={r.wpm} className="block font-mono text-7xl leading-none font-medium text-accent tabular-nums" />
          </motion.div>
          <motion.div {...fade(1)}>
            <p className="text-sm text-sub">acc</p>
            <p className="font-mono text-5xl leading-none font-medium tabular-nums">
              <Count to={r.acc} />%
            </p>
          </motion.div>
        </div>
        <motion.div {...fade(2)}>
          <Chart samples={r.samples} />
        </motion.div>
      </div>

      <motion.dl {...fade(3)} className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-5">
        <div>
          <dt className="text-sm text-sub">test type</dt>
          <dd className="mt-1 font-mono text-lg text-text">{modeLabel(r.mode)}</dd>
        </div>
        {stats.map(([label, value, hint]) => (
          <div key={label} title={hint}>
            <dt className="text-sm text-sub">{label}</dt>
            <dd className="mt-1 font-mono text-lg text-text tabular-nums">{value}</dd>
          </div>
        ))}
      </motion.dl>

      <motion.div {...fade(4)} className="flex flex-wrap items-center gap-2">
        {isBest && (
          <motion.span
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.35, delay: 0.5 }}
            className="flex items-center gap-1.5 rounded-full bg-accent/12 px-3 py-1.5 text-sm font-medium text-accent ring-1 ring-accent/30"
          >
            <Trophy className="size-4" aria-hidden /> {prevBest > 0 ? `New best, up from ${prevBest}` : 'First result for this mode'}
          </motion.span>
        )}
        {!isBest && prevBest > 0 && <span className="rounded-full px-3 py-1.5 text-sm text-sub ring-1 ring-line">best {prevBest} wpm</span>}
        {days > 0 && (
          <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-warn ring-1 ring-line">
            <Flame className="size-4" aria-hidden /> {days}-day streak
          </span>
        )}
      </motion.div>

      <motion.div {...fade(5)} className="flex flex-col items-center gap-5 border-t border-line pt-8">
        <button type="button" onClick={onNext} className="press flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-bg hover:bg-accent/90">
          <RotateCcw className="size-4" aria-hidden /> Next test
        </button>
        <ShareBar
          text={`glyph fastype · ${modeLabel(r.mode)}\n${wpm} wpm · ${Math.round(r.acc)}% accuracy`}
          file={`glyph-${wpm}wpm.png`}
          onDone={show}
          card={() => ({
            mode: modeLabel(r.mode),
            headline: String(wpm),
            unit: 'wpm',
            stats: [
              ['accuracy', `${Math.round(r.acc)}%`],
              ['raw', String(Math.round(r.raw))],
              ['consistency', `${r.consistency}%`],
            ],
            chart: r.samples.map((s) => s.wpm),
          })}
        />
        <p className="hidden text-xs text-sub sm:block">
          <kbd className="rounded bg-panel px-1.5 py-0.5 font-mono text-text ring-1 ring-line">tab</kbd> or <kbd className="rounded bg-panel px-1.5 py-0.5 font-mono text-text ring-1 ring-line">enter</kbd> next test
        </p>
      </motion.div>
    </div>
  )
}
