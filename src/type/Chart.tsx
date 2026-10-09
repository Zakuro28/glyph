import { useState } from 'react'
import { motion } from 'motion/react'
import type { Sample } from './engine'

const W = 600
const H = 200
const PAD = { l: 34, r: 8, t: 10, b: 24 }

/** WPM over the test (bright), raw speed per second (dim), and mistakes as red marks. Hover for exact values. */
export default function Chart({ samples }: { samples: Sample[] }) {
  const [hover, setHover] = useState<number | null>(null)
  if (samples.length < 2) return <div className="grid h-48 place-items-center rounded-2xl text-sm text-sub ring-1 ring-line">Too short for a graph</div>

  const max = Math.ceil((Math.max(...samples.map((s) => Math.max(s.wpm, s.raw)), 20) * 1.15) / 10) * 10
  const tMax = samples.at(-1)!.t
  const x = (t: number) => PAD.l + ((t - samples[0].t) / (tMax - samples[0].t || 1)) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b)
  const path = (k: 'wpm' | 'raw') => samples.map((s, i) => `${i ? 'L' : 'M'}${x(s.t).toFixed(1)},${y(s[k]).toFixed(1)}`).join('')
  const ticks = [0, max / 2, max]
  const h = hover === null ? null : samples[hover]

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full overflow-visible"
        role="img"
        aria-label={`Speed over time, ending at ${samples.at(-1)!.wpm} words per minute`}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const px = ((e.clientX - r.left) / r.width) * W
          let best = 0
          samples.forEach((s, i) => Math.abs(x(s.t) - px) < Math.abs(x(samples[best].t) - px) && (best = i))
          setHover(best)
        }}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--color-accent)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="var(--color-line)" strokeDasharray={v ? '3 5' : undefined} />
            <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" className="fill-sub font-mono text-[11px]">
              {v}
            </text>
          </g>
        ))}
        {samples.map((s, i) =>
          i % Math.ceil(samples.length / 8) === 0 || i === samples.length - 1 ? (
            <text key={s.t} x={x(s.t)} y={H - 4} textAnchor="middle" className="fill-sub font-mono text-[11px]">
              {Math.round(s.t)}
            </text>
          ) : null,
        )}
        <motion.path d={`${path('wpm')}L${x(tMax)},${y(0)}L${x(samples[0].t)},${y(0)}Z`} fill="url(#fill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.5 }} />
        <motion.path d={path('raw')} fill="none" stroke="var(--color-sub)" strokeWidth="1.5" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }} />
        <motion.path d={path('wpm')} fill="none" stroke="var(--color-accent)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1], delay: 0.1 }} />
        {samples.map((s) =>
          s.errors ? (
            <motion.g key={`e${s.t}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
              <path d={`M${x(s.t) - 4},${y(s.raw) - 4}l8,8m0,-8l-8,8`} stroke="var(--color-bad)" strokeWidth="2" strokeLinecap="round" />
            </motion.g>
          ) : null,
        )}
        {h && (
          <g>
            <line x1={x(h.t)} x2={x(h.t)} y1={PAD.t} y2={H - PAD.b} stroke="var(--color-sub)" strokeDasharray="2 4" />
            <circle cx={x(h.t)} cy={y(h.wpm)} r="5" fill="var(--color-bg)" stroke="var(--color-accent)" strokeWidth="2.5" />
          </g>
        )}
      </svg>
      {h && (
        <div
          className="pointer-events-none absolute top-0 rounded-lg bg-panel px-3 py-2 font-mono text-xs ring-1 ring-line"
          style={{ left: `${(x(h.t) / W) * 100}%`, transform: `translateX(${x(h.t) > W * 0.7 ? 'calc(-100% - 12px)' : '12px'})` }}
        >
          <p className="text-sub">{Math.round(h.t)}s</p>
          <p className="text-accent">{h.wpm} wpm</p>
          <p className="text-sub">{h.raw} raw</p>
          {h.errors > 0 && <p className="text-bad">{h.errors} errors</p>}
        </div>
      )}
      <div className="mt-2 flex gap-4 text-xs text-sub">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-accent" aria-hidden /> wpm
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-sub" aria-hidden /> raw
        </span>
        <span className="flex items-center gap-1.5 text-bad">× errors</span>
      </div>
    </div>
  )
}
