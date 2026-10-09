import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MousePointerClick, RotateCcw } from 'lucide-react'
import { click } from '../lib/sound'
import { bumpStreak, useStored, type Streak } from '../lib/storage'
import { consistency, makeWords, modeKey, tally, wpmOf, type Mode, type Result } from './engine'
import Results from './Results'
import { keyIsElsewhere } from '../lib/keys'
import { submitScore } from '../lib/online'

const TIMES = [15, 30, 60]
const COUNTS = [10, 25, 50]
const EASE = [0.23, 1, 0.32, 1] as const

/** What's on screen: the words, what's been typed into each, and keystroke counts */
type Test = { words: string[]; typed: string[]; cur: number; keys: number; hits: number; over: boolean }
/** Timing kept off screen: when it started, keystrokes per second, and the per-second samples */
type Clock = { start: number; buckets: { chars: number; errors: number }[]; good: number[]; samples: Result['samples']; done: boolean }

const freshTest = (m: Mode): Test => ({ words: makeWords(m.kind === 'words' ? m.n : 80), typed: [''], cur: 0, keys: 0, hits: 0, over: false })
const freshClock = (): Clock => ({ start: 0, buckets: [], good: [], samples: [], done: false })

export default function TypeGame() {
  const [mode, setMode] = useStored<Mode>('type:mode', { kind: 'time', n: 30 })
  const [best, setBest] = useStored<Record<string, number>>('type:best', {})
  const [streak, setStreak] = useStored<Streak>('type:streak', { current: 0, best: 0, lastDay: -99 })
  const [test, setTest] = useState(() => freshTest(mode))
  const [phase, setPhase] = useState<'ready' | 'running' | 'done'>('ready')
  const [elapsed, setElapsed] = useState(0)
  const [liveWpm, setLiveWpm] = useState(0)
  const [result, setResult] = useState<{ r: Result; prevBest: number } | null>(null)
  const [focused, setFocused] = useState(false)
  const [idle, setIdle] = useState(true)
  const [round, setRound] = useState(0)
  const clock = useRef<Clock>(freshClock())
  const latest = useRef(test)
  const input = useRef<HTMLInputElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const caret = useRef<HTMLDivElement>(null)
  const idleTimer = useRef(0)

  const restart = useCallback(
    (m: Mode = mode) => {
      clock.current = freshClock()
      setTest(freshTest(m))
      setPhase('ready')
      setElapsed(0)
      setLiveWpm(0)
      setResult(null)
      setRound((n) => n + 1)
      requestAnimationFrame(() => input.current?.focus())
    },
    [mode],
  )

  const pickMode = (m: Mode) => {
    setMode(m)
    restart(m)
  }

  // One sample per second: running WPM, raw speed in that second, and mistakes in it
  // (Correct characters are logged as you type, so a late tick still graphs the right numbers)
  const sampleUpTo = (t: Test, secs: number, final: boolean) => {
    const c = clock.current
    const goodBy = (sec: number) => {
      for (let k = Math.min(sec, c.good.length - 1); k >= 0; k--) if (c.good[k] !== undefined) return c.good[k]
      return 0
    }
    const push = (at: number, good: number) => {
      const prevT = c.samples.at(-1)?.t ?? 0
      const b = c.buckets[Math.ceil(at) - 1] ?? { chars: 0, errors: 0 }
      c.samples.push({ t: at, wpm: Math.round(wpmOf(good, at)), raw: Math.round(wpmOf(b.chars, at - prevT)), errors: b.errors })
    }
    while (c.samples.length < Math.floor(secs)) push(c.samples.length + 1, goodBy(c.samples.length))
    if (final && secs - (c.samples.at(-1)?.t ?? 0) > 0.3) push(secs, tally(t.words, t.typed, t.cur).good)
  }

  const finish = (t: Test) => {
    const c = clock.current
    if (c.done) return
    c.done = true
    const secs = mode.kind === 'time' ? mode.n : (performance.now() - c.start) / 1000
    sampleUpTo(t, secs, true)
    // In a words test the last word counts as finished, without a trailing space
    const { chars, good } = mode.kind === 'words' ? tally(t.words, t.typed, t.words.length) : tally(t.words, t.typed, t.cur)
    const res: Result = {
      mode,
      wpm: wpmOf(mode.kind === 'words' ? Math.max(0, good - 1) : good, secs),
      raw: wpmOf(t.keys, secs),
      acc: t.keys ? (t.hits / t.keys) * 100 : 0,
      consistency: consistency(c.samples.map((s) => s.raw)),
      seconds: secs,
      chars,
      samples: c.samples,
    }
    const key = modeKey(mode)
    const prevBest = best[key] ?? 0
    if (Math.round(res.wpm) > prevBest) setBest((b) => ({ ...b, [key]: Math.round(res.wpm) }))
    setStreak((s) => bumpStreak(s))
    // Only reasonable runs go on the leaderboard
    if (res.acc >= 75 && res.wpm >= 1) submitScore('type', key, Math.round(res.wpm))
    setResult({ r: res, prevBest })
    setPhase('done')
    input.current?.blur()
  }
  const finishRef = useRef(finish)
  useLayoutEffect(() => {
    finishRef.current = finish
    latest.current = test
  })

  // The clock: ticks while running, ends a timed test (it only reads refs, so it doesn't restart on every keystroke)
  useEffect(() => {
    if (phase !== 'running') return
    const id = setInterval(() => {
      const secs = (performance.now() - clock.current.start) / 1000
      sampleUpTo(latest.current, secs, false)
      if (mode.kind === 'time' && secs >= mode.n) finishRef.current(latest.current)
      else {
        setElapsed(secs)
        setLiveWpm(clock.current.samples.at(-1)?.wpm ?? 0)
      }
    }, 100)
    return () => clearInterval(id)
  }, [phase, mode])

  const poke = () => {
    setIdle(false)
    clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(() => setIdle(true), 700)
  }

  /** Logs one keystroke: starts the clock on the first, files it under the current second, clicks */
  const stroke = (ok: boolean) => {
    const c = clock.current
    if (!c.start) {
      c.start = performance.now()
      setPhase('running')
    }
    const b = (c.buckets[Math.floor((performance.now() - c.start) / 1000)] ??= { chars: 0, errors: 0 })
    b.chars++
    if (!ok) b.errors++
    click(!ok)
  }

  const typeInto = (t: Test, next: string): Test => {
    const w = t.words[t.cur]
    const prev = t.typed[t.cur]
    next = next.slice(0, w.length + 8)
    let { keys, hits } = t
    for (let j = prev.length; j < next.length; j++) {
      const ok = next[j] === w[j]
      keys++
      if (ok) hits++
      stroke(ok)
    }
    const over = mode.kind === 'words' && t.cur === t.words.length - 1 && next === w
    return { ...t, typed: t.typed.with(t.cur, next), keys, hits, over }
  }

  /** Space: lock in the word and move on */
  const commit = (t: Test): Test => {
    const ok = t.typed[t.cur] === t.words[t.cur]
    stroke(ok)
    const counted = { keys: t.keys + 1, hits: t.hits + (ok ? 1 : 0) }
    if (mode.kind === 'words' && t.cur === t.words.length - 1) return { ...t, ...counted, over: true }
    const words = mode.kind === 'time' && t.words.length - t.cur < 40 ? [...t.words, ...makeWords(60, t.words.at(-1))] : t.words
    return { ...t, ...counted, words, cur: t.cur + 1, typed: [...t.typed, ''] }
  }

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (clock.current.done) return
    const v = e.target.value
    const i = v.indexOf(' ')
    let t = typeInto(test, i === -1 ? v : v.slice(0, i))
    if (i !== -1 && t.typed[t.cur] && !t.over) t = commit(t)
    if (clock.current.start) clock.current.good[Math.floor((performance.now() - clock.current.start) / 1000)] = tally(t.words, t.typed, t.cur).good
    setTest(t)
    if (t.over) finish(t)
    else poke()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' || e.key === 'Escape') {
      e.preventDefault()
      restart()
    } else if (e.key === 'Backspace' && e.currentTarget.value === '') {
      // Step back into the previous word, but only if it has a mistake (finished words stay locked)
      e.preventDefault()
      const t = test
      if (t.cur > 0 && t.typed[t.cur - 1] !== t.words[t.cur - 1]) setTest({ ...t, cur: t.cur - 1, typed: t.typed.slice(0, -1) })
    }
  }

  // Keys pressed anywhere: start typing without clicking first, and Tab or Enter for the next test
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target === input.current || e.metaKey || e.ctrlKey || e.altKey || keyIsElsewhere(e)) return
      if (phase === 'done' && (e.key === 'Tab' || e.key === 'Enter')) {
        e.preventDefault()
        restart()
      } else if (phase !== 'done' && e.key.length === 1 && !(e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement)) input.current?.focus()
      else if (phase !== 'done' && e.key === 'Tab' && document.activeElement === document.body) {
        e.preventDefault()
        restart()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, restart])

  useEffect(() => {
    input.current?.focus()
  }, [])

  // After each paint: put the caret on the next letter and keep the current line second from the top
  useLayoutEffect(() => {
    const box = inner.current
    if (!box || !caret.current) return
    const word = box.querySelector<HTMLElement>(`[data-w="${test.cur}"]`)
    if (!word) return
    const letters = word.children
    const i = test.typed[test.cur].length
    const l = letters[Math.min(i, letters.length - 1)] as HTMLElement
    const x = i < letters.length ? l.offsetLeft : l.offsetLeft + l.offsetWidth
    caret.current.style.transform = `translate(${x}px, ${l.offsetTop}px)`
    const first = (box.firstElementChild as HTMLElement).offsetTop
    const nextLine = [...box.children].find((c) => (c as HTMLElement).offsetTop > first) as HTMLElement | undefined
    const stride = nextLine ? nextLine.offsetTop - first : word.offsetHeight
    const line = Math.round((word.offsetTop - first) / stride)
    box.style.transform = `translateY(${-Math.max(0, line - 1) * stride}px)`
  }, [test, round])

  const r = test
  const liveAcc = r.keys ? Math.round((r.hits / r.keys) * 100) : 100

  if (phase === 'done' && result)
    return <Results result={result.r} prevBest={result.prevBest} streak={streak} onNext={() => restart()} />

  return (
    <div className="flex flex-1 flex-col justify-center pb-16">
      {/* Mode picker: steps aside while you type */}
      <motion.div
        animate={{ opacity: phase === 'running' ? 0 : 1 }}
        transition={{ duration: 0.2 }}
        className={`mx-auto mb-12 flex flex-wrap items-center justify-center gap-1 rounded-2xl bg-panel p-1.5 text-sm ring-1 ring-line ${phase === 'running' ? 'pointer-events-none' : ''}`}
      >
        {(['time', 'words'] as const).map((k) => (
          <button key={k} type="button" onClick={() => pickMode({ kind: k, n: k === 'time' ? 30 : 25 })} className={`press rounded-xl px-3 py-1.5 font-medium ${mode.kind === k ? 'text-accent' : 'text-sub hover:text-text'}`}>
            {k}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-line" aria-hidden />
        {(mode.kind === 'time' ? TIMES : COUNTS).map((n) => (
          <button key={n} type="button" onClick={() => pickMode({ kind: mode.kind, n })} className={`press rounded-xl px-3 py-1.5 font-mono ${mode.n === n ? 'text-accent' : 'text-sub hover:text-text'}`}>
            {n}
          </button>
        ))}
      </motion.div>

      {/* Live numbers */}
      <div className="mb-3 flex h-9 items-end gap-5 font-mono" aria-live="off">
        <span className="text-3xl leading-none font-medium text-accent tabular-nums">
          {phase === 'running' ? (mode.kind === 'time' ? Math.max(0, Math.ceil(mode.n - elapsed)) : `${r.cur}/${mode.n}`) : ''}
        </span>
        {phase === 'running' && (
          <span className="pb-0.5 text-sm text-sub tabular-nums">
            {liveWpm} wpm · {liveAcc}%
          </span>
        )}
      </div>

      {/* The words */}
      <div className="relative cursor-text text-[1.35rem] sm:text-[1.6rem]" onClick={() => input.current?.focus()}>
        <input
          ref={input}
          value={r.typed[r.cur] ?? ''}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-label="Type the words shown"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          className="absolute inset-0 z-10 h-full w-full cursor-text text-base opacity-0"
        />
        <div className="h-[5.1em] overflow-hidden" aria-hidden>
          <motion.div
            key={round}
            initial={{ opacity: 0 }}
            animate={{ opacity: focused ? 1 : 0.35, filter: focused ? 'blur(0px)' : 'blur(4px)' }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <div
              ref={inner}
              className="relative flex flex-wrap font-mono transition-transform duration-200 ease-[var(--ease-out)]"
            >
              {r.words.slice(0, r.cur + 50).map((w, i) => {
                const t = r.typed[i] ?? ''
                const wrong = i < r.cur && t !== w
                return (
                  <span key={i} data-w={i} className={`mr-[0.6em] mb-[0.3em] h-[1.5em] leading-[1.5em] ${wrong ? 'underline decoration-bad/60 decoration-2 underline-offset-[0.35em]' : ''}`}>
                    {[...w].map((ch, j) => (
                      <span key={j} className={j < t.length ? (t[j] === ch ? 'text-text' : 'text-bad') : 'text-sub'}>
                        {ch}
                      </span>
                    ))}
                    {[...t.slice(w.length)].map((ch, j) => (
                      <span key={`x${j}`} className="text-bad/60">
                        {ch}
                      </span>
                    ))}
                  </span>
                )
              })}
              <div ref={caret} className="caret pointer-events-none absolute top-[0.2em] left-0 h-[1.1em] w-[2.5px] rounded-full bg-accent" data-idle={idle || phase === 'ready'} />
            </div>
          </motion.div>
      </div>

        <AnimatePresence>
          {!focused && (
            <motion.p
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.18, ease: EASE }}
              className="pointer-events-none absolute inset-0 grid place-items-center text-base text-text"
            >
              <span className="flex items-center gap-2">
                <MousePointerClick className="size-4 text-accent" aria-hidden /> Click here or start typing
              </span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-10 flex flex-col items-center gap-4">
        <button type="button" onClick={() => restart()} aria-label="Restart test" className="press grid size-11 place-items-center rounded-full text-sub hover:bg-panel hover:text-text">
          <RotateCcw className="size-5" />
        </button>
        <p className="hidden text-xs text-sub sm:block">
          <kbd className="rounded bg-panel px-1.5 py-0.5 font-mono text-text ring-1 ring-line">tab</kbd> restart
        </p>
      </div>
    </div>
  )
}
