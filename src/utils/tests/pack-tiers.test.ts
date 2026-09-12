import { describe, expect, it } from 'vitest'

import { cheapestTier, pricedTierCount } from '../pack-tiers'

describe('cheapestTier', () => {
  it('has no winner without a price', () => {
    expect(cheapestTier({})).toBeUndefined()
  })

  it('wins on per-unit price, not on pack total', () => {
    expect(cheapestTier({ 1: 500, 100: 31_000 })).toEqual({
      tier: 100,
      unitPrice: 310,
    })
  })

  // The observed case: 459/u at a pack of one, 500/u at both 100 and 1000.
  it('keeps the small pack when bulk is dearer per unit', () => {
    expect(cheapestTier({ 1: 459, 100: 50_000, 1000: 500_000 })).toEqual({
      tier: 1,
      unitPrice: 459,
    })
  })

  it('breaks a per-unit tie toward the smaller pack', () => {
    expect(cheapestTier({ 10: 1000, 100: 10_000 })).toEqual({
      tier: 10,
      unitPrice: 100,
    })
  })

  it('treats a free pack as priced', () => {
    expect(cheapestTier({ 1: 0 })).toEqual({ tier: 1, unitPrice: 0 })
  })
})

describe('pricedTierCount', () => {
  it('counts only the tiers that carry a price', () => {
    expect(pricedTierCount({})).toBe(0)
    expect(pricedTierCount({ 1: 0 })).toBe(1)
    expect(pricedTierCount({ 1: 459, 100: 50_000, 1000: 500_000 })).toBe(3)
  })
})
