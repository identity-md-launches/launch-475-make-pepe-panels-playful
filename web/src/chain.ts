/**
 * Read-only access to the Swarm Pepe contract on Ethereum mainnet.
 *
 * The collection is fully on-chain: `tokenURI(id)` returns a base64 JSON
 * document whose `image` is a base64 SVG of 24x24 pixel-art rectangles.
 * Everything here is a plain `eth_call` over JSON-RPC with `fetch`; no wallet,
 * no account and no signing are involved.
 */

export const CONTRACT = '0x999ce0ce8c5f7661e0c74a568ffe27ceb9177bdb'
export const CHAIN_ID = 1

/** Public endpoints tried in order until one answers. */
export const DEFAULT_RPC_URLS = [
  'https://eth.drpc.org',
  'https://ethereum-rpc.publicnode.com',
  'https://cloudflare-eth.com',
]

/** Function selector for `tokenURI(uint256)`. */
const TOKEN_URI_SELECTOR = '0xc87b56dd'

export interface Attribute {
  trait_type: string
  value: string
}

export interface TokenMetadata {
  id: number
  name: string
  description: string
  attributes: Attribute[]
  /** Raw SVG markup decoded from the on-chain data URL. */
  svg: string
}

export type TokenError =
  | { kind: 'not-minted'; id: number }
  | { kind: 'network'; id: number; message: string }
  | { kind: 'decode'; id: number; message: string }

export class TokenLookupError extends Error {
  readonly info: TokenError
  constructor(info: TokenError) {
    super(describeTokenError(info))
    this.info = info
  }
}

export function describeTokenError(e: TokenError): string {
  switch (e.kind) {
    case 'not-minted':
      return `Swarm Pepe #${e.id} has not been minted. Use an ID between 1 and the current supply.`
    case 'network':
      return `Unable to reach Ethereum for #${e.id}. Check your connection or set another RPC endpoint.`
    case 'decode':
      return `Unable to read the on-chain image for #${e.id}. ${e.message}`
  }
}

/** Parse a user-typed list such as "1, 42 777\n9" into unique positive integers. */
export function parseTokenIds(input: string): { ids: number[]; invalid: string[] } {
  const ids: number[] = []
  const invalid: string[] = []
  const seen = new Set<number>()
  for (const raw of input.split(/[\s,;]+/)) {
    const token = raw.trim().replace(/^#/, '')
    if (!token) continue
    if (!/^\d+$/.test(token)) {
      invalid.push(raw.trim())
      continue
    }
    const n = Number(token)
    if (!Number.isSafeInteger(n) || n < 1) {
      invalid.push(raw.trim())
      continue
    }
    if (!seen.has(n)) {
      seen.add(n)
      ids.push(n)
    }
  }
  return { ids, invalid }
}

/** ABI-encode `tokenURI(uint256)` calldata. */
export function tokenUriCalldata(id: number): string {
  return TOKEN_URI_SELECTOR + BigInt(id).toString(16).padStart(64, '0')
}

/** Decode a single ABI-encoded `string` return value. */
export function decodeAbiString(hex: string): string {
  const h = hex.startsWith('0x') ? hex.slice(2) : hex
  if (h.length < 128) throw new Error('return data too short')
  const offset = Number(BigInt('0x' + h.slice(0, 64))) * 2
  const len = Number(BigInt('0x' + h.slice(offset, offset + 64))) * 2
  const body = h.slice(offset + 64, offset + 64 + len)
  const bytes = new Uint8Array(body.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(body.slice(i * 2, i * 2 + 2), 16)
  return new TextDecoder().decode(bytes)
}

function decodeBase64Utf8(b64: string): string {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

/** Turn the raw `tokenURI` string into metadata with the SVG decoded. */
export function decodeTokenUri(id: number, uri: string): TokenMetadata {
  const jsonPrefix = 'data:application/json;base64,'
  if (!uri.startsWith(jsonPrefix)) {
    throw new TokenLookupError({ kind: 'decode', id, message: 'tokenURI is not a base64 JSON data URL.' })
  }
  let json: { name?: unknown; description?: unknown; image?: unknown; attributes?: unknown }
  try {
    json = JSON.parse(decodeBase64Utf8(uri.slice(jsonPrefix.length)))
  } catch {
    throw new TokenLookupError({ kind: 'decode', id, message: 'Metadata JSON is malformed.' })
  }
  const image = typeof json.image === 'string' ? json.image : ''
  const svgPrefix = 'data:image/svg+xml;base64,'
  if (!image.startsWith(svgPrefix)) {
    throw new TokenLookupError({ kind: 'decode', id, message: 'Image is not a base64 SVG data URL.' })
  }
  const svg = decodeBase64Utf8(image.slice(svgPrefix.length))
  const attributes: Attribute[] = Array.isArray(json.attributes)
    ? json.attributes
        .filter((a): a is Attribute => !!a && typeof a === 'object' && 'trait_type' in a && 'value' in a)
        .map((a) => ({ trait_type: String(a.trait_type), value: String(a.value) }))
    : []
  return {
    id,
    name: typeof json.name === 'string' ? json.name : `Swarm Pepe #${id}`,
    description: typeof json.description === 'string' ? json.description : '',
    attributes,
    svg,
  }
}

interface RpcResponse {
  result?: string
  error?: { code?: number; message?: string; data?: string }
}

async function ethCall(rpcUrl: string, data: string, signal?: AbortSignal): Promise<RpcResponse> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to: CONTRACT, data }, 'latest'],
    }),
    signal,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as RpcResponse
}

