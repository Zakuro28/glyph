import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { animate, motion, useReducedMotion } from 'motion/react'
import { RotateCcw } from 'lucide-react'
import Archive from '../components/Archive'
import DailyBar from '../components/DailyBar'
import ShareBar from '../components/ShareBar'
import { MARK_COLOR } from '../lib/card'
import StatsModal, { Countdown } from '../components/StatsModal'
import { useToast } from '../components/Toast'
import { bump, click, flip, lose, win } from '../lib/sound'
import { emptyStats, liveCurrent, record, winRate } from '../lib/stats'
import { dayNumber, useStored } from '../lib/storage'
import Keyboard from './Keyboard'
import { keyIsElsewhere } from '../lib/keys'
import { submitScore } from '../lib/online'
import { PRAISE, dailyAnswer, loadValid, randomAnswer, score, shareText, wordStatus, type Mark } from './logic'

const FLIP = 500
const STAGGER = 250
const REVEAL = STAGGER * 4 + FLIP

const FACE: Record<Mark, string> = { correct: 'bg-accent text-bg', present: 'bg-warn text-bg', absent: 'bg-raise text-text' }

/** One letter square. When it gets a color it turns over, showing the colored face underneath. */
function Tile({ letter, mark, delay, instant }: { letter: string; mark?: Mark; delay: number; instant: boolean }) {
  return (
    <div data-tile className="relative aspect-square [perspective:800px]">
      <div
        className="flipper absolute inset-0 [transform-style:preserve-3d]"
        style={{ transform: mark ? 'rotateX(180deg)' : undefined, transition: instant ? 'none' : `transform ${FLIP}ms cubic-bezier(0.45, 0, 0.2, 1) ${delay}ms` }}
      >
        <div className={`absolute inset-0 grid place-items-center rounded-lg border-2 font-mono text-[clamp(1.4rem,5vw,2rem)] font-semibold uppercase [backface-visibility:hidden] ${letter ? 'tile-pop border-sub' : 'border-line'}`}>{letter}</div>
        <div className={`absolute inset-0 grid place-items-center rounded-lg font-mono text-[clamp(1.4rem,5vw,2rem)] font-semibold uppercase [backface-visibility:hidden] [transform:rotateX(180deg)] ${mark ? FACE[mark] : ''}`}>{letter}</div>
      </div>
    </div>
  )
}

