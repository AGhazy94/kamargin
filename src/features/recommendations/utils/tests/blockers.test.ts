import { describe, expect, it } from 'vitest'

import { mergeBlockers, topBlockers } from '../blockers'
import { book, craftable } from './fixtures'

const ITEMS = [
  craftable(100, {
    recipe: [
      [1, 1],
      [2, 1],
    ],
  }),
  craftable(200, {
    recipe: [
      [1, 1],
      [3, 1],
    ],
  }),
  craftable(300, { recipe: [[1, 1]] }),
]

describe('topBlockers', () => {
  it('ranks unpriced ingredients by the recipes they hold back', () => {
    expect(topBlockers(ITEMS, {})).toEqual([
      { itemId: 1, name: 'Item 1', recipeCount: 3 },
      { itemId: 2, name: 'Item 2', recipeCount: 1 },
      { itemId: 3, name: 'Item 3', recipeCount: 1 },
    ])
  })

  it('drops an ingredient once it is priced at any tier', () => {
    const blockers = topBlockers(ITEMS, book({ 1: { 100: 10_000 } }))

    expect(blockers.map((blocker) => blocker.itemId)).toEqual([2, 3])
  })

  it('returns at most the requested number', () => {
    expect(topBlockers(ITEMS, {}, 1)).toHaveLength(1)
  })
})

describe('mergeBlockers', () => {
  const blocker = (itemId: number, recipeCount = 1) => ({
    itemId,
    name: `Item ${itemId}`,
    recipeCount,
  })
  const shown = [blocker(1), blocker(2), blocker(3)]

  it('holds a priced row in place and refills around it', () => {
    const merged = mergeBlockers(shown, [blocker(3), blocker(4)], { 2: 500 })

    expect(merged.map((entry) => entry.itemId)).toEqual([3, 2, 4])
  })

  it('replaces the whole list when nothing was priced', () => {
    const merged = mergeBlockers(shown, [blocker(7), blocker(8)], {})

    expect(merged.map((entry) => entry.itemId)).toEqual([7, 8])
  })

  it('keeps every priced row even when the ranking empties', () => {
    const merged = mergeBlockers(shown, [], { 1: 100, 3: 300 })

    expect(merged.map((entry) => entry.itemId)).toEqual([1, 3])
  })
})