function isRevert(err: RpcResponse['error']): boolean {
  if (!err) return false
  const msg = (err.message ?? '').toLowerCase()
  return err.code === 3 || msg.includes('revert') || msg.includes('execution reverted')
}

/**
 * Fetch one token's metadata, trying each RPC URL in turn.
 * A revert means the token does not exist (not minted yet).
 */
export async function fetchToken(
  id: number,
  rpcUrls: string[] = DEFAULT_RPC_URLS,
  signal?: AbortSignal,
): Promise<TokenMetadata> {
  let lastNetworkError = 'no endpoint configured'
  for (const url of rpcUrls) {
    let response: RpcResponse
    try {
      response = await ethCall(url, tokenUriCalldata(id), signal)
    } catch (e) {
      if (signal?.aborted) throw e
      lastNetworkError = e instanceof Error ? e.message : String(e)
      continue
    }
    if (response.error) {
      if (isRevert(response.error)) throw new TokenLookupError({ kind: 'not-minted', id })
      lastNetworkError = response.error.message ?? 'RPC error'
      continue
    }
    if (typeof response.result !== 'string' || response.result === '0x') {
      // Empty return data: the address has no code on this endpoint's chain, or the call failed silently.
      throw new TokenLookupError({ kind: 'not-minted', id })
    }
    try {
      return decodeTokenUri(id, decodeAbiString(response.result))
    } catch (e) {
      if (e instanceof TokenLookupError) throw e
      throw new TokenLookupError({ kind: 'decode', id, message: e instanceof Error ? e.message : String(e) })
    }
  }
  throw new TokenLookupError({ kind: 'network', id, message: lastNetworkError })
}

/** Fetch several tokens with bounded concurrency; results keep input order. */
export async function fetchTokens(
  ids: number[],
  rpcUrls: string[] = DEFAULT_RPC_URLS,
  concurrency = 4,
  signal?: AbortSignal,
): Promise<Array<{ id: number; ok: true; token: TokenMetadata } | { id: number; ok: false; error: TokenError }>> {
  const results: Array<
    { id: number; ok: true; token: TokenMetadata } | { id: number; ok: false; error: TokenError }
  > = new Array(ids.length)
  let next = 0
  async function worker() {
    while (next < ids.length) {
      const i = next++
      const id = ids[i]
      try {
        results[i] = { id, ok: true, token: await fetchToken(id, rpcUrls, signal) }
      } catch (e) {
        results[i] = {
          id,
          ok: false,
          error:
            e instanceof TokenLookupError
              ? e.info
              : { kind: 'network', id, message: e instanceof Error ? e.message : String(e) },
        }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, worker))
  return results
}
