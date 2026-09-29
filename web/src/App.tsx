import { useCallback, useEffect, useReducer, useState } from 'react'
import { CONTRACT } from './chain'
import { CastSection } from './components/CastSection'
import { JokesSection } from './components/JokesSection'
import { PanelsSection } from './components/PanelsSection'
import { PreviewSection } from './components/PreviewSection'
import { type AppState, type Action, clearState, loadState, reducer, saveState } from './state'

export interface UndoEntry {
  label: string
  state: AppState
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)
  const [undo, setUndo] = useState<UndoEntry | null>(null)

  useEffect(() => {
    saveState(state)
  }, [state])

  /** Dispatch an action that replaces user work, keeping a one-step undo. */
  const dispatchWithUndo = useCallback(
    (action: Action, label: string) => {
      setUndo({ label, state })
      dispatch(action)
    },
    [state],
  )

  const restore = useCallback(() => {
    if (!undo) return
    dispatch({ type: 'restore', state: undo.state })
    setUndo(null)
  }, [undo])

  const reset = useCallback(() => {
    if (!window.confirm('Clear the cast and all three panels? This cannot be undone.')) return
    clearState()
    setUndo(null)
    dispatch({ type: 'reset' })
  }, [])

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="container">
          <p className="site-kicker">Swarm Pepe comic maker</p>
          <h1 className="site-title">Pepe Panels</h1>
          <p className="site-lede">
            Make a three-panel comic starring your Swarm Pepes. Images come straight from the contract on Ethereum.
            No wallet, no account, nothing to install.
          </p>
        </div>
      </header>

      <main id="main" className="container layout">
        <div className="editor">
          <p className="mobile-only jump">
            <a href="#preview">Jump to the preview and export</a>
          </p>
          <CastSection cast={state.cast} dispatch={dispatch} dispatchWithUndo={dispatchWithUndo} />
          <JokesSection dispatchWithUndo={dispatchWithUndo} />
          <PanelsSection strip={state.strip} cast={state.cast} dispatch={dispatch} />
        </div>
        <PreviewSection strip={state.strip} cast={state.cast} dispatch={dispatch} onReset={reset} />
      </main>

      {undo && (
        <div className="undo-bar" role="status">
          <span>{undo.label}</span>
          <button type="button" className="btn btn-small" onClick={restore}>
            Undo
          </button>
          <button type="button" className="btn btn-small btn-quiet" onClick={() => setUndo(null)} aria-label="Dismiss undo">
            Dismiss
          </button>
        </div>
      )}

      <footer className="site-footer">
        <div className="container">
          <p>
            Pepe images are read from the{' '}
            <a href={`https://etherscan.io/address/${CONTRACT}`} rel="noreferrer">
              Swarm Pepe contract on Etherscan
            </a>{' '}
            over a public RPC endpoint. Your comic is drawn and saved in this browser only.
          </p>
        </div>
      </footer>
    </>
  )
}
