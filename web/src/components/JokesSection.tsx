import { useId } from 'react'
import { JOKES } from '../jokes'
import type { Action } from '../state'

interface Props {
  dispatchWithUndo: (action: Action, label: string) => void
}

export function JokesSection({ dispatchWithUndo }: Props) {
  const headingId = useId()
  return (
    <section className="section" aria-labelledby={headingId}>
      <h2 id={headingId}>Starter jokes</h2>
      <p className="section-lede">
        Choose one to fill all three panels with a script. Every bubble, caption and background stays editable.
      </p>
      <ul className="chip-list" aria-label="Starter jokes">
        {JOKES.map((joke) => (
          <li key={joke.id}>
            <button
              type="button"
              className="btn"
              onClick={() => dispatchWithUndo({ type: 'apply-joke', joke }, `Filled the panels with “${joke.name}”.`)}
            >
              Use “{joke.name}”
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
