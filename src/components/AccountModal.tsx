import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { LoaderCircle, LogOut, Volume2, VolumeX } from 'lucide-react'
import Modal from './Modal'
import { online, signIn, signOut, signUp, useAccount } from '../lib/online'
import { isMuted, setMuted } from '../lib/sound'

const field = 'w-full rounded-xl bg-bg px-4 py-3 text-base ring-1 ring-line outline-none transition-shadow focus:ring-2 focus:ring-accent/70 placeholder:text-sub'

/** Settings and account: sound, then sign in / create account, or who you're signed in as */
export default function AccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const account = useAccount()
  const [muted, setMutedState] = useState(isMuted)
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    const res = mode === 'in' ? await signIn(email, password) : await signUp(email, password, username)
    setBusy(false)
    if (res.error) setMessage({ kind: 'error', text: res.error })
    else if ('confirm' in res && res.confirm) setMessage({ kind: 'info', text: 'Check your email to confirm your account, then sign in.' })
    else onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={account ? `Hi, ${account.username}` : 'Settings'}>
      <button
        type="button"
        onClick={() => {
          setMuted(!muted)
          setMutedState(!muted)
        }}
        aria-pressed={!muted}
        className="press mt-5 flex w-full items-center justify-between rounded-2xl bg-bg px-4 py-3.5 ring-1 ring-line hover:bg-raise"
      >
        <span className="flex items-center gap-3 font-medium">
          {muted ? <VolumeX className="size-5 text-sub" aria-hidden /> : <Volume2 className="size-5 text-accent" aria-hidden />}
          Sound
        </span>
        <span className={`relative h-6 w-10 rounded-full transition-colors duration-200 ${muted ? 'bg-raise' : 'bg-accent'}`} aria-hidden>
          <span className={`absolute top-1 left-1 size-4 rounded-full bg-text transition-transform duration-200 ease-[var(--ease-out)] ${muted ? '' : 'translate-x-4'}`} />
        </span>
      </button>

      {online && account && (
        <div className="mt-6 border-t border-line pt-6">
          <p className="text-sm text-sub">Your stats, streaks and puzzle progress are saved to your account and follow you to any device. Daily results and typing bests go on the leaderboards.</p>
          <button type="button" onClick={() => void signOut()} className="press mt-5 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium ring-1 ring-line hover:bg-raise">
            <LogOut className="size-4" aria-hidden /> Sign out
          </button>
        </div>
      )}

      {online && !account && (
        <form onSubmit={submit} className="mt-6 border-t border-line pt-6">
          <div className="flex rounded-full bg-bg p-1 text-sm ring-1 ring-line">
            {(['in', 'up'] as const).map((m) => (
              <button key={m} type="button" onClick={() => (setMode(m), setMessage(null))} className={`press relative isolate flex-1 rounded-full py-2 font-medium ${mode === m ? 'text-text' : 'text-sub hover:text-text'}`}>
                {mode === m && <motion.span layoutId="auth-mode" className="absolute inset-0 -z-10 rounded-full bg-raise" transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }} />}
                {m === 'in' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm text-sub">Save your progress across devices and get on the leaderboards.</p>
          <div className="mt-4 space-y-3">
            <AnimatePresence initial={false}>
              {mode === 'up' && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={{ duration: 0.2 }}>
                  <input className={field} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" autoComplete="username" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_]+" aria-label="Username" />
                </motion.div>
              )}
            </AnimatePresence>
            <input className={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="email" required aria-label="Email" />
            <input className={field} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} required minLength={6} aria-label="Password" />
          </div>
          {message && <p className={`mt-3 text-sm ${message.kind === 'error' ? 'text-bad' : 'text-accent'}`}>{message.text}</p>}
          <button type="submit" disabled={busy} className="press mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 font-semibold text-bg hover:bg-accent/90 disabled:opacity-60">
            {busy && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            {mode === 'in' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      )}
    </Modal>
  )
}
