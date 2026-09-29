# Pepe Panels design system

This documents the design as implemented in `web/src/styles.css` and the React components under
`web/src/components/`. It is written so another page or feature can reuse the same tokens and
patterns without re-deriving them. Values are quoted from source; rendered behaviour is noted
where it was observed in the browser review (see `artifacts/validation.md`).

## Overview

Pepe Panels is a small single-page tool for Swarm Pepe collectors: add Pepes to a cast, fill
three panels, export a PNG. The interface is deliberately plain and warm ("paper") so the comic
preview, with its black-framed panels and bright procedural backgrounds, is the most colourful
thing on the page. The interface never competes with the comic.

Hierarchy comes from spacing and weight, not lines or colour: sections are separated by 32 px,
cards group related controls, and the single filled green button per view marks the primary
action ("Add Pepes" in the cast form, "Download PNG" in the preview). The tone is friendly and
direct in instructional copy, neutral in controls and plain in errors.

System-wide rules: the token set below, one UI font, one comic font used only inside the canvas,
44 px control height, 16 px form text everywhere, sentence case for every label and button, verb-first
button labels. Page-specific arrangement: the two-column editor/preview split and the order
Cast, Starter jokes, Panels, Preview are decisions for this page, not a rule for every future page.

There is one light theme. There is no dark theme, no theme switch and no colour-scheme media
query beyond `<meta name="color-scheme" content="light">`.

## Colors

All tokens are CSS custom properties on `:root` in `web/src/styles.css`, written in hex.
Primitives are named by hue and step; components reference only the semantic tokens.

### Primitives

| Token | Value | Notes |
| --- | --- | --- |
| `--stone-50` | `#fbfaf6` | defined, currently unused |
| `--stone-100` | `#f6f5ef` | page background, slot background |
| `--stone-200` | `#eeece3` | subtle fills (badge, button hover) |
| `--stone-300` | `#d6d3c4` | soft borders |
| `--stone-500` | `#8f8b7c` | strong borders |
| `--stone-600` | `#5b5f55` | secondary text |
| `--stone-900` | `#1d1f1a` | primary text |
| `--green-100` | `#e3f1e0` | selection highlight |
| `--green-600` | `#2f7d32` | accent |
| `--green-700` | `#26682a` | accent hover |
| `--red-700` | `#b3261e` | error text |
| `--blue-600` | `#0b57d0` | focus ring |

### Semantic roles

| Token | Points to | Job |
| --- | --- | --- |
| `--color-bg-page` | stone-100 | `body` background; also the inset "slot" boxes inside panel cards |
| `--color-bg-surface` | `#ffffff` | cards, inputs, buttons, undo bar, preview frame |
| `--color-bg-subtle` | stone-200 | button hover fill, badge fill |
| `--color-bg-accent-subtle` | green-100 | `::selection` background only |
| `--color-border` | stone-300 | card and preview-frame borders, footer rule |
| `--color-border-strong` | stone-500 | input, select, textarea and secondary button borders |
| `--color-text` | stone-900 | body and heading text |
| `--color-text-secondary` | stone-600 | ledes, hints, footnotes, traits, status text, slot titles, summary |
| `--color-accent` | green-600 | links, kicker text, primary button fill, `accent-color` of checkboxes and radios |
| `--color-accent-hover` | green-700 | link hover, primary button hover |
| `--color-on-accent` | `#ffffff` | text on the primary button |
| `--color-danger` | red-700 | error list text, invalid-field border and 1 px ring |
| `--color-focus` | blue-600 | `:focus-visible` outline everywhere |
| `--color-image-outline` | `rgb(0 0 0 / 0.1)` | 1 px outline on cast thumbnails |

Rules: green means interactive or primary (links, the one filled button, the checked state of
native checkboxes/radios); it is never used on static text except the small uppercase kicker
under the site title. Blue is reserved for focus. Red is reserved for errors and always appears
with text, never as the only cue.

Measured contrast (WCAG 2, computed from rendered colours in the review): text on page 15.2:1,
secondary text 5.98:1 on page and 6.54:1 on white, accent text 4.69:1 on page, white on the
accent fill 5.12:1, error text 6.54:1 on white, placeholder 4.61:1 on white, focus ring 5.85:1 on
page and 6.39:1 on white. The focus ring is offset 2 px so it sits on the surrounding surface,
not on the green fill (where it would measure 1.25:1).

The comic itself uses fixed ink colours inside `web/src/render.ts` (`INK = #111111`,
`PAPER = #ffffff`) and the background palettes in `web/src/backgrounds.ts`; these are canvas
constants, not page tokens.

## Typography

Interface font: `--font-ui: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue',
Arial, sans-serif`. No web font is loaded for the interface.

Comic font: `--font-comic: 'Comic Neue', 'Comic Sans MS', 'Chalkboard SE', sans-serif`. Comic
Neue 400 and 700 (latin subset, woff2, OFL-1.1) are bundled from `@fontsource/comic-neue` and
registered through the FontFace API in `web/src/fonts.ts` so the canvas can await them. They
are used only inside the canvas: 700 for speech bubbles (26 px, stepping down through 24, 22,
20, 18 until the text fits five lines, six for a solo speaker), 400 at 24 px for captions.
The review confirmed both faces reported `loaded` in `document.fonts`.

