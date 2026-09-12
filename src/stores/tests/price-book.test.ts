import { describe, expect, it } from 'vitest'

import {
  getPricedTierCount,
  getWinningTier,
  type LegacyPriceEntry,
  migratePriceBook,
  type PriceEntry,
} from '../price-book'

const LEGACY: LegacyPriceEntry = {
  serverId: 355,
  itemId: 911,
  unitPrice: 8000,
  capturedAt: 1_700_000_000_000,
}

const TIERED: PriceEntry = {
  serverId: 355,
  itemId: 2504,
  tiers: {
    1: { packPrice: 459, capturedAt: 1_700_000_000_000 },
    100: { packPrice: 50_000, capturedAt: 1_700_000_100_000 },
  },
}

describe('migratePriceBook', () => {
  it('moves a v1 unit price into tier 1, keeping when it was captured', () => {
    const { book, changed } = migratePriceBook({ 911: LEGACY })

    expect(changed).toBe(true)
    expect(book[911]).toEqual({
      serverId: 355,
      itemId: 911,
      tiers: { 1: { packPrice: 8000, capturedAt: LEGACY.capturedAt } },
    })
  })

  it('is idempotent — a migrated book is left alone', () => {
    const once = migratePriceBook({ 911: LEGACY })
    const twice = migratePriceBook(once.book)

    expect(twice.changed).toBe(false)
    expect(twice.book).toEqual(once.book)
  })

  it('migrates legacy entries beside tiered ones', () => {
    const { book, changed } = migratePriceBook({ 911: LEGACY, 2504: TIERED })

    expect(changed).toBe(true)
    expect(book[2504]).toBe(TIERED)
    expect(book[911].tiers[1]?.packPrice).toBe(8000)
  })

  it('has nothing to change in an empty book', () => {
    expect(migratePriceBook({})).toEqual({ book: {}, changed: false })
  })
})

describe('getWinningTier', () => {
  it('reads the cheapest per-unit tier off an entry', () => {
    expect(getWinningTier(TIERED)).toEqual({ tier: 1, unitPrice: 459 })
  })

  it('has no winner for an item with no entry', () => {
    expect(getWinningTier(undefined)).toBeUndefined()
    expect(getPricedTierCount(undefined)).toBe(0)
  })

  it('counts the priced tiers', () => {
    expect(getPricedTierCount(TIERED)).toBe(2)
  })
})
