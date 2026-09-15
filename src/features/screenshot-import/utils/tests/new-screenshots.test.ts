import { describe, expect, it } from 'vitest'

import {
  isScreenshotName,
  markFrom,
  selectNew,
  WATCH_SCAN_LIMIT,
} from '../new-screenshots'

function file(name: string, lastModified: number) {
  return { name, lastModified }
}

describe('isScreenshotName', () => {
  it('accepts the formats a screenshot lands in', () => {
    for (const name of [
      'a.png',
      'a.PNG',
      'a.jpg',
      'a.jpeg',
      'a.webp',
      'a.avif',
    ])
      expect(isScreenshotName(name)).toBe(true)
  })

  it('rejects everything else', () => {
    for (const name of ['notes.txt', 'clip.mov', 'png', 'a.png.txt'])
      expect(isScreenshotName(name)).toBe(false)
  })
})

describe('selectNew', () => {
  it('takes nothing from a folder older than the mark', () => {
    const result = selectNew(
      [file('a.png', 10), file('b.png', 20)],
      markFrom(25),
    )
    expect(result.ingest).toEqual([])
    expect(result.next).toEqual(markFrom(25))
  })

  it('takes only files written after the mark', () => {
    const result = selectNew(
      [file('old.png', 10), file('new.png', 30)],
      markFrom(20),
    )
    expect(result.ingest.map((entry) => entry.name)).toEqual(['new.png'])
    expect(result.next).toEqual({ at: 30, names: ['new.png'] })
  })

  it('ignores non-images', () => {
    const result = selectNew(
      [file('notes.txt', 30), file('shot.png', 30)],
      markFrom(20),
    )
    expect(result.ingest.map((entry) => entry.name)).toEqual(['shot.png'])
  })

  it('orders oldest first, so the review grid reads in capture order', () => {
    const result = selectNew(
      [file('c.png', 50), file('a.png', 30), file('b.png', 40)],
      markFrom(20),
    )
    expect(result.ingest.map((entry) => entry.name)).toEqual([
      'a.png',
      'b.png',
      'c.png',
    ])
  })

  it('does not re-take a file already taken at the mark', () => {
    const first = selectNew(
      [file('a.png', 30), file('b.png', 30)],
      markFrom(20),
    )
    expect(first.next).toEqual({ at: 30, names: ['a.png', 'b.png'] })

    const second = selectNew([file('a.png', 30), file('b.png', 30)], first.next)
    expect(second.ingest).toEqual([])
    expect(second.next).toEqual(first.next)
  })

  it('takes a sibling written in the same millisecond as the mark', () => {
    const result = selectNew([file('a.png', 30), file('b.png', 30)], {
      at: 30,
      names: ['a.png'],
    })
    expect(result.ingest.map((entry) => entry.name)).toEqual(['b.png'])
    expect(result.next).toEqual({ at: 30, names: ['b.png'] })
  })

  it('keeps the newest up to the limit and reports the rest as skipped', () => {
    const many = Array.from({ length: 300 }, (_, index) =>
      file(`shot-${index}.png`, 100 + index),
    )
    const result = selectNew(many, markFrom(0))
    expect(result.ingest).toHaveLength(WATCH_SCAN_LIMIT)
    expect(result.skipped).toBe(300 - WATCH_SCAN_LIMIT)
    expect(result.ingest[0].name).toBe('shot-290.png')
    expect(result.ingest.at(-1)?.name).toBe('shot-299.png')
  })

  it('advances the mark past everything it skipped, so they never return', () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      file(`shot-${index}.png`, 100 + index),
    )
    const first = selectNew(many, markFrom(0), 5)
    expect(first.next.at).toBe(111)
    expect(selectNew(many, first.next, 5).ingest).toEqual([])
  })
})
