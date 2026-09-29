import { useId, type Dispatch } from 'react'
import { BACKGROUNDS } from '../backgrounds'
import { MAX_CAPTION, MAX_TEXT, type Action, type CastMember, type Panel, type Slot, type Strip } from '../state'

interface Props {
  strip: Strip
  cast: CastMember[]
  dispatch: Dispatch<Action>
}

export function PanelsSection({ strip, cast, dispatch }: Props) {
  const headingId = useId()
  return (
    <section className="section" aria-labelledby={headingId}>
      <h2 id={headingId}>Panels</h2>
      <p className="section-lede">
        Each panel holds a background, up to two characters and a caption. Leave a speech field empty to skip its
        bubble.
      </p>
      <div className="panel-list">
        {strip.panels.map((panel, index) => (
          <PanelEditor key={index} index={index} panel={panel} cast={cast} dispatch={dispatch} />
        ))}
      </div>
    </section>
  )
}

interface PanelProps {
  index: number
  panel: Panel
  cast: CastMember[]
  dispatch: Dispatch<Action>
}

function PanelEditor({ index, panel, cast, dispatch }: PanelProps) {
  const base = useId()
  const bgId = `${base}-bg`
  const captionId = `${base}-caption`
  return (
    <fieldset className="card panel-card">
      <legend className="panel-legend">Panel {index + 1}</legend>
      <div className="field">
        <label htmlFor={bgId}>Background</label>
        <select id={bgId} value={panel.background} onChange={(e) => dispatch({ type: 'set-background', panel: index, background: e.target.value })}>
          {BACKGROUNDS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div className="slots">
        <SlotFields label="Left" slot={panel.left} cast={cast} idBase={`${base}-left`} onChange={(patch) => dispatch({ type: 'set-slot', panel: index, side: 'left', patch })} />
        <SlotFields label="Right" slot={panel.right} cast={cast} idBase={`${base}-right`} onChange={(patch) => dispatch({ type: 'set-slot', panel: index, side: 'right', patch })} />
      </div>
      <div className="field">
        <label htmlFor={captionId}>Caption</label>
        <p className="hint" id={`${captionId}-hint`}>
          Optional narration shown along the bottom, up to {MAX_CAPTION} characters.
        </p>
        <input
          id={captionId}
          type="text"
          maxLength={MAX_CAPTION}
          autoComplete="off"
          placeholder="Later that evening"
          value={panel.caption}
          onChange={(e) => dispatch({ type: 'set-caption', panel: index, caption: e.target.value })}
          aria-describedby={`${captionId}-hint`}
        />
      </div>
    </fieldset>
  )
}

interface SlotProps {
  label: string
  slot: Slot
  cast: CastMember[]
  idBase: string
  onChange: (patch: Partial<Slot>) => void
}

/** The on-chain art faces right; mirroring it makes the character face left. */
function SlotFields({ label, slot, cast, idBase, onChange }: SlotProps) {
  const whoId = `${idBase}-who`
  const flipId = `${idBase}-flip`
  const textId = `${idBase}-text`
  const value = slot.tokenId === null || !cast.some((m) => m.id === slot.tokenId) ? '' : String(slot.tokenId)
  return (
    <div className="slot">
      <h3 className="slot-title">{label} character</h3>
      <div className="field">
        <label htmlFor={whoId}>Who</label>
        <select id={whoId} value={value} onChange={(e) => onChange({ tokenId: e.target.value ? Number(e.target.value) : null })}>
          <option value="">No one</option>
          {cast.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field field-check">
        <input id={flipId} type="checkbox" checked={slot.flip} onChange={(e) => onChange({ flip: e.target.checked })} />
        <label htmlFor={flipId}>Face left (mirror the art)</label>
      </div>
      <div className="field">
        <label htmlFor={textId}>{label} speech</label>
        <textarea
          id={textId}
          rows={2}
          maxLength={MAX_TEXT}
          placeholder="Wen swarm?"
          value={slot.text}
          onChange={(e) => onChange({ text: e.target.value })}
          aria-describedby={`${textId}-hint`}
        />
        <p className="hint" id={`${textId}-hint`}>
          Up to {MAX_TEXT} characters.
        </p>
      </div>
    </div>
  )
}
