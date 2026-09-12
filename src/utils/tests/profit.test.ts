import { describe, expect, it } from 'vitest'

import type { PackTier } from '@/types/game'
import type { CraftProfit } from '@/types/profit'
import { calculateCraftProfit, getTier, isThinMargin } from '../profit'
import {
  HOGMEISER_BOOTS_INGREDIENTS as BOOTS,
  BOOTS_CRAFT_COST,
} from './fixtures'

function tierOf(profit: CraftProfit, tier: PackTier) {
  const found = getTier(profit, tier)
  if (!found) throw new Error(`no tier ${tier}`)
  return found
}

describe('calculateCraftProfit', () => {
  it('costs each line at quantity × unit price', () => {
    const { lines } = calculateCraftProfit({ ingredients: BOOTS })

    expect(lines.map((line) => line.lineCost)).toEqual([
      8000, 450, 300, 1200, 570,
    ])
  })

  it('withholds every figure while an ingredient is unpriced', () => {
    const result = calculateCraftProfit({
      ingredients: [BOOTS[0], { itemId: 18366, quantity: 6 }],
      salePrices: { 1: 12000, 100: 1_200_000 },
    })

    expect(result.missingPriceCount).toBe(1)
    expect(result.craftCost).toBeUndefined()
    expect(result.bestTier).toBeUndefined()
    expect(result.tiers.every((tier) => tier.netProfit === undefined)).toBe(
      true,
    )
  })

  it('shows craft cost and break-even before any sale price', () => {
    const result = calculateCraftProfit({ ingredients: BOOTS })

    expect(result.craftCost).toBe(BOOTS_CRAFT_COST)
    expect(result.breakEven).toBeCloseTo(10734.6939, 4)
    expect(result.bestTier).toBeUndefined()
  })

  it('computes a single tier exactly as v1 computed a unit price', () => {
    const tier = tierOf(
      calculateCraftProfit({ ingredients: BOOTS, salePrices: { 1: 12000 } }),
      1,
    )

    expect(tier).toMatchObject({
      packCost: BOOTS_CRAFT_COST,
      fee: 240,
      netProfit: 1240,
      perUnit: 1240,
    })
    expect(tier.margin).toBeCloseTo(0.1179, 4)
  })

  it('charges 2% of the pack total, so the per-unit fee is tier-independent', () => {
    const profit = calculateCraftProfit({
      ingredients: BOOTS,
      salePrices: { 1: 12000, 10: 120_000, 100: 1_200_000 },
    })

    expect(tierOf(profit, 10).fee).toBe(2400)
    expect(tierOf(profit, 100).fee).toBe(24_000)
    expect(tierOf(profit, 1).perUnit).toBe(tierOf(profit, 10).perUnit)
    expect(tierOf(profit, 10).perUnit).toBe(tierOf(profit, 100).perUnit)
  })

  it('picks the best tier by per-unit net, not by pack net', () => {
    const profit = calculateCraftProfit({
      ingredients: BOOTS,
      // ×1000 makes far more in total, yet loses money on every unit.
      salePrices: { 1: 13000, 1000: 10_800_000 },
    })

    expect(tierOf(profit, 1000).netProfit).toBeGreaterThan(
      tierOf(profit, 1).netProfit ?? 0,
    )
    expect(profit.bestTier).toBe(1)
  })

  it('leaves an unpriced tier blank rather than zero', () => {
    const profit = calculateCraftProfit({
      ingredients: BOOTS,
      salePrices: { 100: 1_200_000 },
    })

    expect(tierOf(profit, 10).netProfit).toBeUndefined()
    expect(tierOf(profit, 10).perUnit).toBeUndefined()
    expect(profit.bestTier).toBe(100)
  })

  it('rounds the fee', () => {
    expect(
      tierOf(
        calculateCraftProfit({ ingredients: BOOTS, salePrices: { 1: 12345 } }),
        1,
      ).fee,
    ).toBe(247)
  })

  it('reports a loss below break-even', () => {
    const tier = tierOf(
      calculateCraftProfit({ ingredients: BOOTS, salePrices: { 1: 10000 } }),
      1,
    )

    expect(tier.netProfit).toBe(-720)
    expect(tier.margin).toBeCloseTo(-0.0684, 4)
  })

  it('treats a pack price of zero as a price, not a missing one', () => {
    const tier = tierOf(
      calculateCraftProfit({ ingredients: BOOTS, salePrices: { 1: 0 } }),
      1,
    )

    expect(tier.fee).toBe(0)
    expect(tier.netProfit).toBe(-BOOTS_CRAFT_COST)
  })

  it('leaves margin undefined when every ingredient is free', () => {
    const profit = calculateCraftProfit({
      ingredients: [{ itemId: 1, quantity: 2, unitPrice: 0 }],
      salePrices: { 1: 100 },
    })

    expect(profit.craftCost).toBe(0)
    expect(tierOf(profit, 1).netProfit).toBe(98)
    expect(tierOf(profit, 1).margin).toBeUndefined()
  })

  it('has nothing to compute for an empty ingredient list', () => {
    const profit = calculateCraftProfit({
      ingredients: [],
      salePrices: { 1: 100 },
    })

    expect(profit.craftCost).toBeUndefined()
  })
})

describe('isThinMargin', () => {
  const at = (packPrice: number) =>
    getTier(
      calculateCraftProfit({
        ingredients: BOOTS,
        salePrices: { 1: packPrice },
      }),
      1,
    )

  it('flags a profitable trade under 10%', () => {
    expect(isThinMargin(at(11000))).toBe(true)
  })

  it('does not flag a healthy margin', () => {
    expect(isThinMargin(at(20000))).toBe(false)
  })

  it('does not flag a loss — that is not thin, it is negative', () => {
    expect(isThinMargin(at(9000))).toBe(false)
  })

  it('does not flag an unpriced tier', () => {
    expect(isThinMargin(undefined)).toBe(false)
  })
})
