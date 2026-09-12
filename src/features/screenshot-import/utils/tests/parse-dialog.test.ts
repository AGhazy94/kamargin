import { describe, expect, it } from 'vitest'

import { OCR_CONFIDENCE_THRESHOLD } from '../../types'
import { parseDialog } from '../parse-dialog'
import { fixtureFor, fixtures } from './fixtures'

const originals = [
  [
    '7.07.16',
    'Greedo Rum',
    100,
    'Liquid',
    970,
    { 1: 1482, 10: 23998, 100: 155550 },
  ],
  [
    '7.07.33',
    'Edelweiss',
    100,
    'Flower',
    104,
    { 1: 349, 10: 1294, 100: 10996, 1000: 109467 },
  ],
  [
    '7.07.41',
    'Kido Beak',
    101,
    'Bone',
    814,
    { 1: 919, 10: 9000, 100: 85000, 1000: 802197 },
  ],
  [
    '7.07.53',
    'Manderisha Skin',
    104,
    'Skin',
    451,
    { 1: 100, 10: 3140, 100: 30000 },
  ],
  [
    '7.08.23',
    'Tiny Drinking Trough Potion',
    105,
    'Paddock Catalyst',
    3191,
    { 1: 3488, 10: 30996, 100: 349984 },
  ],
] as const

describe('parseDialog', () => {
  it.each(originals)(
    'reads the original %s screenshot',
    (time, title, level, type, averagePrice, prices) => {
      const parsed = parseDialog(fixtureFor(time).words)
      expect(parsed).toMatchObject({
        isMarketDialog: true,
        title: { value: title },
        level: { value: level },
        type: { value: type },
        averagePrice: { value: averagePrice },
      })
      expect(
        Object.fromEntries(
          Object.entries(parsed.tiers).map(([tier, field]) => [
            tier,
            field.value,
          ]),
        ),
      ).toEqual(prices)
    },
  )

  it.each(fixtures)(
    'recognizes only market dialogs in $source.filename',
    (fixture) => {
      const parsed = parseDialog(fixture.words)
      expect(parsed.isMarketDialog).toBe(Boolean(fixture.crop))
      if (fixture.crop) {
        expect(parsed.title?.value).toBeTruthy()
        expect(Object.keys(parsed.tiers).length).toBeGreaterThan(0)
      } else {
        expect(parsed.tiers).toEqual({})
      }
    },
  )

  it('takes the first occurrence of a repeated tier', () => {
    const fixture = fixtureFor('12.10.23')
    const firstPrice = fixture.words.find((word) => word.text === '3,998')
    expect(firstPrice).toBeDefined()
    const words = fixture.words.map((word) =>
      word.text === '3,998' && word !== firstPrice
        ? { ...word, text: '9,999' }
        : word,
    )
    expect(parseDialog(words).tiers[1]?.value).toBe(3998)
    expect(Object.keys(parseDialog(words).tiers)).toEqual(['1'])
  })

  it.each(['155.550', '155 550', '155,550'])(
    'normalizes %s without changing the pack total',
    (text) => {
      const words = fixtureFor('7.07.16').words.map((word) =>
        word.text === '155,550' ? { ...word, text } : word,
      )
      expect(parseDialog(words).tiers[100]?.value).toBe(155550)
    },
  )

  it('leaves a missing price empty instead of inferring it from its tier', () => {
    const words = fixtureFor('7.07.16').words.filter(
      (word) => word.text !== '23,998',
    )
    expect(parseDialog(words).tiers[10]).toBeUndefined()
    expect(parseDialog(words).tiers[1]?.value).toBe(1482)
    expect(parseDialog(words).tiers[100]?.value).toBe(155550)
  })

  it('keeps a low-confidence price for explicit review', () => {
    const words = fixtureFor('7.07.16').words.map((word) =>
      word.text === '155,550' ? { ...word, confidence: 12 } : word,
    )
    const price = parseDialog(words).tiers[100]
    expect(price?.value).toBe(155550)
    expect(price?.confidence).toBeLessThan(OCR_CONFIDENCE_THRESHOLD)
  })

  it('ignores unsupported tiers and unsafe numbers', () => {
    const fixture = fixtureFor('7.07.16')
    const words = fixture.words.map((word) => {
      if (word.bbox.y0 < (fixture.priceBand?.top ?? 0)) return word
      if (word.text === '10') return { ...word, text: '20' }
      if (word.text === '155,550') return { ...word, text: '9007199254740993' }
      return word
    })
    expect(Object.keys(parseDialog(words).tiers)).toEqual(['1'])
  })

  it('uses geometry rather than input order, position, or scale', () => {
    const original = fixtureFor('7.07.41').words
    const moved = [...original].reverse().map((word) => ({
      ...word,
      bbox: {
        x0: word.bbox.x0 * 2 + 317,
        x1: word.bbox.x1 * 2 + 317,
        y0: word.bbox.y0 * 2 + 119,
        y1: word.bbox.y1 * 2 + 119,
      },
    }))
    expect(parseDialog(moved)).toEqual(parseDialog(original))
  })

  it('does not manufacture fields for an empty word list', () => {
    expect(parseDialog([])).toEqual({ isMarketDialog: false, tiers: {} })
  })
})
