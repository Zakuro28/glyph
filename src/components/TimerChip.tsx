import { Timer } from 'lucide-react'
import { clock } from '../mini/logic'

/** The running clock shown beside each daily game; it turns green once the puzzle is solved */
export default function TimerChip({ seconds, done }: { seconds: number; done: boolean }) {
  return (
    <span className={`flex items-center gap-1.5 px-1 font-mono text-sm tabular-nums transition-colors duration-300 ${done ? 'text-accent' : 'text-sub'}`} aria-label={`Time ${clock(seconds)}`}>
      <Timer className="size-4" aria-hidden /> {clock(seconds)}
    </span>
  )
}
