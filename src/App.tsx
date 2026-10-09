import { Suspense, lazy, useState } from 'react'
import { MotionConfig, motion } from 'motion/react'
import { Settings2, Trophy } from 'lucide-react'
import LeaderboardModal from './components/LeaderboardModal'
import NamePrompt from './components/NamePrompt'
import SettingsModal from './components/SettingsModal'
import { GAMES, useRoute } from './lib/route'
import { online, usePlayer } from './lib/online'
import { dayNumber } from './lib/storage'

// Each game loads when it's first opened, so the first screen arrives sooner
const TypeGame = lazy(() => import('./type/TypeGame'))
const WordGame = lazy(() => import('./word/WordGame'))
const LinkGame = lazy(() => import('./link/LinkGame'))
const MiniGame = lazy(() => import('./mini/MiniGame'))
const Home = lazy(() => import('./Home'))

export default function App() {
  const route = useRoute()
  const player = usePlayer()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [boardsOpen, setBoardsOpen] = useState(false)
  const key = `${route.game}-${route.day ?? 'today'}`
  const current = GAMES.find((g) => g.id === route.game)
  const boardGame = route.game === 'link' || route.game === 'mini' ? route.game : 'word'

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8">
        <header className="flex h-14 items-center gap-3 sm:gap-4">
          <a href="#/" className="flex items-center gap-1 text-lg font-semibold tracking-tight" aria-label="Glyph home">
            glyph
            <span className="h-5 w-[3px] rounded-full bg-accent" aria-hidden />
          </a>
          {/* On phones the home page is the game picker, so the header just names the current game */}
          {current && <span className="truncate text-sm font-medium text-sub sm:hidden">/ {current.label}</span>}

          <nav className="ml-auto hidden rounded-full bg-panel p-1 ring-1 ring-line sm:flex" aria-label="Games">
            {GAMES.map((g) => {
              const on = route.game === g.id
              return (
                <a key={g.id} href={`#/${g.id}`} aria-current={on ? 'page' : undefined} className={`press relative isolate rounded-full px-3.5 py-1.5 text-sm font-medium ${on ? 'text-bg' : 'text-sub hover:text-text'}`}>
                  {on && <motion.span layoutId="tab" className="absolute inset-0 -z-10 rounded-full bg-accent" transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }} />}
                  {g.label}
                </a>
              )
            })}
          </nav>

          <div className="ml-auto flex shrink-0 gap-1.5 sm:ml-0">
            {online && (
              <button type="button" onClick={() => setBoardsOpen(true)} aria-label="Daily leaderboard" className="press grid size-9 place-items-center rounded-full text-sub ring-1 ring-line hover:text-text">
                <Trophy className="size-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label={player ? `Settings (playing as ${player.name})` : 'Settings'}
              className={`press grid size-9 place-items-center rounded-full ring-1 hover:text-text ${player ? 'bg-accent/12 font-mono text-sm font-semibold text-accent uppercase ring-accent/40' : 'text-sub ring-line'}`}
            >
              {player ? player.name[0] : <Settings2 className="size-4" />}
            </button>
          </div>
        </header>

        <SettingsModal key={player?.name} open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        {online && <LeaderboardModal key={boardGame} open={boardsOpen} onClose={() => setBoardsOpen(false)} game={boardGame} today={dayNumber()} />}
        <NamePrompt />

        <main className="flex flex-1 flex-col" key={key}>
          <Suspense fallback={null}>
            {route.game === 'home' && <Home />}
            {route.game === 'type' && <TypeGame />}
            {route.game === 'word' && <WordGame day={route.day} />}
            {route.game === 'link' && <LinkGame day={route.day} />}
            {route.game === 'mini' && <MiniGame day={route.day} />}
          </Suspense>
        </main>
      </div>
    </MotionConfig>
  )
}
