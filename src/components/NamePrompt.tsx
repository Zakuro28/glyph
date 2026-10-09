import { useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { cleanName, setPlayerName, usePlayer } from '../lib/online'

const EASE = [0.23, 1, 0.32, 1] as const

/** First visit: ask what to call the player, so their daily times can go on the leaderboard */
export default function NamePrompt() {
  const player = usePlayer()
  const [name, setName] = useState('')
  if (player) return null
  const ok = cleanName(name).length >= 2

  return (
    <motion.div className="fixed inset-0 z-[60] grid place-items-center bg-bg/80 p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.form
        role="dialog"
        aria-modal="true"
        aria-labelledby="name-title"
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.32, ease: EASE, delay: 0.05 }}
        onSubmit={(e) => {
          e.preventDefault()
          if (ok) setPlayerName(name)
        }}
        className="w-full max-w-sm rounded-3xl bg-panel p-6 shadow-2xl ring-1 ring-line sm:p-8"
      >
        <p className="flex items-center gap-1 text-lg font-semibold tracking-tight">
          glyph <span className="h-5 w-[3px] rounded-full bg-accent" aria-hidden />
        </p>
        <h2 id="name-title" className="mt-5 text-2xl font-semibold tracking-tight">
          What should we call you?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-sub">Finish a daily puzzle fast and your name goes on that day’s leaderboard. You can change it later in settings.</p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          placeholder="Your name"
          aria-label="Your name"
          autoComplete="nickname"
          className="mt-5 w-full rounded-xl bg-bg px-4 py-3 text-base ring-1 ring-line transition-shadow outline-none placeholder:text-sub focus:ring-2 focus:ring-accent/70"
        />
        <button type="submit" disabled={!ok} className="press mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 font-semibold text-bg hover:bg-accent/90 disabled:bg-raise disabled:text-sub">
          Let’s play <ArrowRight className="size-4" aria-hidden />
        </button>
      </motion.form>
    </motion.div>
  )
}
