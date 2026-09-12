import { describe, expect, it } from 'vitest'

import { locateDialog } from '../locate-dialog'
import { fixtureFor, fixtures } from './fixtures'

describe('locateDialog', () => {
  it.each(fixtures)(
    'locates only a supported dialog in $source.filename',
    (fixture) => {
      const located = locateDialog(fixture.locateWords, fixture.source)
      expect(located.confident).toBe(Boolean(fixture.crop))
      expect(located.crop.left).toBeGreaterThanOrEqual(0)
      expect(located.crop.top).toBeGreaterThanOrEqual(0)
      expect(located.crop.width).toBeGreaterThan(0)
      expect(located.crop.height).toBeGreaterThan(0)
      expect(located.crop.left + located.crop.width).toBeLessThanOrEqual(
        fixture.source.width,
      )
      expect(located.crop.top + located.crop.height).toBeLessThanOrEqual(
        fixture.source.height,
      )
      if (!fixture.priceBand) return
      const band = located.priceBand
      if (!band) throw new Error('The dialog has no numeric read region')
      for (const word of fixture.words.filter(
        (word) => word.bbox.y0 >= (fixture.priceBand?.top ?? Infinity),
      )) {
        expect(word.bbox.x0).toBeGreaterThanOrEqual(band.left)
        expect(word.bbox.x1).toBeLessThanOrEqual(band.left + band.width)
        expect(word.bbox.y0).toBeGreaterThanOrEqual(band.top)
        expect(word.bbox.y1).toBeLessThanOrEqual(band.top + band.height)
      }
    },
  )

  it('keeps a full-image manual fallback when no anchors exist', () => {
    expect(locateDialog([], { width: 800, height: 600 })).toEqual({
      crop: { left: 0, top: 0, width: 800, height: 600 },
      confident: false,
    })
  })

  it('does not trust a lone header anchor', () => {
    const fixture = fixtureFor('7.07.16')
    const words = fixture.locateWords.filter((word) =>
      /^pack$/i.test(word.text),
    )
    expect(locateDialog(words, fixture.source).confident).toBe(false)
  })

  it('retains a best guess but rejects low-confidence anchors', () => {
    const fixture = fixtureFor('7.07.16')
    const words = fixture.locateWords.map((word) =>
      /^(?:average|price|pack)$/i.test(word.text)
        ? { ...word, confidence: 10 }
        : word,
    )
    const located = locateDialog(words, fixture.source)
    expect(located.confident).toBe(false)
    expect(located.priceBand).toBeDefined()
  })

  it('requires manual selection when two dialogs compete', () => {
    const fixture = fixtureFor('7.07.16')
    const second = fixture.locateWords.map((word) => ({
      ...word,
      bbox: { ...word.bbox, x0: word.bbox.x0 + 1300, x1: word.bbox.x1 + 1300 },
    }))
    expect(
      locateDialog([...fixture.locateWords, ...second], {
        width: 2600,
        height: 1000,
      }).confident,
    ).toBe(false)
  })

  it.each([0.5, 2])(
    'locates the dialog after scaling by %s and moving it',
    (scale) => {
      const fixture = fixtureFor('7.07.41')
      const words = fixture.locateWords.map((word) => ({
        ...word,
        bbox: {
          x0: word.bbox.x0 * scale + 183,
          x1: word.bbox.x1 * scale + 183,
          y0: word.bbox.y0 * scale + 47,
          y1: word.bbox.y1 * scale + 47,
        },
      }))
      expect(
        locateDialog(words, {
          width: fixture.source.width * scale + 300,
          height: fixture.source.height * scale + 100,
        }).confident,
      ).toBe(true)
    },
  )
})
