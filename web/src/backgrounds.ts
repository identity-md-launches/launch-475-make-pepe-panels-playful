/**
 * Panel backgrounds, drawn with canvas primitives so the site ships no image
 * assets. Each background fills a `w` x `h` rectangle at the origin.
 */

export interface Background {
  id: string
  name: string
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
}

function fill(ctx: CanvasRenderingContext2D, w: number, h: number, color: string) {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, w, h)
}

function verticalGradient(ctx: CanvasRenderingContext2D, w: number, h: number, stops: Array<[number, string]>) {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  for (const [at, color] of stops) g.addColorStop(at, color)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

/** Deterministic pseudo-random sequence so a background looks the same on every render. */
function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(x, y, s, 0, Math.PI * 2)
  ctx.arc(x + s * 0.9, y - s * 0.4, s * 0.8, 0, Math.PI * 2)
  ctx.arc(x + s * 1.8, y, s * 0.9, 0, Math.PI * 2)
  ctx.arc(x + s * 0.9, y + s * 0.35, s * 0.9, 0, Math.PI * 2)
  ctx.fill()
}

export const BACKGROUNDS: Background[] = [
  {
    id: 'sky',
    name: 'Swamp sky',
    draw(ctx, w, h) {
      verticalGradient(ctx, w, h, [
        [0, '#8ecdf5'],
        [0.65, '#d6ecf9'],
        [0.66, '#5f9b4a'],
        [1, '#3f7a34'],
      ])
      cloud(ctx, w * 0.18, h * 0.2, w * 0.06)
      cloud(ctx, w * 0.62, h * 0.12, w * 0.05)
      cloud(ctx, w * 0.78, h * 0.3, w * 0.04)
    },
  },
  {
    id: 'hive',
    name: 'Hive',
    draw(ctx, w, h) {
      fill(ctx, w, h, '#f6c445')
      ctx.strokeStyle = '#c98f1a'
      ctx.lineWidth = Math.max(2, w * 0.008)
      const r = w * 0.07
      const dx = r * Math.sqrt(3)
      const dy = r * 1.5
      for (let row = -1; row * dy < h + r; row++) {
        for (let col = -1; col * dx < w + dx; col++) {
          const cx = col * dx + (row % 2 ? dx / 2 : 0)
          const cy = row * dy
          ctx.beginPath()
          for (let i = 0; i < 6; i++) {
            const a = Math.PI / 6 + (i * Math.PI) / 3
            const px = cx + r * Math.cos(a)
            const py = cy + r * Math.sin(a)
            if (i === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          }
          ctx.closePath()
          ctx.stroke()
        }
      }
    },
  },
  {
    id: 'night',
    name: 'Night chain',
    draw(ctx, w, h) {
      verticalGradient(ctx, w, h, [
        [0, '#0f1a3a'],
        [1, '#22346b'],
      ])
      const rnd = seeded(7)
      ctx.fillStyle = '#ffffff'
      for (let i = 0; i < 70; i++) {
        const x = rnd() * w
        const y = rnd() * h * 0.8
        const s = 1 + rnd() * 2.5
        ctx.fillRect(x, y, s, s)
      }
      // Linked blocks along the horizon.
      ctx.strokeStyle = '#6d86d9'
      ctx.lineWidth = Math.max(2, w * 0.006)
      const bw = w * 0.11
      const by = h * 0.86
      for (let i = 0; i < 8; i++) {
        const bx = i * bw * 1.35 - bw * 0.3
        ctx.strokeRect(bx, by, bw, bw * 0.55)
        ctx.beginPath()
        ctx.moveTo(bx + bw, by + bw * 0.27)
        ctx.lineTo(bx + bw * 1.35, by + bw * 0.27)
        ctx.stroke()
      }
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    draw(ctx, w, h) {
      verticalGradient(ctx, w, h, [
        [0, '#ff9a5b'],
        [0.5, '#ffd28a'],
        [0.72, '#e2725b'],
        [0.73, '#4b2a5a'],
        [1, '#2c1a3b'],
      ])
      ctx.fillStyle = '#fff1b8'
      ctx.beginPath()
      ctx.arc(w * 0.5, h * 0.72, w * 0.14, Math.PI, 0)
      ctx.fill()
    },
  },
  {
    id: 'office',
    name: 'Meme office',
    draw(ctx, w, h) {
      fill(ctx, w, h, '#e8e4dc')
      // Window.
      ctx.fillStyle = '#b8dcf2'
      ctx.fillRect(w * 0.58, h * 0.1, w * 0.3, h * 0.32)
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = Math.max(4, w * 0.014)
      ctx.strokeRect(w * 0.58, h * 0.1, w * 0.3, h * 0.32)
      ctx.beginPath()
      ctx.moveTo(w * 0.73, h * 0.1)
      ctx.lineTo(w * 0.73, h * 0.42)
      ctx.moveTo(w * 0.58, h * 0.26)
      ctx.lineTo(w * 0.88, h * 0.26)
      ctx.stroke()
      // Floor and desk.
      ctx.fillStyle = '#c9b79a'
      ctx.fillRect(0, h * 0.72, w, h * 0.28)
      ctx.fillStyle = '#8a6b4a'
      ctx.fillRect(w * 0.05, h * 0.66, w * 0.5, h * 0.05)
      ctx.fillRect(w * 0.08, h * 0.71, w * 0.03, h * 0.2)
      ctx.fillRect(w * 0.49, h * 0.71, w * 0.03, h * 0.2)
    },
  },
  {
    id: 'chart',
    name: 'Trading floor',
    draw(ctx, w, h) {
      fill(ctx, w, h, '#101613')
      ctx.strokeStyle = '#1f2b25'
      ctx.lineWidth = 1
      const step = w / 10
      for (let x = 0; x <= w; x += step) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let y = 0; y <= h; y += step) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }
      const rnd = seeded(42)
      const cw = w / 16
      let price = h * 0.5
      for (let i = 0; i < 16; i++) {
        const open = price
        const close = price + (rnd() - 0.45) * h * 0.14
        const hi = Math.min(open, close) - rnd() * h * 0.05
        const lo = Math.max(open, close) + rnd() * h * 0.05
        const x = i * cw + cw / 2
        const up = close < open
        ctx.strokeStyle = up ? '#4ade80' : '#f87171'
        ctx.fillStyle = up ? '#4ade80' : '#f87171'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x, hi)
        ctx.lineTo(x, lo)
        ctx.stroke()
        ctx.fillRect(x - cw * 0.3, Math.min(open, close), cw * 0.6, Math.max(2, Math.abs(close - open)))
        price = close
      }
    },
  },
  {
    id: 'green',
    name: 'Green screen',
    draw(ctx, w, h) {
      fill(ctx, w, h, '#3fbf4a')
    },
  },
  {
    id: 'paper',
    name: 'Dot paper',
    draw(ctx, w, h) {
      fill(ctx, w, h, '#fbfaf5')
      ctx.fillStyle = '#c9c4b4'
      const step = w / 14
      for (let y = step / 2; y < h; y += step) {
        for (let x = step / 2; x < w; x += step) {
          ctx.fillRect(x - 1.5, y - 1.5, 3, 3)
        }
      }
    },
  },
]

export const DEFAULT_BACKGROUND = BACKGROUNDS[0].id

export function getBackground(id: string): Background {
  return BACKGROUNDS.find((b) => b.id === id) ?? BACKGROUNDS[0]
}
