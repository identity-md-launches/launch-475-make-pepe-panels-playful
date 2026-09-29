/**
 * Draws the whole comic strip into a canvas. The preview on the page and the
 * exported PNG both come from this one function, so what you see is what you
 * download.
 */

import { getBackground } from './backgrounds'
import { drawSprite } from './pixels'
import type { CastMember, Panel, Slot, Strip } from './state'

export const PANEL = 560
export const GUTTER = 20
export const MARGIN = 24
export const FRAME = 6

const COMIC_FAMILY = '"Comic Neue", "Comic Sans MS", "Chalkboard SE", sans-serif'
const BUBBLE_SIZES = [26, 24, 22, 20, 18]
const BUBBLE_FONT = `700 ${BUBBLE_SIZES[0]}px ${COMIC_FAMILY}`
const CAPTION_FONT = `400 24px ${COMIC_FAMILY}`
const BUBBLE_PAD = 16
const CAPTION_HEIGHT = 60
const CHARACTER_SIZE = 264
const INK = '#111111'
const PAPER = '#ffffff'

export function stripSize(layout: Strip['layout']): { width: number; height: number } {
  const across = layout === 'strip' ? 3 : 1
  const down = layout === 'strip' ? 1 : 3
  return {
    width: MARGIN * 2 + PANEL * across + GUTTER * (across - 1),
    height: MARGIN * 2 + PANEL * down + GUTTER * (down - 1),
  }
}

/** Load the comic font faces once so canvas text renders with them. */
export async function ensureFonts(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return
  try {
    await Promise.all([document.fonts.load(BUBBLE_FONT), document.fonts.load(CAPTION_FONT)])
  } catch {
    // Fall back to the system stack; rendering still works.
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lines.push('')
      continue
    }
    let line = ''
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (ctx.measureText(candidate).width <= maxWidth || !line) {
        line = candidate
      } else {
        lines.push(line)
        line = word
      }
    }
    lines.push(line)
  }
  return lines
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

interface Placement {
  slot: Slot
  member: CastMember | null
  /** Character box (panel-relative). */
  x: number
  y: number
  /** Horizontal band the bubble may occupy (panel-relative). */
  bubbleMin: number
  bubbleMax: number
}

interface BubbleColumn {
  min: number
  max: number
  maxLines: number
}

