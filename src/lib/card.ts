// Draws a result card as a PNG to save or share
export type Mark = 'correct' | 'present' | 'absent'

export type CardInput = {
  mode: string
  headline: string
  unit: string
  stats: [label: string, value: string][]
  chart?: number[]
  /** Rows of colored squares (any width), like a Word board or Link guesses */
  grid?: string[][]
}

const C = { bg: '#0e0f11', panel: '#16181b', line: '#2a2e33', text: '#e8e6e3', sub: '#6b7178', accent: '#8be9c1', warn: '#e9b949', raise: '#2b2f34' }
const W = 1200
const H = 630

export async function renderCard(input: CardInput): Promise<Blob> {
  await document.fonts.ready
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const g = canvas.getContext('2d')!

  g.fillStyle = C.bg
  g.fillRect(0, 0, W, H)
  // A soft accent glow in the corner
  const glow = g.createRadialGradient(W - 140, 90, 0, W - 140, 90, 520)
  glow.addColorStop(0, 'rgba(139,233,193,0.16)')
  glow.addColorStop(1, 'rgba(139,233,193,0)')
  g.fillStyle = glow
  g.fillRect(0, 0, W, H)

  // Logo and mode
  g.fillStyle = C.text
  g.font = '600 34px Geist, sans-serif'
  g.fillText('glyph', 72, 104)
  const lw = g.measureText('glyph').width
  g.fillStyle = C.accent
  g.fillRect(72 + lw + 6, 76, 4, 36)
  g.fillStyle = C.sub
  g.font = '500 26px "Geist Mono", monospace'
  g.textAlign = 'right'
  g.fillText(input.mode, W - 72, 102)
  g.textAlign = 'left'

  // The big number
  g.fillStyle = C.accent
  g.font = '600 168px "Geist Mono", monospace'
  g.fillText(input.headline, 64, 330)
  const hw = g.measureText(input.headline).width
  g.fillStyle = C.sub
  g.font = '500 36px "Geist Mono", monospace'
  g.fillText(input.unit, 64 + hw + 18, 330)

  // Stats row
  input.stats.forEach(([label, value], i) => {
    const x = 72 + i * 190
    g.fillStyle = C.sub
    g.font = '500 22px Geist, sans-serif'
    g.fillText(label, x, 470)
    g.fillStyle = C.text
    g.font = '600 40px "Geist Mono", monospace'
    g.fillText(value, x, 518)
  })

  if (input.chart && input.chart.length > 1) drawChart(g, input.chart, 640, 170, 488, 250)
  if (input.grid) drawGrid(g, input.grid, W - 72, 150)

  g.fillStyle = C.sub
  g.font = '500 20px Geist, sans-serif'
  g.fillText('glyph · fastype, wordl, connect4 and minicross', 72, H - 52)

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not draw the card'))), 'image/png'))
}

function drawChart(g: CanvasRenderingContext2D, data: number[], x: number, y: number, w: number, h: number) {
  const max = Math.max(...data, 10) * 1.1
  const px = (i: number) => x + (i / (data.length - 1)) * w
  const py = (v: number) => y + h - (v / max) * h
  g.strokeStyle = C.line
  g.lineWidth = 1
  for (let k = 0; k <= 3; k++) {
    g.beginPath()
    g.moveTo(x, y + (h / 3) * k)
    g.lineTo(x + w, y + (h / 3) * k)
    g.stroke()
  }
  const fill = g.createLinearGradient(0, y, 0, y + h)
  fill.addColorStop(0, 'rgba(139,233,193,0.25)')
  fill.addColorStop(1, 'rgba(139,233,193,0)')
  g.beginPath()
  data.forEach((v, i) => (i ? g.lineTo(px(i), py(v)) : g.moveTo(px(i), py(v))))
  g.lineTo(x + w, y + h)
  g.lineTo(x, y + h)
  g.closePath()
  g.fillStyle = fill
  g.fill()
  g.beginPath()
  data.forEach((v, i) => (i ? g.lineTo(px(i), py(v)) : g.moveTo(px(i), py(v))))
  g.strokeStyle = C.accent
  g.lineWidth = 4
  g.lineJoin = 'round'
  g.stroke()
}

/** Colors for Word marks, for games that share their board as squares */
export const MARK_COLOR: Record<Mark, string> = { correct: C.accent, present: C.warn, absent: C.raise }

function drawGrid(g: CanvasRenderingContext2D, grid: string[][], right: number, y: number) {
  const gap = 8
  const rows = Math.max(grid.length, 1)
  const cols = Math.max(...grid.map((r) => r.length), 1)
  const s = Math.min(58, (400 - gap * (rows - 1)) / rows, (360 - gap * (cols - 1)) / cols)
  const x = right - cols * (s + gap) + gap
  grid.forEach((row, r) =>
    row.forEach((color, c) => {
      g.fillStyle = color || C.panel
      g.beginPath()
      g.roundRect(x + c * (s + gap), y + r * (s + gap), s, s, 10)
      g.fill()
      if (!color) {
        g.strokeStyle = C.line
        g.lineWidth = 2
        g.stroke()
      }
    }),
  )
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
