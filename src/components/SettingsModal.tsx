import { useState } from 'react'
import { Check, Volume2, VolumeX } from 'lucide-react'
import Modal from './Modal'
import { cleanName, setPlayerName, usePlayer } from '../lib/online'
import { isMuted, setMuted } from '../lib/sound'

/** Your name (as it shows on leaderboards) and sound */
export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const player = usePlayer()
  const [muted, setMutedState] = useState(isMuted)
  const [name, setName] = useState(player?.name ?? '')
  const [saved, setSaved] = useState(false)
  const changed = cleanName(name) !== player?.name && cleanName(name).length >= 2

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <form
        className="mt-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (!changed) return
          setPlayerName(name)
          setSaved(true)
          setTimeout(() => setSaved(false), 1500)
        }}
      >
        <label htmlFor="settings-name" className="text-sm font-medium text-sub">
          Name on the leaderboard
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="settings-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            className="min-w-0 flex-1 rounded-xl bg-bg px-4 py-3 text-base ring-1 ring-line transition-shadow outline-none focus:ring-2 focus:ring-accent/70"
          />
          <button type="submit" disabled={!changed && !saved} className="press flex items-center gap-1.5 rounded-xl bg-accent px-4 font-semibold text-bg hover:bg-accent/90 disabled:bg-raise disabled:text-sub">
            {saved ? <Check className="size-4" aria-label="Saved" /> : 'Save'}
          </button>
        </div>
        <p className="mt-2 text-xs text-sub">New results use the new name; earlier ones keep the old one.</p>
      </form>

      <button
        type="button"
        onClick={() => {
          setMuted(!muted)
          setMutedState(!muted)
        }}
        aria-pressed={!muted}
        className="press mt-6 flex w-full items-center justify-between rounded-2xl bg-bg px-4 py-3.5 ring-1 ring-line hover:bg-raise"
      >
        <span className="flex items-center gap-3 font-medium">
          {muted ? <VolumeX className="size-5 text-sub" aria-hidden /> : <Volume2 className="size-5 text-accent" aria-hidden />}
          Sound
        </span>
        <span className={`relative h-6 w-10 rounded-full transition-colors duration-200 ${muted ? 'bg-raise' : 'bg-accent'}`} aria-hidden>
          <span className={`absolute top-1 left-1 size-4 rounded-full bg-text transition-transform duration-200 ease-[var(--ease-out)] ${muted ? '' : 'translate-x-4'}`} />
        </span>
      </button>
    </Modal>
  )
}