export default function WordGame({ day }: { day: number | null }) {
  const today = dayNumber()
  // An archive day if one was asked for (never a future one)
  const dailyDay = day !== null && day < today ? day : today
  const isArchive = dailyDay !== today
  const [savedKind, setKind] = useStored<'daily' | 'practice'>('word:kind', 'daily')
  const kind = isArchive ? 'daily' : savedKind
  const [dailyGuesses, setDailyGuesses] = useStored<string[]>(`word:d${dailyDay}`, [])
  const [practice, setPractice] = useStored('word:practice', { answer: randomAnswer(), guesses: [] as string[] })
  const [dailyStats, setDailyStats] = useStored('word:stats', emptyStats(6))
  const [practiceStats, setPracticeStats] = useStored('word:practice-stats', emptyStats(6))
  const [valid, setValid] = useState<Set<string> | null>(null)
  const [current, setCurrent] = useState('')
  const [animRow, setAnimRow] = useState<number | null>(null)
  const [statsOpen, setStatsOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [toast, show] = useToast()
  const rows = useRef<(HTMLDivElement | null)[]>([])
  const timers = useRef<number[]>([])
  const reduce = useReducedMotion()

  const isDaily = kind === 'daily'
  const answer = isDaily ? dailyAnswer(dailyDay) : practice.answer
  const guesses = isDaily ? dailyGuesses : practice.guesses
  const won = guesses.at(-1) === answer
  const status = won ? 'won' : guesses.length >= 6 ? 'lost' : 'playing'
  const stats = isDaily ? dailyStats : practiceStats
  // Rows still turning over don't color the keyboard yet
  const settled = animRow === null ? guesses : guesses.slice(0, animRow)

  useEffect(() => {
    loadValid().then(setValid)
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [])

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))

  const shake = () => {
    const el = rows.current[guesses.length]
    if (el && !reduce) animate(el, { x: [0, -9, 9, -7, 7, -4, 4, 0] }, { duration: 0.4 })
    bump()
  }

  const submit = () => {
    if (current.length < 5) return (shake(), show('Not enough letters'))
    if (!valid?.has(current)) return (shake(), show('Not in word list'))
    const next = [...guesses, current]
    const row = next.length - 1
    if (isDaily) setDailyGuesses(next)
    else setPractice({ answer, guesses: next })
    setCurrent('')
    setAnimRow(row)
    const solved = current === answer
    // Stats are saved straight away so a reload mid-reveal can't lose a result. Archive days don't touch the streak.
    if (solved || next.length === 6) {
      if (!isDaily) setPracticeStats((s) => record(s, solved, next.length - 1, null))
      else if (!isArchive) {
        setDailyStats((s) => record(s, solved, next.length - 1, today))
        if (solved) submitScore('word', `daily-${today + 1}`, next.length)
      }
    }
    if (!reduce) for (let i = 0; i < 5; i++) later(() => flip(i), i * STAGGER + FLIP / 2)
    later(
      () => {
        setAnimRow(null)
        if (solved) {
          win()
          show(PRAISE[row], 1800)
          if (!reduce) rows.current[row]?.querySelectorAll('[data-tile]').forEach((t, i) => animate(t, { y: [0, -18, 0, -4, 0] }, { duration: 0.55, delay: i * 0.07, ease: 'easeOut' }))
          later(() => setStatsOpen(true), 1500)
        } else if (next.length === 6) {
          lose()
          show(answer.toUpperCase(), 1600)
          later(() => setStatsOpen(true), 1700)
        }
      },
      reduce ? 0 : REVEAL,
    )
  }

  const press = (k: string) => {
    if (status !== 'playing' || animRow !== null || !valid) return
    if (k === 'enter') submit()
    else if (k === 'back') setCurrent((c) => c.slice(0, -1))
    else if (/^[a-z]$/.test(k) && current.length < 5) {
      setCurrent(current + k)
      click()
    }
  }
  const pressRef = useRef(press)
  useLayoutEffect(() => {
    pressRef.current = press
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || keyIsElsewhere(e)) return
      if (e.key === 'Enter') {
        e.preventDefault()
        pressRef.current('enter')
      } else if (e.key === 'Backspace') pressRef.current('back')
      else if (/^[a-zA-Z]$/.test(e.key)) pressRef.current(e.key.toLowerCase())
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const switchTo = (k: 'daily' | 'practice') => {
    if (animRow !== null) return
    setKind(k)
    setCurrent('')
  }

  const newWord = () => {
    setPractice((p) => ({ answer: randomAnswer(p.answer), guesses: [] }))
    setCurrent('')
    setStatsOpen(false)
  }

  const keyMarks: Record<string, Mark> = {}
  const rank = { absent: 0, present: 1, correct: 2 }
  settled.forEach((g) => score(g, answer).forEach((m, i) => (!keyMarks[g[i]] || rank[m] > rank[keyMarks[g[i]]]) && (keyMarks[g[i]] = m)))

  const label = isDaily ? `#${dailyDay + 1}` : 'practice'
  const grid = guesses.map((g) => score(g, answer))
  // The share card shows all six rows, empty ones as outlines
  const cardGrid = Array.from({ length: 6 }, (_, r) => (grid[r] ? grid[r].map((m) => MARK_COLOR[m]) : Array(5).fill('')))
  const finished = status !== 'playing' && animRow === null

  return (
    <div className="mx-auto flex w-full max-w-[34rem] flex-1 flex-col items-center gap-4 pt-3 pb-1 sm:gap-5 sm:pt-4">
      {toast}
      <DailyBar
        id="word"
        kind={kind}
        onKind={switchTo}
        dailyLabel={isArchive ? `Archive #${dailyDay + 1}` : `Daily #${today + 1}`}
        onArchive={() => setArchiveOpen(true)}
        onStats={() => setStatsOpen(true)}
        locked={animRow !== null}
        extra={
          !isDaily && (
            <button type="button" onClick={newWord} disabled={animRow !== null} aria-label="New word" className="press grid size-9 place-items-center rounded-full text-sub ring-1 ring-line hover:text-text">
              <RotateCcw className="size-4" />
            </button>
          )
        }
      />

      {/* The board */}
      <div className="grid w-full max-w-[min(21rem,37dvh)] flex-1 content-center gap-1.5" key={`${kind}-${answer}`} aria-label="Board">
        {Array.from({ length: 6 }, (_, r) => {
          const word = r < guesses.length ? guesses[r] : r === guesses.length ? current : ''
          const marks = r < guesses.length ? grid[r] : undefined
          return (
            <div key={r} ref={(el) => void (rows.current[r] = el)} className="grid grid-cols-5 gap-1.5" aria-label={word ? `Row ${r + 1}: ${word}` : undefined}>
              {Array.from({ length: 5 }, (_, i) => (
                <Tile key={i} letter={word[i] ?? ''} mark={marks?.[i]} delay={i * STAGGER} instant={r !== animRow || !!reduce} />
              ))}
            </div>
          )
        })}
      </div>

      {finished && (
        <motion.button
          type="button"
          onClick={() => setStatsOpen(true)}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="press rounded-full px-4 py-2 text-sm font-medium text-accent ring-1 ring-accent/30 hover:bg-accent/10"
        >
          {won ? `Solved in ${guesses.length}` : `The word was ${answer.toUpperCase()}`} · see stats
        </motion.button>
      )}

      <Keyboard marks={keyMarks} onKey={press} />

      <Archive open={archiveOpen} onClose={() => setArchiveOpen(false)} game="word" today={today} current={isDaily ? dailyDay : -1} status={wordStatus} />

      <StatsModal
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        title={isDaily ? 'Word stats' : 'Practice stats'}
        note={finished ? (won ? `Solved in ${guesses.length}${isArchive ? ' · archive puzzles don’t count toward stats' : ''}` : <>The word was <span className="font-mono font-semibold text-text uppercase">{answer}</span></>) : undefined}
        numbers={[
          ['Played', stats.played],
          ['Win %', winRate(stats)],
          [isDaily ? 'Streak' : 'Win streak', liveCurrent(stats, today, isDaily)],
          ['Best', stats.best],
        ]}
        barsTitle="Guess distribution"
        bars={stats.dist.map((n, i) => ({ label: String(i + 1), n }))}
        highlight={won && finished && !isArchive ? guesses.length - 1 : null}
        footer={
          <>
            {isDaily ? (
              <Countdown />
            ) : (
              <button type="button" onClick={newWord} className="press flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-bg hover:bg-accent/90">
                <RotateCcw className="size-4" aria-hidden /> New word
              </button>
            )}
            {status !== 'playing' && (
              <ShareBar
                text={shareText(guesses, answer, label, won)}
                file={`glyph-word-${isDaily ? dailyDay + 1 : 'practice'}.png`}
                onDone={show}
                card={() => ({
                  mode: `word ${label}`,
                  headline: won ? `${guesses.length}/6` : 'X/6',
                  unit: won ? 'solved' : 'unsolved',
                  stats: [
                    ['streak', String(liveCurrent(stats, today, isDaily))],
                    ['win %', String(winRate(stats))],
                  ],
                  grid: cardGrid,
                })}
              />
            )}
          </>
        }
      />
    </div>
  )
}
