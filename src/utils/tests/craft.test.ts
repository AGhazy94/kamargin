import { describe, expect, it } from 'vitest'

import { bestMarginTier } from '../craft'
import { calculateCraftProfit } from '../profit'

describe('bestMarginTier', () => {
  it('picks the tier with the highest margin', () => {
    const { tiers } = calculateCraftProfit({
      ingredients: [{ itemId: 1, quantity: 1, unitPrice: 100 }],
      salePrices: { 1: 150, 10: 2000, 100: 12_000 },
    })

    expect(bestMarginTier(tiers)?.tier).toBe(10)
  })

  it('yields nothing when no tier has a margin, where bestTier still picks one', () => {
    // A free recipe divides by a zero pack cost: perUnit survives, margin cannot.
    const profit = calculateCraftProfit({
      ingredients: [{ itemId: 1, quantity: 1, unitPrice: 0 }],
      salePrices: { 1: 150 },
    })

    expect(profit.bestTier).toBe(1)
    expect(bestMarginTier(profit.tiers)).toBeUndefined()
  })
})
