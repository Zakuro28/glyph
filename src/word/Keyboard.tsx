import { CornerDownLeft, Delete } from 'lucide-react'
import type { Mark } from './logic'

const ROWS = ['qwertyuiop', 'asdfghjkl', '>zxcvbnm<']

const LOOK: Record<Mark | 'none', string> = {
  none: 'bg-raise text-text hover:bg-[#363b41]',
  correct: 'bg-accent text-bg',
  present: 'bg-warn text-bg',
  absent: 'bg-panel text-sub/60',
}

/** The on-screen keyboard: each key takes the best color its letter has earned so far */
export default function Keyboard({ marks, onKey, compact = false }: { marks: Record<string, Mark>; onKey: (k: string) => void; compact?: boolean }) {
  return (
    <div className="mx-auto flex w-full max-w-[34rem] flex-col gap-1.5 select-none" aria-label="Keyboard">
      {ROWS.map((row, r) => (
        <div key={r} className="flex justify-center gap-1.5">
          {r === 1 && <span className="flex-[0.5]" aria-hidden />}
          {[...row].map((k) => {
            const wide = k === '>' || k === '<'
            const label = k === '>' ? 'enter' : k === '<' ? 'back' : k
            return (
              <button
                key={k}
                type="button"
                tabIndex={-1}
                // Keep focus where it is, so a physical Enter never re-presses the last tapped key
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onKey(label)}
                aria-label={k === '>' ? 'Enter' : k === '<' ? 'Delete' : k}
                className={`press grid place-items-center rounded-lg font-mono text-sm font-semibold uppercase ${compact ? 'h-11' : 'h-[3.25rem] sm:h-[3.6rem]'} ${wide ? 'flex-[1.5] text-xs' : 'flex-1'} ${LOOK[wide ? 'none' : (marks[k] ?? 'none')]}`}
                style={{ transition: 'transform 160ms var(--ease-out), background-color 300ms ease, color 300ms ease' }}
              >
                {k === '>' ? <CornerDownLeft className="size-5" /> : k === '<' ? <Delete className="size-5" /> : k}
              </button>
            )
          })}
          {r === 1 && <span className="flex-[0.5]" aria-hidden />}
        </div>
      ))}
    </div>
  )
}
