import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useReducedMotion } from 'motion/react'
import { RotateCcw, Shuffle } from 'lucide-react'
import Archive from '../components/Archive'
import DailyBar from '../components/DailyBar'
import ShareBar from '../components/ShareBar'
import StatsModal, { Countdown } from '../components/StatsModal'
import { useToast } from '../components/Toast'
import { LINKS } from '../data/links'
import { keyIsElsewhere } from '../lib/keys'
import DailyBoard from '../components/DailyBoard'
import TimerChip from '../components/TimerChip'
import { online, submitDaily } from '../lib/online'
import { useTimer } from '../lib/timer'
import { clock } from '../mini/logic'
import { bump, click, flip, lose, win } from '../lib/sound'
import { emptyStats, liveCurrent, record, winRate } from '../lib/stats'
import { dayNumber, useStored } from '../lib/storage'
import { LEVEL_BG, MAX_MISTAKES, MISS_LABELS, dailyIndex, fresh, groupOf, guessColors, linkStatus, shareText, shuffle, statusOf, type LinkState } from './logic'

const EASE = [0.23, 1, 0.32, 1] as const
const LAYOUT = { type: 'spring', duration: 0.45, bounce: 0.12 } as const

const randomIndex = (not?: number) => {
  let i = not
  while (i === not) i = Math.floor(Math.random() * LINKS.length)
  return i!
}

