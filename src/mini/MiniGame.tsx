import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useReducedMotion } from 'motion/react'
import { ChevronLeft, ChevronRight, LifeBuoy, RotateCcw, Timer } from 'lucide-react'
import Archive from '../components/Archive'
import DailyBar from '../components/DailyBar'
import ShareBar from '../components/ShareBar'
import StatsModal, { Countdown } from '../components/StatsModal'
import { useToast } from '../components/Toast'
import { MINIS } from '../data/minis'
import { keyIsElsewhere } from '../lib/keys'
import { submitScore } from '../lib/online'
import { click, lose, win } from '../lib/sound'
import { emptyStats, liveCurrent, record } from '../lib/stats'
import { dayNumber, useStored } from '../lib/storage'
import Keyboard from '../word/Keyboard'
import { build, clock, dailyMini, emptyTimes, freshMini, miniStatus, type Dir, type Entry, type MiniState, type Times } from './logic'

const EASE = [0.23, 1, 0.32, 1] as const

const randomIndex = (not?: number) => {
  let i = not
  while (i === not) i = Math.floor(Math.random() * MINIS.length)
  return i!
}

type Scope = 'square' | 'word' | 'puzzle'

export default function MiniGame({ day }: { day: number | null }) {
  const today = dayNumber()
  const dailyDay = day !== null && day < today ? day : today
  const isArchive = dailyDay !== today
  const [savedKind, setKind] = useStored<'daily' | 'practice'>('mini:kind', 'daily')
  const kind = isArchive ? 'daily' : savedKind
  const isDaily = kind === 'daily'
  const [firstPractice] = useState(randomIndex)
  const [practice, setPractice] = useStored<MiniState & { index: number }>('mini:practice', { index: firstPractice, ...freshMini(build(MINIS[firstPractice])) })
  const puzzle = isDaily ? dailyMini(dailyDay) : MINIS[practice.index]
  const board = build(puzzle)
  const [dailyState, setDailyState] = useStored<MiniState>(`mini:d${dailyDay}`, freshMini(board))
  const [streak, setStreak] = useStored('mini:stats', emptyStats(1))
  const [times, setTimes] = useStored<Times>('mini:times', emptyTimes)
  const [practiceTimes, setPracticeTimes] = useStored<Times>('mini:practice-times', emptyTimes)
  const st: MiniState = isDaily ? dailyState : practice
  const save = (s: MiniState) => (isDaily ? setDailyState(s) : setPractice({ ...s, index: practice.index }))

  const first = board.entries[0]
  const [cursor, setCursor] = useState<{ cell: number; dir: Dir }>({ cell: first.cells[0], dir: first.dir })
  const [helpOpen, setHelpOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [toast, show] = useToast()
  const gridRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const warned = useRef('')

  const entryAt = (cell: number, dir: Dir) => board.entries.find((e) => e.dir === dir && e.cells.includes(cell))
  const entry: Entry = entryAt(cursor.cell, cursor.dir) ?? entryAt(cursor.cell, cursor.dir === 'a' ? 'd' : 'a')!
  const dir = entry.dir
  const started = st.fill.some(Boolean)

  // The clock runs once you start, pauses while the tab is hidden, and stops when solved
  const latest = useRef(st)
  const saveRef = useRef(save)
  useLayoutEffect(() => {
    latest.current = st
    saveRef.current = save
  })
  useEffect(() => {
    if (!started || st.done) return
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') saveRef.current({ ...latest.current, seconds: latest.current.seconds + 1 })
    }, 1000)
    return () => clearInterval(id)
  }, [started, st.done])

  const finish = (s: MiniState) => {
    const done = { ...s, done: true, wrong: [] }
    save(done)
    win()
    show(`Solved in ${clock(s.seconds)}`, 1800)
    const bump = (t: Times): Times => ({ best: s.assisted ? t.best : t.best === null ? s.seconds : Math.min(t.best, s.seconds), total: t.total + s.seconds, count: t.count + 1 })
    if (!isDaily) setPracticeTimes(bump)
    else if (!isArchive) {
      setTimes(bump)
      setStreak((x) => record(x, true, 0, today))
      if (!s.assisted) submitScore('mini', `daily-${today + 1}`, Math.max(5, s.seconds))
    }
    // A ripple runs corner to corner
    if (!reduce)
      gridRef.current?.querySelectorAll<HTMLElement>('[data-cell]').forEach((el) => {
        const i = Number(el.dataset.cell)
        animate(el, { y: [0, -6, 0], scale: [1, 1.04, 1] }, { duration: 0.42, delay: (Math.floor(i / board.size) + (i % board.size)) * 0.045, ease: 'easeOut' })
      })
    setTimeout(() => setStatsOpen(true), 1400)
  }

  const settle = (s: MiniState) => {
    const full = board.solution.every((ch, i) => ch === null || s.fill[i])
    if (!full) return save(s)
    if (board.solution.every((ch, i) => ch === null || s.fill[i] === ch)) return finish(s)
    save(s)
    // Say so once per full grid, not on every key after
    const key = s.fill.join('')
    if (warned.current !== key) {
      warned.current = key
      lose()
      show('Not quite. Something’s off.', 1800)
    }
  }

  const next = (e: Entry, step: 1 | -1) => board.entries[(board.entries.indexOf(e) + step + board.entries.length) % board.entries.length]

  // Jump to the next clue with an empty square (or just the next clue if all are full)
  const goNextEntry = (from: Entry, fill: string[], step: 1 | -1 = 1) => {
    let e = next(from, step)
    for (let k = 0; k < board.entries.length; k++, e = next(e, step)) {
      const empty = e.cells.find((c) => !fill[c])
      if (empty !== undefined) return setCursor({ cell: empty, dir: e.dir })
    }
    const n = next(from, step)
    setCursor({ cell: n.cells[0], dir: n.dir })
  }

  const typeLetter = (ch: string) => {
    if (st.done) return
    const fill = [...st.fill]
    if (!st.revealed.includes(cursor.cell)) fill[cursor.cell] = ch
    click()
    settle({ ...st, fill, wrong: st.wrong.filter((c) => c !== cursor.cell) })
    // Next empty square in the word (or simply the next square when correcting a full word), then on to the next clue
    const at = entry.cells.indexOf(cursor.cell)
    const rest = entry.cells.slice(at + 1)
    const wasFull = entry.cells.every((c) => st.fill[c])
    const target = wasFull ? rest[0] : (rest.find((c) => !fill[c]) ?? entry.cells.find((c) => !fill[c]))
    if (target !== undefined) setCursor({ cell: target, dir })
    else goNextEntry(entry, fill)
  }

  const backspace = () => {
    if (st.done) return
    const fill = [...st.fill]
    let cell = cursor.cell
    if (!fill[cell] || st.revealed.includes(cell)) {
      const at = entry.cells.indexOf(cell)
      if (at > 0) cell = entry.cells[at - 1]
      setCursor({ cell, dir })
    }
    if (!st.revealed.includes(cell)) fill[cell] = ''
    save({ ...st, fill })
  }

  const move = (dr: number, dc: number) => {
    const want: Dir = dc ? 'a' : 'd'
    // An arrow across the current direction just turns the cursor first
    if (want !== dir && entryAt(cursor.cell, want)) return setCursor({ cell: cursor.cell, dir: want })
    let r = Math.floor(cursor.cell / board.size)
    let c = cursor.cell % board.size
    for (let k = 0; k < board.size; k++) {
      r += dr
      c += dc
      if (r < 0 || c < 0 || r >= board.size || c >= board.size) return
      const i = r * board.size + c
      if (board.solution[i] !== null) return setCursor({ cell: i, dir: entryAt(i, want) ? want : dir })
    }
  }

  const toggleDir = () => {
    const other: Dir = dir === 'a' ? 'd' : 'a'
    if (entryAt(cursor.cell, other)) setCursor({ cell: cursor.cell, dir: other })
  }

  const cellsFor = (scope: Scope) => (scope === 'square' ? [cursor.cell] : scope === 'word' ? entry.cells : board.solution.flatMap((ch, i) => (ch === null ? [] : [i])))

  const check = (scope: Scope) => {
    setHelpOpen(false)
    const wrong = cellsFor(scope).filter((i) => st.fill[i] && st.fill[i] !== board.solution[i])
    save({ ...st, assisted: true, wrong: [...new Set([...st.wrong, ...wrong])] })
    show(wrong.length ? `${wrong.length} wrong ${wrong.length === 1 ? 'letter' : 'letters'}` : 'All correct so far')
  }

  const reveal = (scope: Scope) => {
    setHelpOpen(false)
    const cells = cellsFor(scope)
    const fill = [...st.fill]
    cells.forEach((i) => (fill[i] = board.solution[i]!))
    settle({ ...st, fill, assisted: true, revealed: [...new Set([...st.revealed, ...cells])], wrong: st.wrong.filter((c) => !cells.includes(c)) })
  }

  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {})
  useLayoutEffect(() => {
    keyRef.current = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || keyIsElsewhere(e)) return
      const k = e.key
      if (/^[a-zA-Z]$/.test(k)) typeLetter(k.toLowerCase())
      else if (k === 'Backspace') backspace()
      else if (k === 'ArrowLeft') move(0, -1)
      else if (k === 'ArrowRight') move(0, 1)
      else if (k === 'ArrowUp') move(-1, 0)
      else if (k === 'ArrowDown') move(1, 0)
      else if (k === ' ') toggleDir()
      else if (k === 'Tab' || k === 'Enter') goNextEntry(entry, st.fill, e.shiftKey ? -1 : 1)
      else return
      e.preventDefault()
    }
  })
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLButtonElement && (e.key === 'Enter' || e.key === ' ')) return
      keyRef.current(e)
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])

  const pickCell = (i: number) => {
    if (i === cursor.cell) return toggleDir()
    setCursor({ cell: i, dir: entryAt(i, dir) ? dir : dir === 'a' ? 'd' : 'a' })
  }

  const switchTo = (k: 'daily' | 'practice') => {
    setKind(k)
    setCursor({ cell: first.cells[0], dir: first.dir })
  }

  const newPuzzle = () => {
    const index = randomIndex(practice.index)
    const b = build(MINIS[index])
    setPractice({ index, ...freshMini(b) })
    setCursor({ cell: b.entries[0].cells[0], dir: b.entries[0].dir })
    setStatsOpen(false)
  }

  const label = isDaily ? `#${dailyDay + 1}` : 'practice'
  const t = isDaily ? times : practiceTimes
  const avg = t.count ? Math.round(t.total / t.count) : null
  const full = (e: Entry) => e.cells.every((c) => st.fill[c])

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 pt-3 pb-2 pointer-coarse:gap-3 sm:pt-4">
      {toast}
      <div className="mx-auto w-full max-w-[34rem] lg:max-w-none">
        <DailyBar
          id="mini"
          kind={kind}
          onKind={switchTo}
          dailyLabel={isArchive ? `Archive #${dailyDay + 1}` : `Daily #${today + 1}`}
          onArchive={() => setArchiveOpen(true)}
          onStats={() => setStatsOpen(true)}
          extra={
            <>
              <span className={`flex items-center gap-1.5 px-1 font-mono text-sm tabular-nums ${st.done ? 'text-accent' : 'text-sub'}`} aria-label={`Time ${clock(st.seconds)}`}>
                <Timer className="size-4" aria-hidden /> {clock(st.seconds)}
              </span>
              {!isDaily && (
                <button type="button" onClick={newPuzzle} aria-label="New puzzle" className="press grid size-9 place-items-center rounded-full text-sub ring-1 ring-line hover:text-text">
                  <RotateCcw className="size-4" />
                </button>
              )}
            </>
          }
        />
      </div>

      <div className="grid flex-1 items-start gap-6 lg:grid-cols-[auto_1fr] lg:gap-10">
        <div className="mx-auto flex w-full max-w-[min(24rem,48dvh)] flex-col gap-3 pointer-coarse:max-w-[min(24rem,34dvh,100%)]">
          {/* The current clue */}
          <div className="flex items-center gap-1 rounded-2xl bg-panel p-1.5 ring-1 ring-line">
            <button type="button" onClick={() => goNextEntry(entry, st.fill, -1)} aria-label="Previous clue" className="press grid size-9 shrink-0 place-items-center rounded-xl text-sub hover:bg-raise hover:text-text">
              <ChevronLeft className="size-4" />
            </button>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={`${entry.num}${entry.dir}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
                transition={{ duration: 0.18, ease: EASE }}
                className="min-h-10 flex-1 content-center text-[15px] leading-snug"
                aria-live="polite"
              >
                <span className="mr-2 font-mono font-semibold text-accent">
                  {entry.num}
                  {entry.dir === 'a' ? 'A' : 'D'}
                </span>
                {entry.clue}
              </motion.p>
            </AnimatePresence>
            <button type="button" onClick={() => goNextEntry(entry, st.fill)} aria-label="Next clue" className="press grid size-9 shrink-0 place-items-center rounded-xl text-sub hover:bg-raise hover:text-text">
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* The grid */}
          <div ref={gridRef} className="grid gap-[3px] rounded-2xl bg-line p-[3px]" style={{ gridTemplateColumns: `repeat(${board.size}, minmax(0, 1fr))` }} role="grid" aria-label="Crossword">
            {board.solution.map((sol, i) => {
              if (sol === null) return <div key={i} className="aspect-square rounded-[10px] bg-[#09090b]" aria-hidden />
              const on = i === cursor.cell
              const inWord = entry.cells.includes(i)
              const wrong = st.wrong.includes(i)
              const revealed = st.revealed.includes(i)
              return (
                <button
                  key={i}
                  type="button"
                  data-cell={i}
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickCell(i)}
                  aria-label={`${board.nums[i] ? `${board.nums[i]}, ` : ''}${st.fill[i] ? st.fill[i].toUpperCase() : 'empty'}`}
                  className={`relative grid aspect-square place-items-center rounded-[10px] font-mono text-[clamp(1.2rem,5vw,1.85rem)] font-semibold uppercase transition-colors duration-150 ${on ? 'bg-accent text-bg' : `${inWord ? 'bg-[#2a4a41]' : 'bg-[#25292e] hover:bg-[#2e3339]'} ${st.done ? 'text-accent' : 'text-text'}`}`}
                >
                  {board.nums[i] && <span className={`absolute top-1 left-1.5 font-sans text-[0.6rem] leading-none font-medium sm:text-[0.68rem] ${on ? 'text-bg/70' : 'text-sub'}`}>{board.nums[i]}</span>}
                  <span className={wrong ? 'text-bad' : ''}>{st.fill[i]}</span>
                  {wrong && <span className="absolute inset-x-2 top-1/2 h-0.5 -rotate-45 rounded bg-bad/80" aria-hidden />}
                  {revealed && <span className="absolute top-0 right-0 size-0 border-t-[9px] border-l-[9px] border-t-warn border-l-transparent" aria-label="revealed" />}
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-sub">
              {st.done ? (st.assisted ? 'Solved with help' : 'Solved') : <span className="hidden pointer-fine:inline">Tab next clue · Space turn · Arrows move</span>}
            </p>
            <div className="relative">
              <button type="button" onClick={() => setHelpOpen((o) => !o)} disabled={st.done} aria-expanded={helpOpen} className="press flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium ring-1 ring-line hover:bg-panel disabled:opacity-40">
                <LifeBuoy className="size-4" aria-hidden /> Help
              </button>
              <AnimatePresence>
                {helpOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setHelpOpen(false)} aria-hidden />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.1 } }}
                      transition={{ duration: 0.16, ease: EASE }}
                      className="absolute right-0 bottom-full z-30 mb-2 w-56 origin-bottom-right rounded-2xl bg-panel p-2 shadow-2xl ring-1 ring-line"
                    >
                      {(['check', 'reveal'] as const).map((act) => (
                        <div key={act} className="p-1">
                          <p className="px-2 pt-1 pb-1.5 text-xs font-semibold text-sub capitalize">{act}</p>
                          <div className="grid grid-cols-3 gap-1">
                            {(['square', 'word', 'puzzle'] as const).map((s) => (
                              <button key={s} type="button" onClick={() => (act === 'check' ? check(s) : reveal(s))} className="press rounded-lg px-2 py-2 text-xs font-medium capitalize hover:bg-raise">
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                      <p className="px-3 pt-1 pb-1.5 text-[11px] leading-snug text-sub">Using help marks the solve as assisted, so it won’t set a best time.</p>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* All clues, on wide screens */}
        <div className="hidden gap-8 lg:grid lg:grid-cols-2">
          {(['a', 'd'] as const).map((d) => (
            <section key={d}>
              <h3 className="mb-2 text-sm font-semibold text-sub">{d === 'a' ? 'Across' : 'Down'}</h3>
              <ol className="space-y-1">
                {board.entries
                  .filter((e) => e.dir === d)
                  .map((e) => {
                    const on = e === entry
                    return (
                      <li key={e.num}>
                        <button
                          type="button"
                          tabIndex={-1}
                          onMouseDown={(ev) => ev.preventDefault()}
                          onClick={() => setCursor({ cell: e.cells.find((c) => !st.fill[c]) ?? e.cells[0], dir: e.dir })}
                          className={`flex w-full gap-3 rounded-xl px-3 py-2 text-left text-[15px] leading-snug transition-colors duration-150 ${on ? 'bg-raise text-text' : full(e) ? 'text-sub hover:bg-panel' : 'text-text hover:bg-panel'}`}
                        >
                          <span className={`w-4 shrink-0 font-mono font-semibold ${on ? 'text-accent' : 'text-sub'}`}>{e.num}</span>
                          {e.clue}
                        </button>
                      </li>
                    )
                  })}
              </ol>
            </section>
          ))}
        </div>
      </div>

      {/* Tap keyboard on touch screens */}
      <div className="hidden pointer-coarse:block">
        <Keyboard compact marks={{}} onKey={(k) => (k === 'enter' ? goNextEntry(entry, st.fill) : k === 'back' ? backspace() : typeLetter(k))} />
      </div>

      <Archive open={archiveOpen} onClose={() => setArchiveOpen(false)} game="mini" today={today} current={isDaily ? dailyDay : -1} status={miniStatus} />

      <StatsModal
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        title={isDaily ? 'Mini stats' : 'Practice stats'}
        note={st.done ? `Solved in ${clock(st.seconds)}${st.assisted ? ' with help' : ''}${isArchive ? ' · archive puzzles don’t count toward stats' : ''}` : undefined}
        numbers={[
          ['Solved', t.count],
          [isDaily ? 'Streak' : 'Practice', isDaily ? liveCurrent(streak, today, true) : t.count],
          ['Best', t.best === null ? '–' : clock(t.best)],
          ['Average', avg === null ? '–' : clock(avg)],
        ]}
        footer={
          <>
            {isDaily ? (
              <Countdown />
            ) : (
              <button type="button" onClick={newPuzzle} className="press flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-bg hover:bg-accent/90">
                <RotateCcw className="size-4" aria-hidden /> New puzzle
              </button>
            )}
            {st.done && (
              <ShareBar
                text={`glyph mini ${label} · ${clock(st.seconds)}${st.assisted ? ' (with help)' : ''}`}
                file={`glyph-mini-${isDaily ? dailyDay + 1 : 'practice'}.png`}
                onDone={show}
                card={() => ({
                  mode: `mini ${label}`,
                  headline: clock(st.seconds),
                  unit: st.assisted ? 'with help' : 'time',
                  stats: [
                    ['streak', String(liveCurrent(streak, today, true))],
                    ['best', t.best === null ? '–' : clock(t.best)],
                  ],
                  grid: Array.from({ length: board.size }, (_, r) => board.solution.slice(r * board.size, (r + 1) * board.size).map((ch, c) => (ch === null ? '#1b1d20' : st.revealed.includes(r * board.size + c) ? '#e9b949' : '#8be9c1'))),
                })}
              />
            )}
          </>
        }
      />
    </div>
  )
}