function drawBubble(ctx: CanvasRenderingContext2D, text: string, column: BubbleColumn, top: number, target: { x: number; y: number } | null) {
  const maxWidth = column.max - column.min
  // Start at the largest size and step down until the text fits the line budget.
  let size = BUBBLE_SIZES[0]
  let lines: string[] = []
  for (const candidate of BUBBLE_SIZES) {
    size = candidate
    ctx.font = `700 ${size}px ${COMIC_FAMILY}`
    lines = wrapText(ctx, text, maxWidth - BUBBLE_PAD * 2)
    if (lines.length <= column.maxLines) break
  }
  const lineHeight = Math.round(size * 1.25)
  const textWidth = Math.max(...lines.map((l) => ctx.measureText(l).width), 40)
  const w = Math.min(maxWidth, textWidth + BUBBLE_PAD * 2)
  const h = lines.length * lineHeight + BUBBLE_PAD * 2 - 6
  const centerX = (column.min + column.max) / 2
  const x = Math.max(column.min, Math.min(column.max - w, centerX - w / 2))
  const y = top

  ctx.lineWidth = 4
  ctx.strokeStyle = INK
  ctx.fillStyle = PAPER
  ctx.lineJoin = 'round'
  if (target) {
    // Tail: a triangle from the bubble's bottom edge toward the character's head.
    const baseX = Math.max(x + 24, Math.min(x + w - 24, target.x))
    const tipY = Math.min(target.y, y + h + 56)
    const tipX = baseX + (target.x > baseX ? 6 : -6)
    ctx.beginPath()
    ctx.moveTo(baseX - 14, y + h - 2)
    ctx.lineTo(tipX, tipY)
    ctx.lineTo(baseX + 14, y + h - 2)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  roundRect(ctx, x, y, w, h, 22)
  ctx.fill()
  ctx.stroke()
  if (target) {
    // Cover the tail's top edge so the outline reads as one shape.
    const baseX = Math.max(x + 24, Math.min(x + w - 24, target.x))
    ctx.fillStyle = PAPER
    ctx.fillRect(baseX - 12, y + h - 4, 24, 6)
  }

  ctx.fillStyle = INK
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'center'
  lines.forEach((line, i) => {
    ctx.fillText(line, x + w / 2, y + BUBBLE_PAD + size * 0.85 + i * lineHeight)
  })
  ctx.textAlign = 'start'
  return h
}

function drawCaption(ctx: CanvasRenderingContext2D, caption: string) {
  const y = PANEL - CAPTION_HEIGHT
  ctx.fillStyle = PAPER
  ctx.fillRect(0, y, PANEL, CAPTION_HEIGHT)
  ctx.fillStyle = INK
  ctx.fillRect(0, y, PANEL, 4)
  ctx.font = CAPTION_FONT
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  let text = caption
  while (ctx.measureText(text).width > PANEL - 32 && text.length > 3) text = text.slice(0, -2).trimEnd() + '…'
  ctx.fillText(text, PANEL / 2, y + CAPTION_HEIGHT / 2 + 2)
  ctx.textAlign = 'start'
  ctx.textBaseline = 'alphabetic'
}

function drawPanel(ctx: CanvasRenderingContext2D, panel: Panel, castById: Map<number, CastMember>) {
  // Background, clipped to the panel.
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, PANEL, PANEL)
  ctx.clip()
  getBackground(panel.background).draw(ctx, PANEL, PANEL)

  const hasCaption = panel.caption.trim().length > 0
  const floor = PANEL - (hasCaption ? CAPTION_HEIGHT : 0) - 14
  const leftMember = panel.left.tokenId === null ? null : (castById.get(panel.left.tokenId) ?? null)
  const rightMember = panel.right.tokenId === null ? null : (castById.get(panel.right.tokenId) ?? null)
  const leftActive = leftMember !== null || panel.left.text.trim().length > 0
  const rightActive = rightMember !== null || panel.right.text.trim().length > 0
  const solo = leftActive !== rightActive

  const inset = FRAME + 10
  const placements: Placement[] = []
  if (leftActive) {
    const x = solo ? (PANEL - CHARACTER_SIZE) / 2 : 36
    placements.push({
      slot: panel.left,
      member: leftMember,
      x,
      y: floor - CHARACTER_SIZE,
      bubbleMin: solo ? PANEL * 0.15 : inset,
      bubbleMax: solo ? PANEL * 0.85 : PANEL / 2 - 6,
    })
  }
  if (rightActive) {
    const x = solo ? (PANEL - CHARACTER_SIZE) / 2 : PANEL - 36 - CHARACTER_SIZE
    placements.push({
      slot: panel.right,
      member: rightMember,
      x,
      y: floor - CHARACTER_SIZE,
      bubbleMin: solo ? PANEL * 0.15 : PANEL / 2 + 6,
      bubbleMax: solo ? PANEL * 0.85 : PANEL - inset,
    })
  }

  for (const p of placements) {
    if (p.member) drawSprite(ctx, p.member.sprite, p.x, p.y, CHARACTER_SIZE, p.slot.flip)
  }
  for (const p of placements) {
    const text = p.slot.text.trim()
    if (!text) continue
    const target = p.member ? { x: p.x + CHARACTER_SIZE / 2 + (p.slot.flip ? -20 : 20), y: p.y + 30 } : null
    drawBubble(ctx, text, { min: p.bubbleMin, max: p.bubbleMax, maxLines: solo ? 6 : 5 }, 22, target)
  }

  if (hasCaption) drawCaption(ctx, panel.caption.trim())
  ctx.restore()

  // Frame.
  ctx.lineWidth = FRAME
  ctx.strokeStyle = INK
  ctx.strokeRect(FRAME / 2, FRAME / 2, PANEL - FRAME, PANEL - FRAME)
}

/** Render the strip into `canvas` at full export resolution. */
export function renderStrip(canvas: HTMLCanvasElement, strip: Strip, cast: CastMember[]): void {
  const { width, height } = stripSize(strip.layout)
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, width, height)
  const castById = new Map(cast.map((m) => [m.id, m]))
  strip.panels.forEach((panel, i) => {
    const ox = MARGIN + (strip.layout === 'strip' ? i * (PANEL + GUTTER) : 0)
    const oy = MARGIN + (strip.layout === 'stack' ? i * (PANEL + GUTTER) : 0)
    ctx.save()
    ctx.translate(ox, oy)
    drawPanel(ctx, panel, castById)
    ctx.restore()
  })
}

/** Encode the canvas as a PNG blob. */
export function toPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG encoding failed'))), 'image/png')
  })
}

/** Suggested file name, e.g. `pepe-panels-1-2.png`. */
export function exportFileName(strip: Strip): string {
  const ids = new Set<number>()
  for (const p of strip.panels) {
    if (p.left.tokenId !== null) ids.add(p.left.tokenId)
    if (p.right.tokenId !== null) ids.add(p.right.tokenId)
  }
  const suffix = ids.size ? '-' + [...ids].sort((a, b) => a - b).join('-') : ''
  return `pepe-panels${suffix}.png`
}
