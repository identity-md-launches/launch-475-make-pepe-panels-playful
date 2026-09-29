import type { Attribute } from './chain'
import { DEFAULT_BACKGROUND, getBackground } from './backgrounds'
import { JOKES, type Joke } from './jokes'
import { toSprite, type Sprite } from './pixels'
import samples from './samples.json'

/** A loaded Swarm Pepe ready to be drawn. */
export interface CastMember {
  id: number
  name: string
  attributes: Attribute[]
  svg: string
  sprite: Sprite
  /** True for the Pepes bundled with the site (fetched from chain at build time). */
  sample?: boolean
}

export interface Slot {
  tokenId: number | null
  flip: boolean
  text: string
}

export interface Panel {
  background: string
  left: Slot
  right: Slot
  caption: string
}

export type Layout = 'strip' | 'stack'

export interface Strip {
  panels: [Panel, Panel, Panel]
  layout: Layout
}

export interface AppState {
  cast: CastMember[]
  strip: Strip
}

export const MAX_TEXT = 140
export const MAX_CAPTION = 80
export const MAX_CAST = 12

export function makeMember(t: { id: number; name: string; attributes: Attribute[]; svg: string }, sample = false): CastMember {
  return { id: t.id, name: t.name, attributes: t.attributes, svg: t.svg, sprite: toSprite(t.svg), sample }
}

export const SAMPLE_CAST: CastMember[] = samples.tokens.map((t) => makeMember(t, true))
export const SAMPLES_FETCHED_AT_BLOCK = samples.fetchedAtBlock

function emptySlot(): Slot {
  return { tokenId: null, flip: false, text: '' }
}

export function emptyPanel(): Panel {
  return { background: DEFAULT_BACKGROUND, left: emptySlot(), right: emptySlot(), caption: '' }
}

/** Fill the strip from a joke, casting the first two members as left and right. */
export function applyJoke(joke: Joke, cast: CastMember[], layout: Layout): Strip {
  const a = cast[0]?.id ?? null
  const b = cast[1]?.id ?? a
  const panels = joke.panels.map<Panel>((p) => ({
    background: p.background,
    left: { tokenId: p.left ? a : null, flip: false, text: p.left },
    right: { tokenId: p.right ? b : null, flip: true, text: p.right },
    caption: p.caption,
  })) as [Panel, Panel, Panel]
  return { panels, layout }
}

export function initialState(): AppState {
  const cast = SAMPLE_CAST.slice(0, 2)
  return { cast, strip: applyJoke(JOKES[0], cast, 'strip') }
}

export type Action =
  | { type: 'add-cast'; members: CastMember[] }
  | { type: 'remove-cast'; id: number }
  | { type: 'apply-joke'; joke: Joke }
  | { type: 'set-background'; panel: number; background: string }
  | { type: 'set-slot'; panel: number; side: 'left' | 'right'; patch: Partial<Slot> }
  | { type: 'set-caption'; panel: number; caption: string }
  | { type: 'set-layout'; layout: Layout }
  | { type: 'restore'; state: AppState }
  | { type: 'reset' }

function updatePanel(strip: Strip, index: number, fn: (p: Panel) => Panel): Strip {
  const panels = strip.panels.map((p, i) => (i === index ? fn(p) : p)) as [Panel, Panel, Panel]
  return { ...strip, panels }
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'add-cast': {
      const known = new Set(state.cast.map((m) => m.id))
      const fresh = action.members.filter((m) => !known.has(m.id))
      const cast = [...state.cast, ...fresh].slice(0, MAX_CAST)
      // If no panel has a character yet, seat the new arrivals in the first empty slots.
      const used = state.strip.panels.some((p) => p.left.tokenId !== null || p.right.tokenId !== null)
      if (used || fresh.length === 0) return { ...state, cast }
      const a = fresh[0].id
      const b = fresh[1]?.id ?? a
      const panels = state.strip.panels.map<Panel>((p) => ({
        ...p,
        left: { ...p.left, tokenId: p.left.text ? a : p.left.tokenId },
        right: { ...p.right, tokenId: p.right.text ? b : p.right.tokenId },
      })) as [Panel, Panel, Panel]
      return { cast, strip: { ...state.strip, panels } }
    }
    case 'remove-cast': {
      const cast = state.cast.filter((m) => m.id !== action.id)
      const panels = state.strip.panels.map<Panel>((p) => ({
        ...p,
        left: p.left.tokenId === action.id ? { ...p.left, tokenId: null } : p.left,
        right: p.right.tokenId === action.id ? { ...p.right, tokenId: null } : p.right,
      })) as [Panel, Panel, Panel]
      return { cast, strip: { ...state.strip, panels } }
    }
    case 'apply-joke':
      return { ...state, strip: applyJoke(action.joke, state.cast, state.strip.layout) }
    case 'set-background':
      return { ...state, strip: updatePanel(state.strip, action.panel, (p) => ({ ...p, background: action.background })) }
    case 'set-slot':
      return {
        ...state,
        strip: updatePanel(state.strip, action.panel, (p) => ({
          ...p,
          [action.side]: { ...p[action.side], ...action.patch },
        })),
      }
    case 'set-caption':
      return { ...state, strip: updatePanel(state.strip, action.panel, (p) => ({ ...p, caption: action.caption })) }
    case 'set-layout':
      return { ...state, strip: { ...state.strip, layout: action.layout } }
    case 'restore':
      return action.state
    case 'reset':
      return initialState()
  }
}

/* ---------- persistence ---------- */

const STORAGE_KEY = 'pepe-panels:v1'

interface StoredState {
  cast: Array<{ id: number; name: string; attributes: Attribute[]; svg: string; sample?: boolean }>
  strip: Strip
}

export function loadState(): AppState {
  if (typeof localStorage === 'undefined') return initialState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState()
    const parsed = JSON.parse(raw) as StoredState
    if (!Array.isArray(parsed.cast) || !parsed.strip || !Array.isArray(parsed.strip.panels)) return initialState()
    const cast = parsed.cast.map((t) => makeMember(t, t.sample))
    const ids = new Set(cast.map((m) => m.id))
    const cleanSlot = (s: Partial<Slot> | undefined): Slot => ({
      tokenId: s && typeof s.tokenId === 'number' && ids.has(s.tokenId) ? s.tokenId : null,
      flip: !!s?.flip,
      text: typeof s?.text === 'string' ? s.text.slice(0, MAX_TEXT) : '',
    })
    const panels = [0, 1, 2].map((i) => {
      const p = parsed.strip.panels[i] as Partial<Panel> | undefined
      return {
        background: getBackground(typeof p?.background === 'string' ? p.background : '').id,
        left: cleanSlot(p?.left),
        right: cleanSlot(p?.right),
        caption: typeof p?.caption === 'string' ? p.caption.slice(0, MAX_CAPTION) : '',
      }
    }) as [Panel, Panel, Panel]
    const layout: Layout = parsed.strip.layout === 'stack' ? 'stack' : 'strip'
    return { cast, strip: { panels, layout } }
  } catch {
    return initialState()
  }
}

export function saveState(state: AppState): void {
  if (typeof localStorage === 'undefined') return
  const stored: StoredState = {
    cast: state.cast.map(({ id, name, attributes, svg, sample }) => ({ id, name, attributes, svg, sample })),
    strip: state.strip,
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // Storage full or blocked: the session still works, it just will not persist.
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