export default function LinkGame({ day }: { day: number | null }) {
  const today = dayNumber()
  const dailyDay = day !== null && day < today ? day : today
  const isArchive = dailyDay !== today
  const [savedKind, setKind] = useStored<'daily' | 'practice'>('link:kind', 'daily')
  const kind = isArchive ? 'daily' : savedKind
  const isDaily = kind === 'daily'
  const dailyPuzzle = LINKS[dailyIndex(dailyDay)]
  const [dailyState, setDailyState] = useStored<LinkState>(`link:d${dailyDay}`, fresh(dailyPuzzle))
  const [firstPractice] = useState(randomIndex)
  const [practice, setPractice] = useStored<LinkState & { index: number }>('link:practice', { index: firstPractice, ...fresh(LINKS[firstPractice]) })
  const [dailyStats, setDailyStats] = useStored('link:stats', emptyStats(4))
  const [practiceStats, setPracticeStats] = useStored('link:practice-stats', emptyStats(4))
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [posted, setPosted] = useState(0)
  const [toast, show] = useToast()
  const board = useRef<HTMLDivElement>(null)
  const timers = useRef<number[]>([])
  const reduce = useReducedMotion()

  const puzzle = isDaily ? dailyPuzzle : LINKS[practice.index]
  const state: LinkState = isDaily ? dailyState : practice
  const status = statusOf(state)
  // The clock starts with the first pick and stops when the game ends
  const running = status === 'playing' && (state.guesses.length > 0 || selected.length > 0)
  const [dailySecs] = useTimer(`link:time:d${dailyDay}`, isDaily && running)
  const [practiceSecs, setPracticeSecs] = useTimer('link:time:practice', !isDaily && running)
  const seconds = isDaily ? dailySecs : practiceSecs
  const stats = isDaily ? dailyStats : practiceStats
  const unsolved = puzzle.map((_, i) => i).filter((i) => !state.solved.includes(i))
  // After a loss the missing groups come in one at a time; a game opened already lost shows them all
  const [revealed, setRevealed] = useState(status === 'lost' ? 4 : 0)
  const bars = [...state.solved, ...(status === 'lost' ? unsolved.slice(0, revealed) : [])]
  const tiles = state.order.filter((w) => !bars.includes(groupOf(puzzle, w)))
  const finished = status !== 'playing' && !busy && (status === 'won' || revealed >= unsolved.length)

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))

  const save = (s: LinkState) => (isDaily ? setDailyState(s) : setPractice({ ...s, index: practice.index }))

  const toggle = (w: string) => {
    if (busy || status !== 'playing') return
    if (selected.includes(w)) setSelected(selected.filter((x) => x !== w))
    else if (selected.length < 4) {
      setSelected([...selected, w])
      click()
    }
  }

  const tileEls = (words: string[]) => words.map((w) => board.current?.querySelector<HTMLElement>(`[data-word="${w}"]`)).filter((e): e is HTMLElement => !!e)

  const finish = (next: LinkState, won: boolean) => {
    if (!isDaily) setPracticeStats((s) => record(s, won, next.mistakes, null))
    else if (!isArchive) {
      setDailyStats((s) => record(s, won, next.mistakes, today))
      if (won) void submitDaily('link', today, seconds, next.mistakes).then(() => setPosted((n) => n + 1))
    }
    if (won) {
      win()
      show(next.mistakes === 0 ? 'Perfect!' : next.mistakes === 3 ? 'Phew!' : 'Solved!', 1600)
      later(() => setStatsOpen(true), 1500)
    } else {
      lose()
      const left = 4 - next.solved.length
      for (let k = 1; k <= left; k++) later(() => setRevealed(k), reduce ? 0 : k * 650)
      later(() => setStatsOpen(true), (reduce ? 0 : left * 650) + 1100)
    }
  }

  const evaluate = (picked: string[]) => {
    const groups = picked.map((w) => groupOf(puzzle, w))
    const guesses = [...state.guesses, picked]
    if (groups.every((g) => g === groups[0])) {
      const next = { ...state, solved: [...state.solved, groups[0]], guesses }
      save(next)
      setSelected([])
      ;[0, 1, 2, 3].forEach((i) => later(() => flip(i), i * 60))
      if (next.solved.length === 4) finish(next, true)
    } else {
      const most = Math.max(...groups.map((g) => groups.filter((x) => x === g).length))
      if (most === 3) show('One away…')
      if (!reduce) tileEls(picked).forEach((el) => animate(el, { x: [0, -7, 7, -5, 5, -2, 0] }, { duration: 0.38 }))
      bump()
      const next = { ...state, mistakes: state.mistakes + 1, guesses }
      save(next)
      if (next.mistakes >= MAX_MISTAKES) {
        setSelected([])
        finish(next, false)
      }
    }
    setBusy(false)
  }

  const submit = () => {
    if (selected.length !== 4 || busy || status !== 'playing') return
    const key = [...selected].sort().join()
    if (state.guesses.some((g) => [...g].sort().join() === key)) return show('Already guessed')
    // The four picks hop in board order, then the verdict lands
    const picked = state.order.filter((w) => selected.includes(w))
    setBusy(true)
    if (!reduce) tileEls(picked).forEach((el, i) => animate(el, { y: [0, -8, 0] }, { duration: 0.26, delay: i * 0.07, ease: 'easeOut' }))
    later(() => evaluate(picked), reduce ? 0 : 480)
  }

  const submitRef = useRef(submit)
  useEffect(() => {
    submitRef.current = submit
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !keyIsElsewhere(e) && !(e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement)) submitRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const switchTo = (k: 'daily' | 'practice') => {
    if (busy) return
    setKind(k)
    setSelected([])
  }

  const newPuzzle = () => {
    const index = randomIndex(practice.index)
    setPractice({ index, ...fresh(LINKS[index]) })
    setPracticeSecs(0)
    setSelected([])
    setRevealed(0)
    setStatsOpen(false)
  }

  const label = isDaily ? `#${dailyDay + 1}` : 'practice'
  const won = status === 'won'

  return (
    <div className="mx-auto flex w-full max-w-[34rem] flex-1 flex-col gap-5 pt-3 pb-4 sm:pt-4">
      {toast}
      <DailyBar
        id="link"
        kind={kind}
        onKind={switchTo}
        dailyLabel={isArchive ? `Archive #${dailyDay + 1}` : `Daily #${today + 1}`}
        onArchive={() => setArchiveOpen(true)}
        onStats={() => setStatsOpen(true)}
        locked={busy}
        extra={
          <>
            <TimerChip seconds={seconds} done={status === 'won'} />
            {!isDaily && (
            <button type="button" onClick={newPuzzle} disabled={busy} aria-label="New puzzle" className="press grid size-9 place-items-center rounded-full text-sub ring-1 ring-line hover:text-text">
              <RotateCcw className="size-4" />
            </button>
            )}
          </>
        }
      />

      <p className="text-center text-sm text-sub">Find four groups of four.</p>

      <div ref={board} className="flex flex-col gap-2" key={`${kind}-${puzzle[0].words[0]}`}>
        {/* Groups found so far */}
        {bars.map((g, i) => {
          const group = puzzle[g]
          const missed = i >= state.solved.length
          return (
            <motion.div
              key={`bar-${g}`}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: missed ? 0.75 : 1, scale: 1 }}
              transition={{ ...LAYOUT, opacity: { duration: 0.3 } }}
              className={`grid h-[4.25rem] place-content-center rounded-xl px-3 text-center text-bg sm:h-20 ${LEVEL_BG[group.level]}`}
            >
              <p className="text-sm font-bold tracking-wide uppercase sm:text-base">{group.name}</p>
              <p className="mt-0.5 text-xs font-medium uppercase sm:text-sm">{group.words.join(', ')}</p>
            </motion.div>
          )
        })}

        {/* The words still in play */}
        <div className="grid grid-cols-4 gap-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {tiles.map((w) => {
              const on = selected.includes(w)
              return (
                <motion.button
                  key={w}
                  layout
                  type="button"
                  data-word={w}
                  onClick={() => toggle(w)}
                  aria-pressed={on}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                  transition={LAYOUT}
                  className={`press grid h-[4.25rem] place-items-center rounded-xl px-1 text-center font-semibold tracking-wide break-all uppercase select-none sm:h-20 ${w.length > 8 ? 'text-[0.62rem] sm:text-xs' : w.length > 6 ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'} ${on ? 'bg-text text-bg' : 'bg-raise text-text hover:bg-[#353a40]'}`}
                >
                  {w}
                </motion.button>
              )
            })}
          </AnimatePresence>
        </div>
      </div>

      {status === 'playing' ? (
        <>
          <div className="flex items-center justify-center gap-2 text-sm text-sub" aria-label={`${MAX_MISTAKES - state.mistakes} mistakes left`}>
            Mistakes left
            <span className="flex gap-1.5">
              {Array.from({ length: MAX_MISTAKES }, (_, i) => (
                <motion.span key={i} className="size-2.5 rounded-full bg-sub" animate={{ opacity: i < MAX_MISTAKES - state.mistakes ? 1 : 0.15, scale: i < MAX_MISTAKES - state.mistakes ? 1 : 0.6 }} transition={{ duration: 0.25, ease: EASE }} />
              ))}
            </span>
          </div>
          <div className="flex justify-center gap-2">
            <button type="button" onClick={() => save({ ...state, order: shuffle(state.order) })} disabled={busy} className="press flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium ring-1 ring-line hover:bg-panel">
              <Shuffle className="size-4" aria-hidden /> Shuffle
            </button>
            <button type="button" onClick={() => setSelected([])} disabled={busy || !selected.length} className="press rounded-full px-4 py-2.5 text-sm font-medium ring-1 ring-line hover:bg-panel disabled:opacity-40">
              Deselect
            </button>
            <button type="button" onClick={submit} disabled={busy || selected.length !== 4} className="press rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-bg hover:bg-accent/90 disabled:bg-raise disabled:text-sub">
              Submit
            </button>
          </div>
        </>
      ) : (
        finished && (
          <motion.button
            type="button"
            onClick={() => setStatsOpen(true)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="press mx-auto rounded-full px-4 py-2 text-sm font-medium text-accent ring-1 ring-accent/30 hover:bg-accent/10"
          >
            {won ? (state.mistakes ? `Solved with ${MISS_LABELS[state.mistakes]}` : 'Solved perfectly') : 'Out of mistakes'} · see stats
          </motion.button>
        )
      )}

      <Archive open={archiveOpen} onClose={() => setArchiveOpen(false)} game="link" today={today} current={isDaily ? dailyDay : -1} status={linkStatus} />

      <StatsModal
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        title={isDaily ? 'Connect4 stats' : 'Practice stats'}
        note={finished ? (won ? `${state.mistakes ? `Solved with ${MISS_LABELS[state.mistakes]}` : 'Solved perfectly'} · ${clock(seconds)}${isArchive ? ' · archive puzzles don’t count toward stats' : ''}` : 'Out of mistakes this time') : undefined}
        numbers={[
          ['Played', stats.played],
          ['Win %', winRate(stats)],
          [isDaily ? 'Streak' : 'Win streak', liveCurrent(stats, today, isDaily)],
          ['Best', stats.best],
        ]}
        board={online && isDaily && !isArchive ? <DailyBoard game="link" day={today} refresh={posted} /> : undefined}
        barsTitle="Mistakes when solved"
        bars={stats.dist.map((n, i) => ({ label: MISS_LABELS[i], n }))}
        highlight={won && finished && !isArchive ? state.mistakes : null}
        footer={
          <>
            {isDaily ? (
              <Countdown />
            ) : (
              <button type="button" onClick={newPuzzle} className="press flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-bg hover:bg-accent/90">
                <RotateCcw className="size-4" aria-hidden /> New puzzle
              </button>
            )}
            {status !== 'playing' && (
              <ShareBar
                text={shareText(puzzle, state, label)}
                file={`glyph-connect4-${isDaily ? dailyDay + 1 : 'practice'}.png`}
                onDone={show}
                card={() => ({
                  mode: `connect4 ${label}`,
                  headline: `${state.solved.length}/4`,
                  unit: won ? (state.mistakes ? 'solved' : 'perfect') : 'groups',
                  stats: [
                    ['mistakes', String(state.mistakes)],
                    ['streak', String(liveCurrent(stats, today, isDaily))],
                  ],
                  grid: guessColors(puzzle, state.guesses),
                })}
              />
            )}
          </>
        }
      />
    </div>
  )
}