Scale (rem, on a 16 px root):

| Token | Size | Used for |
| --- | --- | --- |
| `--text-xs` | 0.8125rem (13 px) | kicker, badge, footnotes |
| `--text-sm` | 0.875rem (14 px) | field labels, hints, status, errors, traits, small buttons, footer |
| `--text-base` | 1rem (16 px) | body, inputs, buttons, h3 |
| `--text-lg` | 1.125rem (18 px) | panel legends ("Panel 1") |
| `--text-xl` | 1.375rem (22 px) | h2 section headings |
| `--text-2xl` | 2rem (32 px) | h1 |

Roles: `h1` 800 weight, line-height 1.1, letter-spacing −0.02em, `text-wrap: balance`; `h2` 700,
1.2, −0.01em, balanced; `h3` 600, 1.3 (slot titles override to 14 px uppercase with +0.04em
tracking and secondary colour); body line-height 1.5; ledes, hints and footnotes use
`text-wrap: pretty`. Labels and legends are 14 px at weight 600. No weight below 400 is used.

Measure: `--measure: 65ch` caps ledes, footnotes and footer copy. Form controls always render
at 16 px (`--text-base`) so iOS Safari does not zoom. Links use `text-underline-position:
from-font`, `text-decoration-thickness: from-font` and `text-decoration-skip-ink: auto`.
Root has `-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale`.
`::selection` uses the accent-subtle fill with primary text.

## Layout

Spacing tokens on a 4 px base: `--space-1` 4, `-2` 8, `-3` 12, `-4` 16, `-5` 20, `-6` 24,
`-8` 32, `-12` 48 px. Grouping ratio: 8 px inside a field, 12 px between adjacent controls,
16 px between fields in a card, 32 px between sections.

Container: `.container` is `max-width: 80rem`, centred, with
`padding-inline: max(16px, env(safe-area-inset-left/right))`. Controls never touch the viewport
edge; backgrounds (page, undo bar shadow) may.

Primary grid: `main.layout` is a single column with a 32 px gap. At `min-width: 64rem` it becomes
`grid-template-columns: minmax(0, 5fr) minmax(0, 6fr)` with the editor on the left and
`aside.preview` on the right, `position: sticky; top: 16px`. Below that width the preview follows
the editor in DOM order and two anchor links (`.mobile-only.jump`) let the reader jump to the
preview and back; they are hidden at desktop widths.

Secondary breakpoints, chosen where content stops fitting: the token-ID input and its button
stack until `30rem`, then sit side by side (`.lookup-row`); the two character slots inside a
panel card stack until `40rem`, then sit in two equal columns (`.slots`).

Preview canvas: `width: 100%; height: auto` inside a 4 px padded frame. A stacked strip is capped
at `max-height: 70vh` (56vh at desktop) so the export buttons stay in view.

Logical properties are used for direction-dependent spacing (`inset-inline-start`,
`padding-inline`, `margin-inline`); the select chevron flips under `[dir='rtl']`.

Observed in the review: no horizontal overflow at 320 px; the two-column editor/preview at
1280 px; two-column slots at 768 px; single column at 320 and 390 px.

## Elevation & depth

The interface is essentially flat. Structure comes from 1 px borders (`--color-border` on
cards, `--color-border-strong` on inputs and secondary buttons) and tonal layers: page
(stone-100) → card (white) → inset slot (stone-100 again) → input (white).

One shadow exists, on the fixed undo bar: `0 1px 2px rgb(0 0 0 / 0.06), 0 8px 24px rgb(0 0 0 /
0.12)`, marking the only element that floats above the page. Cast thumbnails get a 1 px
`rgb(0 0 0 / 0.1)` outline (`outline-offset: -1px`) for consistent image edges. Invalid inputs
add a 1 px `box-shadow` ring in the danger colour beside the coloured border.

Stacking: skip link `z-index: 10`, undo bar `z-index: 5`, everything else in flow. The sticky
preview uses no z-index and no backdrop.

## Shapes

| Token | Value | Used on |
| --- | --- | --- |
| `--radius-sm` | 8 px | inputs, selects, textareas, cast thumbnails, preview canvas |
| `--radius-md` | 10 px | buttons, skip link, inset slot boxes |
| `--radius-lg` | 16 px | cards, undo bar |

The preview frame is concentric: canvas 8 px + 4 px padding = 12 px frame radius. Cards
(16 px) contain slots (10 px) which contain inputs (8 px); the inner radius always stays
smaller than its parent. Badges are pills (`border-radius: 999px`). Comic panels in the canvas
are square-cornered with a 6 px black frame and 22 px bubble corners.

## Components

All components live in `web/src/components/` and use plain CSS classes from
`web/src/styles.css`. None is a published library export; reuse them by copying the pattern.

