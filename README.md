# Pepe Panels

A playful three-panel comic maker for Swarm Pepe collectors. Enter one or more token IDs from
the Swarm Pepe contract on Ethereum (`0x999ce0ce8c5f7661e0c74a568ffe27ceb9177bdb`), use the
actual on-chain pixel art as characters, pick a background per panel, write speech bubbles and
captions, start from an editable joke, and export the strip as one shareable PNG.

Everything runs in the browser. There is no account, no wallet connection, no backend and no
tracking. The only network traffic is a read-only `eth_call` to a public Ethereum RPC endpoint
when you look up a token ID.

## How it works

- **On-chain images.** The contract's `tokenURI(id)` returns a base64 JSON document whose
  `image` is a base64 SVG of 24×24 pixel-art rectangles (the collection is drawn entirely
  on-chain; there is no IPFS). `web/src/chain.ts` calls it over JSON-RPC, decodes the ABI string
  and the data URLs, and `web/src/pixels.ts` parses the rectangles so the renderer can draw a
  Pepe crisply at any size, mirror it, and drop its flat background square.
- **RPC endpoints.** Lookups try `https://eth.drpc.org`, `https://ethereum-rpc.publicnode.com`
  and `https://cloudflare-eth.com` in order. A custom endpoint can be set under "RPC endpoint"
  in the Cast section; it is stored in `localStorage` and tried first.
- **Bundled samples.** Two Pepes (#1 and #2, plus #1000 in `web/src/samples.json`) were read
  from the contract at block 26,085,689 and shipped with the site so the page shows a finished
  comic before any lookup. They are marked "Sample" in the cast.
- **Rendering and export.** `web/src/render.ts` draws the whole strip into one canvas: panel
  backgrounds (procedural, see `web/src/backgrounds.ts`), characters, speech bubbles with tails,
  captions and frames. The on-page preview and the downloaded PNG come from the same function,
  so the export matches the preview exactly. Side-by-side strips export at 1768×608 px, stacked
  strips at 608×1768 px.
- **Starter jokes.** Four scripts about the swarm live in `web/src/jokes.ts`. Applying one
  fills all three panels; a one-step Undo appears in a bottom bar.
- **Persistence.** The cast and panels are saved to `localStorage` under `pepe-panels:v1`.
  "Start over" clears them after a confirmation.

## Repository layout

```
web/                 Vite + React + TypeScript source
  index.html
  src/               App.tsx, components/, chain.ts, pixels.ts, render.ts, backgrounds.ts,
                     jokes.ts, state.ts, fonts.ts, styles.css, samples.json
  test/              offline unit tests (node:test)
  package.json       scripts and dependencies
  package-lock.json  lockfile (npm)
dist/                committed production export (built from web/, relative asset URLs)
DESIGN.md            implemented design system: tokens, typography, components, responsive rules
artifacts/validation.md   worker validation record (Better Interface review, commands, results)
```

## Install

Requires Node 22 and npm 10 (any Node ≥ 20 should work). Dependencies come from the public
npm registry; nothing else is downloaded.

```sh
cd web
npm install
```

Do not commit `web/node_modules`.

## Preview during development

```sh
cd web
npm run dev
```

Vite prints a local URL (default `http://localhost:5173/`). Token lookups need internet access
to reach a public RPC endpoint.

## Check

```sh
cd web
npm run typecheck   # tsc --noEmit
npm test            # node --test, offline unit tests for decoding and sprite parsing
```

## Rebuild the static export

```sh
cd web
npm run build       # runs the typecheck, then vite build -> ../dist
```

`vite.config.ts` sets `base: './'` and `outDir: '../dist'`, so `dist/index.html` references its
assets relatively and works from a subpath, an IPFS gateway path or an ENS name. Commit `dist/`
after rebuilding; the publisher serves the committed export and does not rebuild.

To look at the export locally without the dev server:

```sh
cd web
npm run preview     # serves ../dist
```

## Publish

Upload the contents of `dist/` to any static host (IPFS, GitHub Pages, Netlify, an S3 bucket
or a plain web server). No server-side routing is needed: the app is a single page with no
client routes. The only runtime requirements are that the host serves `index.html` and the
`assets/` folder, and that the visitor's browser can reach an Ethereum JSON-RPC endpoint over
HTTPS for token lookups. Everything else (fonts, sample Pepes, backgrounds) is bundled.

## Validation performed by the worker

Commands run from `web/` on Node 22.23.2 / npm 10.9.8 after the last source change:

| Command | Result |
| --- | --- |
| `npm run typecheck` | exit 0, no diagnostics |
| `npm test` | 7 tests, 7 pass, 0 fail |
| `npm run build` | exit 0; `dist/` = index.html (1.0 kB), JS 258.9 kB (81.3 kB gzip), CSS 9.9 kB, two woff2 fonts (19 kB each) |

Interaction checks were run on the committed `dist/` in the task's headless Chromium (Playwright
MCP) at 320×640, 390×844, 768×1024 and 1280×900 CSS pixels:

