// Offline unit tests for the pure decoding helpers. Run with `npm test`.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { decodeAbiString, decodeTokenUri, parseTokenIds, tokenUriCalldata } from '../src/chain.ts'
import { drawSprite, parseSvgRects, spriteToSvgDataUrl, toSprite } from '../src/pixels.ts'

const samples = JSON.parse(readFileSync(new URL('../src/samples.json', import.meta.url), 'utf8')) as {
  tokens: Array<{ id: number; name: string; svg: string }>
}

test('parseTokenIds accepts commas, spaces, hashes and drops junk', () => {
  const { ids, invalid } = parseTokenIds(' #1, 42 777\n42;abc, 0, -3 ')
  assert.deepEqual(ids, [1, 42, 777])
  assert.deepEqual(invalid, ['abc', '0', '-3'])
})

test('tokenUriCalldata encodes the selector and a padded id', () => {
  assert.equal(tokenUriCalldata(1), '0xc87b56dd' + '0'.repeat(63) + '1')
  assert.equal(tokenUriCalldata(1032), '0xc87b56dd' + '0'.repeat(61) + '408')
})

test('decodeAbiString round-trips a dynamic string', () => {
  const text = 'Swarm Pepe'
  const bytes = Buffer.from(text, 'utf8')
  const hex =
    '0x' +
    '20'.padStart(64, '0') +
    bytes.length.toString(16).padStart(64, '0') +
    bytes.toString('hex').padEnd(64, '0')
  assert.equal(decodeAbiString(hex), text)
})

test('decodeTokenUri unpacks base64 JSON with a base64 SVG image', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="0" y="0" width="24" height="24" fill="#123456"/><rect x="1" y="2" width="3" height="4" fill="#abcdef"/></svg>'
  const json = {
    name: 'Swarm Pepe #7',
    description: 'test',
    image: 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64'),
    attributes: [{ trait_type: 'Skin', value: 'Green' }],
  }
  const uri = 'data:application/json;base64,' + Buffer.from(JSON.stringify(json)).toString('base64')
  const meta = decodeTokenUri(7, uri)
  assert.equal(meta.name, 'Swarm Pepe #7')
  assert.equal(meta.svg, svg)
  assert.deepEqual(meta.attributes, [{ trait_type: 'Skin', value: 'Green' }])
  const sprite = toSprite(svg)
  assert.equal(sprite.background, '#123456')
  assert.deepEqual(sprite.rects, [{ x: 1, y: 2, w: 3, h: 4, fill: '#abcdef' }])
})

test('decodeTokenUri rejects a non-data URI with a decode error', () => {
  assert.throws(() => decodeTokenUri(3, 'ipfs://nope'), /Unable to read the on-chain image for #3/)
})

test('bundled samples parse into sprites with the background separated', () => {
  for (const t of samples.tokens) {
    const rects = parseSvgRects(t.svg)
    const sprite = toSprite(t.svg)
    assert.ok(rects.length > 10, `${t.name} should have rects`)
    assert.equal(sprite.rects.length, rects.length - 1, `${t.name} drops exactly one background rect`)
    assert.match(sprite.background ?? '', /^#[0-9a-f]{6}$/i)
    assert.ok(spriteToSvgDataUrl(sprite).startsWith('data:image/svg+xml;charset=utf-8,'))
  }
})

test('drawSprite mirrors x coordinates when flipped and covers the whole cell grid', () => {
  const calls: Array<[number, number, number, number]> = []
  const ctx = {
    fillStyle: '',
    fillRect: (x: number, y: number, w: number, h: number) => calls.push([x, y, w, h]),
  } as unknown as CanvasRenderingContext2D
  const sprite = { rects: [{ x: 2, y: 3, w: 4, h: 1, fill: '#000' }], background: null }
  drawSprite(ctx, sprite, 0, 0, 240, false)
  assert.deepEqual(calls[0], [20, 30, 40, 10])
  drawSprite(ctx, sprite, 0, 0, 240, true)
  assert.deepEqual(calls[1], [180, 30, 40, 10])
})
