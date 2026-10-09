import { motion } from 'motion/react'
import { ArrowRight, Check, Flame, Grid3x3, Keyboard, LetterText, Link2, type LucideIcon } from 'lucide-react'
import type { DayStatus } from './components/Archive'
import { emptyStats, liveCurrent, type Stats } from './lib/stats'
import { dateOf, dayNumber, liveStreak, load, type Streak } from './lib/storage'
import type { Game } from './lib/route'
import { linkStatus } from './link/logic'
import { clock, emptyTimes, miniStatus, type Times } from './mini/logic'
import { wordStatus } from './word/logic'

const EASE = [0.23, 1, 0.32, 1] as const

type Card = { id: Game; name: string; blurb: string; icon: LucideIcon; tint: string }

const CARDS: Card[] = [
  { id: 'type', name: 'Type', blurb: 'How fast can you type? Race the clock and beat your best.', icon: Keyboard, tint: 'bg-accent/15 text-accent' },
  { id: 'word', name: 'Word', blurb: 'Guess the five-letter word in six tries.', icon: LetterText, tint: 'bg-warn/15 text-warn' },
  { id: 'link', name: 'Link', blurb: 'Sort sixteen words into four hidden groups.', icon: Link2, tint: 'bg-l2/15 text-l2' },
  { id: 'mini', name: 'Mini', blurb: 'A pocket crossword you can finish over coffee.', icon: Grid3x3, tint: 'bg-l3/15 text-l3' },
]

const fmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

/** What each card says about today: solved, started, or waiting, plus a streak */
function summary(id: Game, today: number): { status: DayStatus | 'none'; line: string; streak: number } {
  if (id === 'type') {
    const best = Math.max(0, ...Object.values(load<Record<string, number>>('type:best', {})))
    return { status: 'none', line: best ? `Best ${best} wpm` : 'Warm up your fingers', streak: liveStreak(load<Streak>('type:streak', { current: 0, best: 0, lastDay: -99 }), today) }
  }
  const status = id === 'word' ? wordStatus(today) : id === 'link' ? linkStatus(today) : miniStatus(today)
  const streak = id === 'mini' ? liveCurrent(load<Stats>('mini:stats', emptyStats(1)), today, true) : liveCurrent(load<Stats>(`${id}:stats`, emptyStats(4)), today, true)
  if (id === 'mini' && status === 'won') {
    const s = load<{ seconds: number } | null>(`mini:d${today}`, null)
    return { status, line: `Solved in ${clock(s?.seconds ?? 0)}`, streak }
  }
  const line = status === 'won' ? 'Solved today' : status === 'lost' ? 'Played today' : status === 'playing' ? 'In progress' : id === 'mini' && load<Times>('mini:times', emptyTimes).best !== null ? `Best ${clock(load<Times>('mini:times', emptyTimes).best!)}` : 'New puzzle today'
  return { status, line, streak }
}

/** The front door: pick a game */
export default function Home() {
  const today = dayNumber()
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center py-8 sm:py-12">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}>
        <p className="text-sm text-sub">
          {fmt.format(dateOf(today))} · Daily #{today + 1}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">What do you feel like playing?</h1>
      </motion.div>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-4">
        {CARDS.map((c, i) => {
          const s = summary(c.id, today)
          return (
            <motion.li key={c.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE, delay: 0.06 + i * 0.05 }}>
              <a
                href={`#/${c.id}`}
                className="group flex h-full gap-4 rounded-3xl bg-panel p-4 ring-1 ring-line transition-[transform,background-color,box-shadow] duration-200 sm:flex-col sm:p-6 active:scale-[0.98] pointer-fine:hover:-translate-y-1 pointer-fine:hover:bg-[#1b1e21] pointer-fine:hover:ring-[#363b41]"
              >
                <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${c.tint}`}>
                  <c.icon className="size-6" aria-hidden />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-lg font-semibold sm:text-xl">{c.name}</span>
                    <ArrowRight className="size-4 text-sub transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5 group-hover:text-text" aria-hidden />
                  </span>
                  <span className="mt-1 text-sm leading-snug text-sub">{c.blurb}</span>
                  <span className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium sm:mt-5">
                    <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 ${s.status === 'won' ? 'bg-accent/12 text-accent' : s.status === 'playing' ? 'bg-warn/12 text-warn' : 'bg-raise text-sub'}`}>
                      {s.status === 'won' && <Check className="size-3.5" aria-hidden />}
                      {s.line}
                    </span>
                    {s.streak > 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-raise px-2.5 py-1 text-warn">
                        <Flame className="size-3.5" aria-hidden /> {s.streak} day{s.streak === 1 ? '' : 's'}
                      </span>
                    )}
                  </span>
                </span>
              </a>
            </motion.li>
          )
        })}
      </ul>
    </div>
  )
}
