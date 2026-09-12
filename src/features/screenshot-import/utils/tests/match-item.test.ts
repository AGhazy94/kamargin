import { describe, expect, it } from 'vitest'

import { searchItems } from '@/lib/game-data'

import { matchItem } from '../match-item'
import { parseDialog } from '../parse-dialog'
import { fixtureFor } from './fixtures'

function itemNamed(name: string) {
  const item = searchItems(name).find((entry) => entry.name === name)
  if (!item) throw new Error(`Bundled item not found: ${name}`)
  return item
}

const originals = [
  ['7.07.16', 'Greedo Rum'],
  ['7.07.33', 'Edelweiss'],
  ['7.07.41', 'Kido Beak'],
  ['7.07.53', 'Manderisha Skin'],
  ['7.08.23', 'Tiny Drinking Trough Potion'],
] as const
const catalogue = originals.map(([, name]) => itemNamed(name))

describe('matchItem', () => {
  it.each(originals)(
    'matches the %s screenshot to its bundled item',
    (time, name) => {
      const match = matchItem(parseDialog(fixtureFor(time).words), catalogue)
      expect(match.confident).toBe(true)
      expect(match.itemId).toBe(itemNamed(name).id)
    },
  )

  it.each(['Kldo Beak', 'Kido Baek', 'K\u00eddo B\u00e9ak!!!'])(
    'matches the OCR slip %s',
    (title) => {
      const dialog = parseDialog(fixtureFor('7.07.41').words)
      const match = matchItem(
        { ...dialog, title: { value: title, confidence: 90 } },
        catalogue,
      )
      expect(match.itemId).toBe(itemNamed('Kido Beak').id)
      expect(match.confident).toBe(true)
    },
  )

  it('uses level and type to disambiguate a name match', () => {
    const item = itemNamed('Kido Beak')
    const other = { ...item, id: item.id + 100000, level: 190, type: 'Tail' }
    const match = matchItem(parseDialog(fixtureFor('7.07.41').words), [
      other,
      item,
    ])
    expect(match.itemId).toBe(item.id)
    expect(match.candidates[0].score).toBeLessThan(match.candidates[1].score)
  })

  it('leaves equally plausible names unresolved', () => {
    const item = itemNamed('Kido Beak')
    const other = { ...item, id: item.id + 100000, name: 'Kido Beek' }
    const dialog = parseDialog(fixtureFor('7.07.41').words)
    const match = matchItem(
      { ...dialog, title: { value: 'Kido Beok', confidence: 95 } },
      [item, other],
    )
    expect(match.confident).toBe(false)
    expect(match.itemId).toBeUndefined()
    expect(match.candidates).toHaveLength(2)
  })

  it('does not preselect a name that contradicts the metadata', () => {
    const item = itemNamed('Kido Beak')
    const dialog = parseDialog(fixtureFor('7.07.41').words)
    const match = matchItem(
      { ...dialog, level: { value: 190, confidence: 96 } },
      [item],
    )
    expect(match.confident).toBe(false)
    expect(match.itemId).toBeUndefined()
    expect(match.candidates).toHaveLength(1)
  })

  it('shows low-confidence title candidates without choosing for the user', () => {
    const dialog = parseDialog(fixtureFor('7.07.41').words)
    const match = matchItem(
      { ...dialog, title: { value: 'Kido Beak', confidence: 12 } },
      catalogue,
    )
    expect(match.itemId).toBeUndefined()
    expect(match.confident).toBe(false)
    expect(match.candidates[0].item.name).toBe('Kido Beak')
  })

  it('does not accept names beyond edit distance two', () => {
    const dialog = parseDialog(fixtureFor('7.07.41').words)
    const match = matchItem(
      { ...dialog, title: { value: 'Unrelated resource', confidence: 96 } },
      catalogue,
    )
    expect(match.candidates).toEqual([])
    expect(match.itemId).toBeUndefined()
  })

  it('does not infer an item from a missing title or a non-market screenshot', () => {
    expect(
      matchItem({ isMarketDialog: true, tiers: {} }, catalogue).candidates,
    ).toEqual([])
    expect(
      matchItem(parseDialog(fixtureFor('12.09.22').words), catalogue)
        .candidates,
    ).toEqual([])
  })
})
