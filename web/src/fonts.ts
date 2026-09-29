/**
 * Registers the bundled Comic Neue faces (OFL-1.1, via @fontsource) with the
 * document so both DOM text and canvas text can use them. Registering through
 * the FontFace API rather than a CSS `@font-face` rule lets the renderer
 * await the load before drawing the first frame.
 */
import bold from '@fontsource/comic-neue/files/comic-neue-latin-700-normal.woff2?url'
import regular from '@fontsource/comic-neue/files/comic-neue-latin-400-normal.woff2?url'

let registered: Promise<void> | null = null

export function registerComicFonts(): Promise<void> {
  if (registered) return registered
  registered = (async () => {
    if (typeof FontFace === 'undefined' || typeof document === 'undefined' || !document.fonts) return
    const faces = [
      new FontFace('Comic Neue', `url(${bold}) format("woff2")`, { weight: '700', style: 'normal' }),
      new FontFace('Comic Neue', `url(${regular}) format("woff2")`, { weight: '400', style: 'normal' }),
    ]
    await Promise.all(
      faces.map(async (face) => {
        try {
          await face.load()
          document.fonts.add(face)
        } catch {
          // The system fallback stack is used instead.
        }
      }),
    )
  })()
  return registered
}