### Button (`.btn`, `.btn-primary`, `.btn-quiet`, `.btn-small`)

`min-height: 2.75rem` (44 px), 8/16 px padding, 10 px radius, 600 weight, 16 px text, 1 px
strong border on white. `.btn-primary` is the one filled action per view (green fill, white
text, transparent border). `.btn-quiet` has no border or fill (used for "Start over" and
"Dismiss"). `.btn-small` is 40 px tall with 14 px text (cast "Remove", undo bar). Hover fills
are gated by `@media (hover: hover)`; under `prefers-reduced-motion: no-preference` a press
scales to 0.96. Transitions name only `background-color, border-color, color` (plus `scale`
when motion is allowed) at 150 ms with `cubic-bezier(0.2, 0, 0, 1)`. Disabled state: opacity
0.6, default cursor; the submit button keeps its label and swaps to "Reading…" while a lookup
runs. Focus: global `:focus-visible` 2 px blue outline, 2 px offset.

### Field (`.field`, `.hint`, `.errors`, `.status`)

A grid of label → hint → control. Labels are real `<label for>` elements; hints are `<p>`
referenced by `aria-describedby`. Inputs, selects and textareas share one style: 44 px minimum
height, 8/12 px padding, 8 px radius, strong border, 16 px text. Selects have a custom inline
SVG chevron. Errors are a `<ul role="alert">` in the danger colour, placed directly under the
field, and the field gets `aria-invalid="true"` with the error id added to `aria-describedby`.
Non-error progress ("Reading 2 Pepes from Ethereum…", "Added … to the cast.") goes to a
persistent `<p role="status" aria-live="polite">` that exists before it has text.

### Checkbox / radio row (`.field-check`)

A 44 px-tall flex row: 20 px native control (accent-coloured) plus its label. The label's
`::before` extends its hit area over the control so the pair is one target with no dead zone.
Labels describe the on state ("Face left (mirror the art)", "Stacked").

### Card (`.card`) and panel card (`.panel-card`, `.slot`)

White surface, soft border, 16 px radius and padding. `PanelsSection.tsx` renders each panel
as a `<fieldset class="card panel-card">` with an 18 px `<legend>`, a background select, two
`.slot` boxes (page-coloured, 10 px radius, 12 px padding, each with an `h3`, a "Who" select,
the mirror checkbox and a speech textarea) and a caption input.

### Cast list item (`.cast-item`, `.cast-thumb`, `.badge`)

A card row: 56 px pixel-art thumbnail (`image-rendering: pixelated`, decorative `alt=""`),
name with an optional "Sample" badge, trait summary in secondary text, and a small "Remove"
button whose accessible name includes the Pepe's name. Empty state (`.empty`) states what the
list is for and how to fill it.

### Chip list (`.chip-list`)

A wrapping row of secondary buttons with 12 px gaps, used for starter jokes ("Use “Gas fees”").

### Preview (`.preview`, `.preview-frame`, `.preview-canvas`, `.layout-choice`, `.actions`)

`PreviewSection.tsx` owns the `<canvas role="img">` whose accessible name describes the current
layout, the Layout radio group, the action row (primary "Download PNG", optional "Share image"
when `navigator.canShare` supports files, quiet "Start over") and a status line for export
results. Rendering is delegated to `renderStrip` in `web/src/render.ts`; the preview and the
export share that function.

### Undo bar (`.undo-bar`)

Fixed to the bottom inside the safe area, white, 16 px radius, shadowed, `role="status"`. Shows
one message plus "Undo" and "Dismiss". Appears after "Use <joke>" and "Remove <Pepe>"; a new
action replaces the previous snapshot.

### Skip link, header, footer

`.skip-link` is the first focusable element and targets `main#main`. The header is a kicker,
`h1` and lede; the footer explains where images come from and links to the contract on
Etherscan with descriptive link text.

## Do's and don'ts

- Start a new surface from `.container` and `.section` (grid, 12 px gap, `scroll-margin-top`),
  and group controls in a `.card`. Separate sections with `--space-8`.
- Use exactly one `.btn-primary` per view. Everything else is `.btn` or `.btn-quiet`.
- Reference semantic tokens (`--color-text-secondary`, `--color-border-strong`); never the
  stone/green primitives or raw hex in a component.
- Keep form text at `--text-base`; keep interactive controls at least 44 px tall (or extend the
  label's hit area as `.field-check` does).
- Put every error next to its field with a stated fix, and keep the polite status region in
  the DOM before it has text.
- Do not add a web font for the interface; Comic Neue belongs to the canvas only.
- Do not introduce a dark theme, a second accent hue, shadows on cards, or `transition: all`.
- Do not draw the comic anywhere except through `renderStrip`; the preview must remain the
  exact export.

Recipe for one more page or section: wrap it in `<section class="section" aria-labelledby>`
with an `h2` and a `.section-lede`; put controls in a `.card` using `.field` rows; give the one
primary action `.btn .btn-primary`; place it in `.editor` (left column at desktop) or
`.preview` (sticky right column) depending on whether it edits or shows the result.
