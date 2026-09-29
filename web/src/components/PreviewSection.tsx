import { useEffect, useId, useRef, useState, type Dispatch } from 'react'
import { registerComicFonts } from '../fonts'
import { ensureFonts, exportFileName, renderStrip, stripSize, toPngBlob } from '../render'
import type { Action, CastMember, Layout, Strip } from '../state'

interface Props {
  strip: Strip
  cast: CastMember[]
  dispatch: Dispatch<Action>
  onReset: () => void
}

function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false
  try {
    return navigator.canShare({ files: [new File([new Uint8Array(1)], 'x.png', { type: 'image/png' })] })
  } catch {
    return false
  }
}

export function PreviewSection({ strip, cast, dispatch, onReset }: Props) {
  const headingId = useId()
  const layoutId = useId()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [fontsReady, setFontsReady] = useState(false)
  const [status, setStatus] = useState('')
  const [shareable] = useState(canShareFiles)

  useEffect(() => {
    let cancelled = false
    registerComicFonts()
      .then(ensureFonts)
      .finally(() => {
        if (!cancelled) setFontsReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const frame = requestAnimationFrame(() => renderStrip(canvas, strip, cast))
    return () => cancelAnimationFrame(frame)
  }, [strip, cast, fontsReady])

  async function makePng(): Promise<{ blob: Blob; name: string } | null> {
    const canvas = canvasRef.current
    if (!canvas) return null
    renderStrip(canvas, strip, cast)
    const blob = await toPngBlob(canvas)
    return { blob, name: exportFileName(strip) }
  }

  async function download() {
    try {
      const png = await makePng()
      if (!png) return
      const url = URL.createObjectURL(png.blob)
      const a = document.createElement('a')
      a.href = url
      a.download = png.name
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      setStatus(`Saved ${png.name} (${size.width} × ${size.height} pixels).`)
    } catch (e) {
      setStatus(`Unable to create the PNG. Try again or use a different browser. (${e instanceof Error ? e.message : String(e)})`)
    }
  }

  async function share() {
    try {
      const png = await makePng()
      if (!png) return
      const file = new File([png.blob], png.name, { type: 'image/png' })
      await navigator.share({ files: [file], title: 'Pepe Panels comic' })
      setStatus('Shared the comic.')
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return
      setStatus('Unable to share from this browser. Download the PNG instead.')
    }
  }

  const size = stripSize(strip.layout)
  const description = `Preview of the comic: three panels ${strip.layout === 'strip' ? 'side by side' : 'stacked vertically'}.`

  return (
    <aside id="preview" className="preview section" aria-labelledby={headingId}>
      <h2 id={headingId}>Preview and export</h2>
      <div className={`preview-frame preview-${strip.layout}`}>
        <canvas ref={canvasRef} className="preview-canvas" role="img" aria-label={description} />
      </div>
      <fieldset className="layout-choice">
        <legend id={layoutId}>Layout</legend>
        <div className="radio-row">
          <LayoutRadio value="strip" label="Side by side" current={strip.layout} onChange={(layout) => dispatch({ type: 'set-layout', layout })} />
          <LayoutRadio value="stack" label="Stacked" current={strip.layout} onChange={(layout) => dispatch({ type: 'set-layout', layout })} />
        </div>
      </fieldset>
      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={download}>
          Download PNG
        </button>
        {shareable && (
          <button type="button" className="btn" onClick={share}>
            Share image
          </button>
        )}
        <button type="button" className="btn btn-quiet" onClick={onReset}>
          Start over
        </button>
      </div>
      <p className="status" role="status" aria-live="polite">
        {status}
      </p>
      <p className="footnote">
        Exports at {size.width.toLocaleString('en-US')} × {size.height.toLocaleString('en-US')} pixels. The preview is the
        exact image you download.
      </p>
      <p className="mobile-only jump">
        <a href="#main">Back to the editor</a>
      </p>
    </aside>
  )
}

function LayoutRadio({ value, label, current, onChange }: { value: Layout; label: string; current: Layout; onChange: (l: Layout) => void }) {
  const id = useId()
  return (
    <div className="field-check">
      <input id={id} type="radio" name="layout" value={value} checked={current === value} onChange={() => onChange(value)} />
      <label htmlFor={id}>{label}</label>
    </div>
  )
}
