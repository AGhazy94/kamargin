import { describe, expect, it } from 'vitest'

import type { PriceBook } from '@/stores/price-book'
import type { PackTier } from '@/types/game'
import type { Snapshot } from '@/types/saved'
import {
  buildPriceHistory,
  isSettled,
  isVolatile,
  type PriceObservation,
  refreshQueue,
  volatilityOf,
} from '../price-history'

const NOW = Date.parse('2026-09-13T12:00:00Z')
const DAY = 24 * 60 * 60 * 1000

function snapshot(
  takenAt: number,
  prices: Record<number, Partial<Record<PackTier, number>>>,
): Snapshot {
  return {
    id: `snap-${takenAt}`,
    itemId: 100,
    itemName: 'Item 100',
    label: 'test',
    takenAt,
    prices,
    figures: { tiers: [] },
  }
}

function entry(itemId: number, packPrice: number, capturedAt: number) {
  return {
    serverId: 351,
    itemId,
    tiers: { 1: { packPrice, capturedAt } },
  }
}

function seen(at: number, unitPrice: number): PriceObservation {
  return { at, unitPrice }
}

describe('buildPriceHistory', () => {
  it('compares a pack total against a single, per unit', () => {
    const history = buildPriceHistory(
      [
        snapshot(NOW - 2 * DAY, { 1: { 100: 10_000 } }),
        snapshot(NOW - DAY, { 1: { 1: 120 } }),
      ],
      {},
    )

    // 10 000 for a hundred is 100 each — not a hundredfold swing against 120.
    expect(history.get(1)).toEqual([
      seen(NOW - 2 * DAY, 100),
      seen(NOW - DAY, 120),
    ])
  })

  it('adds the current book as the latest observation', () => {
    const book: PriceBook = { 1: entry(1, 150, NOW) }
    const history = buildPriceHistory(
      [snapshot(NOW - DAY, { 1: { 1: 100 } })],
      book,
    )

    expect(history.get(1)).toEqual([seen(NOW - DAY, 100), seen(NOW, 150)])
  })

  it('collapses a restored snapshot back onto its own instant', () => {
    // restorePackPrices writes the snapshot's prices with the snapshot's takenAt.
    const book: PriceBook = { 1: entry(1, 100, NOW - DAY) }
    const history = buildPriceHistory(
      [snapshot(NOW - DAY, { 1: { 1: 100 } })],
      book,
    )

    expect(history.get(1)).toHaveLength(1)
  })

  it('orders observations oldest first, whatever order the snapshots are in', () => {
    const history = buildPriceHistory(
      [
        snapshot(NOW, { 1: { 1: 300 } }),
        snapshot(NOW - 2 * DAY, { 1: { 1: 100 } }),
        snapshot(NOW - DAY, { 1: { 1: 200 } }),
      ],
      {},
    )

    expect(history.get(1)?.map((observation) => observation.unitPrice)).toEqual(
      [100, 200, 300],
    )
  })
})

describe('volatilityOf', () => {
  it('has no opinion on a price seen once', () => {
    expect(volatilityOf([seen(NOW, 100)])).toBeUndefined()
    expect(volatilityOf([])).toBeUndefined()
    expect(volatilityOf(undefined)).toBeUndefined()
  })

  it('measures the spread against the median', () => {
    const volatility = volatilityOf([
      seen(NOW - DAY, 100),
      seen(NOW, 140),
      seen(NOW - 2 * DAY, 120),
    ])

    expect(volatility).toEqual({
      swing: (140 - 100) / 120,
      observations: 3,
      lastSeenAt: NOW,
    })
  })

  it('lets a typo widen the spread without dragging the centre', () => {
    const typo = volatilityOf([
      seen(NOW - 2 * DAY, 100),
      seen(NOW - DAY, 104),
      seen(NOW, 10_000),
    ])

    // A mean would sit near 3400 and hide the outlier; the median stays at 104.
    expect(typo?.swing).toBeCloseTo((10_000 - 100) / 104)
  })

  it('reads a steady price as settled and a swinging one as volatile', () => {
    const steady = volatilityOf([seen(NOW - DAY, 100), seen(NOW, 102)])
    const swinging = volatilityOf([seen(NOW - DAY, 100), seen(NOW, 160)])

    expect([isSettled(steady), isVolatile(steady)]).toEqual([true, false])
    expect([isSettled(swinging), isVolatile(swinging)]).toEqual([false, true])
    expect([isSettled(undefined), isVolatile(undefined)]).toEqual([
      false,
      false,
    ])
  })
})

describe('refreshQueue', () => {
  const swinging = (from: number, to: number, lastSeen: number) => [
    seen(lastSeen - DAY, from),
    seen(lastSeen, to),
  ]

  it('ranks a stale swing above an identical fresh one', () => {
    const history = new Map([
      [1, swinging(100, 200, NOW)],
      [2, swinging(100, 200, NOW - 7 * DAY)],
    ])

    expect(refreshQueue(history, NOW).map((row) => row.itemId)).toEqual([2, 1])
  })

  it('leaves a steady price out however old it is', () => {
    const history = new Map([
      [1, [seen(NOW - 30 * DAY, 100), seen(NOW - 29 * DAY, 101)]],
    ])

    expect(refreshQueue(history, NOW)).toEqual([])
  })

  it('leaves out a price seen only once', () => {
    expect(
      refreshQueue(new Map([[1, [seen(NOW - 30 * DAY, 100)]]]), NOW),
    ).toEqual([])
  })

  it('returns at most the requested number', () => {
    const history = new Map([
      [1, swinging(100, 200, NOW - DAY)],
      [2, swinging(100, 300, NOW - 2 * DAY)],
      [3, swinging(100, 400, NOW - 3 * DAY)],
    ])

    expect(refreshQueue(history, NOW, 2)).toHaveLength(2)
  })
})