- Page loads with no console errors or warnings; all five resources load relatively from
  `/dist/…` (a subpath, not the site root).
- No horizontal overflow at 320 px (`scrollWidth` = 320).
- Token ID form: invalid input (`abc, 5`) shows an inline error, sets `aria-invalid`, returns
  focus to the field. With no internet, a lookup tries all three RPC endpoints and reports
  "Unable to reach Ethereum for #1000…".
- With `fetch` mocked to return a real-shaped `tokenURI` response for #1000 and a revert for
  #99999, the form adds "Swarm Pepe #1000" to the cast (and to every character select), persists
  it to `localStorage`, and reports "#99999 has not been minted".
- Starter joke button fills the panels and shows the Undo bar; Undo restores the previous text
  and backgrounds.
- Changing a panel background re-renders the preview; "Stacked" switches the canvas to
  608×1768 and updates the footnote and the canvas accessible name.
- "Download PNG": the generated file (captured by intercepting the anchor click) is a valid
  PNG (`89 50 4E 47…` signature) of 608×1768 px, 165,688 bytes, named `pepe-panels-1-2.png`.
- "Start over" opens a native confirm; accepting it resets the cast to the two samples and the
  first joke.
- Keyboard: Tab reaches every control in DOM order; the blue focus ring is visible on the green
  primary button (offset ring on the page surface) and on secondary buttons.
- Rendered contrast measured from computed styles: body text 15.2:1, secondary text 5.98:1 on
  the page and 6.54:1 on cards, accent text 4.69:1, primary button label 5.12:1, error text
  6.54:1, placeholder 4.61:1, focus ring 5.85:1 on the page and 6.39:1 on white.

Real chain reads were exercised from Node during development (tokens 1, 2, 500, 1000 decoded;
5000, 9999, 99999 revert as not minted; the highest minted ID at block 26,085,689 was 1032).

### Limitations

- The task browser had no internet, so the live RPC path inside the browser was verified only
  by its failure mode plus a mocked success; the same code path was verified live from Node.
- `navigator.share` with files is not available in headless Chromium, so the "Share image"
  button (shown only when the browser supports it) was not exercised.
- The PNG download was verified by intercepting the anchor click; the browser's actual
  save-to-disk step was not observed.
- No physical phone, screen reader, Windows High Contrast (forced-colors) or browser-native
  200% zoom test was run. A 320 px viewport is not a zoom test.
- Screenshots from the review are listed in `artifacts/validation.md`.

## Licenses

Application code in this repository is released under the MIT license. The bundled Comic Neue
font (`@fontsource/comic-neue`, weights 400 and 700, latin subset) is licensed under the SIL
Open Font License 1.1. Swarm Pepe images belong to their respective token holders and the
collection's creators; this tool only reads them from the public contract.
