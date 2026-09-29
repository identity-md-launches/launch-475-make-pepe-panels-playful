/**
 * Pixel-art helpers for the on-chain Swarm Pepe SVGs.
 *
 * Every image is a list of `<rect>` elements on a 24x24 grid. Parsing the
 * rectangles lets the comic renderer draw a Pepe at any scale with crisp
 * edges and optionally drop the flat background square so the character
 * sits on the chosen panel background.
 */

export const GRID = 24

export interface Rect {
  x: number
  y: number
  w: number
  h: number
  fill: string
}

export interface Sprite {
  /** Rectangles with the full-canvas background removed. */
  rects: Rect[]
  /** Fill of the original background square, if the SVG had one. */
  background: string | null
}

const RECT_RE = /<rect\b([^>]*)\/?>/g
const ATTR_RE = /([a-zA-Z_:-]+)\s*=\s*"([^"]*)"/g

export function parseSvgRects(svg: string): Rect[] {
  const rects: Rect[] = []
  for (const match of svg.matchAll(RECT_RE)) {
    const attrs: Record<string, string> = {}
    for (const a of match[1].matchAll(ATTR_RE)) attrs[a[1]] = a[2]
    const x = Number(attrs.x ?? 0)
    const y = Number(attrs.y ?? 0)
    const w = Number(attrs.width ?? 0)
    const h = Number(attrs.height ?? 0)
    const fill = attrs.fill ?? '#000000'
    if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) continue
    rects.push({ x, y, w, h, fill })
  }
  return rects
}

export function toSprite(svg: string): Sprite {
  const all = parseSvgRects(svg)
  let background: string | null = null
  const rects = all.filter((r) => {
    const coversAll = r.x <= 0 && r.y <= 0 && r.x + r.w >= GRID && r.y + r.h >= GRID
    if (coversAll && background === null) {
      background = r.fill
      return false
    }
    return !coversAll
  })
  return { rects, background }
}

/**
 * Draw a sprite into a canvas context. `size` is the rendered edge length in
 * pixels; `flip` mirrors the character horizontally.
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: Sprite,
  x: number,
  y: number,
  size: number,
  flip = false,
): void {
  const unit = size / GRID
  for (const r of sprite.rects) {
    const gx = flip ? GRID - (r.x + r.w) : r.x
    ctx.fillStyle = r.fill
    // Round to whole device pixels so adjacent rectangles never leave hairline seams.
    const px = Math.round(x + gx * unit)
    const py = Math.round(y + r.y * unit)
    const pw = Math.round(x + (gx + r.w) * unit) - px
    const ph = Math.round(y + (r.y + r.h) * unit) - py
    ctx.fillRect(px, py, pw, ph)
  }
}

/** Rebuild a standalone SVG (with the original background) for `<img>` thumbnails. */
export function spriteToSvgDataUrl(sprite: Sprite, includeBackground = true): string {
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GRID} ${GRID}" shape-rendering="crispEdges">`,
  ]
  if (includeBackground && sprite.background) {
    parts.push(`<rect x="0" y="0" width="${GRID}" height="${GRID}" fill="${sprite.background}"/>`)
  }
  for (const r of sprite.rects) {
    parts.push(`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.fill}"/>`)
  }
  parts.push('</svg>')
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(parts.join(''))
}
