import { useEffect, useId, useRef, useState, type Dispatch, type FormEvent } from 'react'
import { DEFAULT_RPC_URLS, describeTokenError, fetchTokens, parseTokenIds } from '../chain'
import { spriteToSvgDataUrl } from '../pixels'
import { MAX_CAST, SAMPLES_FETCHED_AT_BLOCK, makeMember, type Action, type CastMember } from '../state'

const RPC_STORAGE_KEY = 'pepe-panels:rpc'
const MAX_PER_LOOKUP = 6

interface Props {
  cast: CastMember[]
  dispatch: Dispatch<Action>
  dispatchWithUndo: (action: Action, label: string) => void
}

export function CastSection({ cast, dispatch, dispatchWithUndo }: Props) {
  const inputId = useId()
  const hintId = useId()
  const errorId = useId()
  const rpcId = useId()
  const headingId = useId()

  const [value, setValue] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [rpcUrl, setRpcUrl] = useState(() => {
    try {
      return localStorage.getItem(RPC_STORAGE_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    try {
      if (rpcUrl.trim()) localStorage.setItem(RPC_STORAGE_KEY, rpcUrl.trim())
      else localStorage.removeItem(RPC_STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [rpcUrl])

  useEffect(() => () => abortRef.current?.abort(), [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const { ids, invalid } = parseTokenIds(value)
    const problems: string[] = []
    if (invalid.length) {
      problems.push(`Use whole numbers only. Could not read: ${invalid.join(', ')}.`)
    }
    if (ids.length === 0 && invalid.length === 0) {
      problems.push('Enter at least one token ID, for example 1 or 42, 777.')
    }
    if (ids.length > MAX_PER_LOOKUP) {
      problems.push(`Look up at most ${MAX_PER_LOOKUP} IDs at a time.`)
    }
    const already = ids.filter((id) => cast.some((m) => m.id === id))
    const fresh = ids.filter((id) => !cast.some((m) => m.id === id))
    if (already.length && fresh.length === 0) {
      problems.push(`Already in the cast: ${already.map((id) => `#${id}`).join(', ')}.`)
    }
    if (cast.length + fresh.length > MAX_CAST) {
      problems.push(`The cast holds up to ${MAX_CAST} Pepes. Remove one to add more.`)
    }
    if (problems.length) {
      setErrors(problems)
      setStatus('')
      inputRef.current?.focus()
      return
    }

    setErrors([])
    setBusy(true)
    setStatus(fresh.length === 1 ? `Reading Swarm Pepe #${fresh[0]} from Ethereum…` : `Reading ${fresh.length} Pepes from Ethereum…`)
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const urls = rpcUrl.trim() ? [rpcUrl.trim(), ...DEFAULT_RPC_URLS] : DEFAULT_RPC_URLS
    try {
      const results = await fetchTokens(fresh, urls, 4, controller.signal)
      if (controller.signal.aborted) return
      const loaded = results.flatMap((r) => (r.ok ? [makeMember(r.token)] : []))
      const failed = results.flatMap((r) => (r.ok ? [] : [describeTokenError(r.error)]))
      if (loaded.length) dispatch({ type: 'add-cast', members: loaded })
      const names = loaded.map((m) => m.name).join(', ')
      setStatus(
        loaded.length === 0
          ? ''
          : loaded.length === 1
            ? `Added ${names} to the cast.`
            : `Added ${loaded.length} Pepes to the cast: ${names}.`,
      )
      setErrors(failed)
      if (failed.length) inputRef.current?.focus()
      else setValue('')
    } catch (e) {
      if (controller.signal.aborted) return
      setStatus('')
      setErrors([`Unable to reach Ethereum. Check your connection or set another RPC endpoint. (${e instanceof Error ? e.message : String(e)})`])
      inputRef.current?.focus()
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  function remove(member: CastMember) {
    dispatchWithUndo({ type: 'remove-cast', id: member.id }, `Removed ${member.name} from the cast.`)
    setStatus('')
  }

  return (
    <section className="section" aria-labelledby={headingId}>
      <h2 id={headingId}>Cast</h2>
      <p className="section-lede">
        Add the Swarm Pepes you want in the comic by token ID. Their pixel art is read from the contract, not from a
        server.
      </p>

      <form className="card lookup" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor={inputId}>Token IDs</label>
          <p className="hint" id={hintId}>
            One or more IDs separated by commas, up to {MAX_PER_LOOKUP} at a time.
          </p>
          <div className="lookup-row">
            <input
              ref={inputRef}
              id={inputId}
              name="tokenIds"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              placeholder="1, 42, 777"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-describedby={errors.length ? `${hintId} ${errorId}` : hintId}
              aria-invalid={errors.length > 0 || undefined}
            />
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Reading…' : 'Add Pepes'}
            </button>
          </div>
        </div>
        {errors.length > 0 && (
          <ul className="errors" id={errorId} role="alert">
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        )}
        <p className="status" role="status" aria-live="polite">
          {status}
        </p>

        <details className="advanced">
          <summary>RPC endpoint</summary>
          <div className="field">
            <label htmlFor={rpcId}>Custom Ethereum RPC URL</label>
            <p className="hint" id={`${rpcId}-hint`}>
              Optional. Used before the built-in public endpoints ({DEFAULT_RPC_URLS.map((u) => new URL(u).host).join(', ')}).
            </p>
            <input
              id={rpcId}
              name="rpcUrl"
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder="https://example.com/rpc"
              value={rpcUrl}
              onChange={(e) => setRpcUrl(e.target.value)}
              aria-describedby={`${rpcId}-hint`}
            />
          </div>
        </details>
      </form>

      {cast.length === 0 ? (
        <div className="card empty">
          <p className="empty-title">No Pepes in the cast yet</p>
          <p>Add a token ID above and its on-chain image appears here, ready to place in a panel.</p>
        </div>
      ) : (
        <ul className="cast-list">
          {cast.map((member) => (
            <li key={member.id} className="cast-item card">
              <img
                className="cast-thumb"
                src={spriteToSvgDataUrl(member.sprite)}
                alt=""
                width={56}
                height={56}
                decoding="async"
              />
              <div className="cast-text">
                <p className="cast-name">
                  {member.name}
                  {member.sample && <span className="badge">Sample</span>}
                </p>
                <p className="cast-traits">
                  {member.attributes
                    .filter((a) => a.value && a.value !== 'None')
                    .map((a) => a.value)
                    .join(' · ')}
                </p>
              </div>
              <button type="button" className="btn btn-small" onClick={() => remove(member)} aria-label={`Remove ${member.name}`}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {cast.some((m) => m.sample) && (
        <p className="footnote">
          Sample Pepes were read from the contract at block {SAMPLES_FETCHED_AT_BLOCK.toLocaleString('en-US')} and
          bundled with the site so it works before any lookup.
        </p>
      )}
    </section>
  )
}
