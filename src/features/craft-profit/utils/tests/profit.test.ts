import { describe, expect, it } from 'vitest'

import { calculateCraftProfit, isThinMargin } from '../profit'
import { HOGMEISER_BOOTS_INGREDIENTS as BOOTS } from './fixtures'

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
      salePrice: 12000,
    })

    expect(result.missingPriceCount).toBe(1)
    expect(result.craftCost).toBeUndefined()
    expect(result.netProfit).toBeUndefined()
  })

  it('shows craft cost alone when the sale price is missing', () => {
    const result = calculateCraftProfit({ ingredients: BOOTS })

    expect(result.craftCost).toBe(10520)
    expect(result.fee).toBeUndefined()
    expect(result.breakEven).toBeUndefined()
  })

  it('computes the full result', () => {
    const result = calculateCraftProfit({
      ingredients: BOOTS,
      salePrice: 12000,
    })

    expect(result).toMatchObject({
      craftCost: 10520,
      fee: 240,
      netProfit: 1240,
      breakEven: 10734.693877551021,
    })
    expect(result.margin).toBeCloseTo(0.1179, 4)
  })

  it('rounds the fee', () => {
    expect(
      calculateCraftProfit({ ingredients: BOOTS, salePrice: 12345 }).fee,
    ).toBe(247)
  })

  it('reports a loss below break-even', () => {
    const result = calculateCraftProfit({
      ingredients: BOOTS,
      salePrice: 10000,
    })

    expect(result.netProfit).toBe(-720)
    expect(result.margin).toBeCloseTo(-0.0684, 4)
  })

  it('treats a sale price of zero as a price, not a missing one', () => {
    const result = calculateCraftProfit({ ingredients: BOOTS, salePrice: 0 })

    expect(result.fee).toBe(0)
    expect(result.netProfit).toBe(-10520)
  })

  it('leaves margin undefined when every ingredient is free', () => {
    const result = calculateCraftProfit({
      ingredients: [{ itemId: 1, quantity: 2, unitPrice: 0 }],
      salePrice: 100,
    })

    expect(result.craftCost).toBe(0)
    expect(result.netProfit).toBe(98)
    expect(result.margin).toBeUndefined()
  })

  it('has nothing to compute for an empty ingredient list', () => {
    const result = calculateCraftProfit({ ingredients: [], salePrice: 100 })

    expect(result.craftCost).toBeUndefined()
  })
})

describe('isThinMargin', () => {
  it('flags a profitable trade under 10%', () => {
    expect(
      isThinMargin(
        calculateCraftProfit({ ingredients: BOOTS, salePrice: 11000 }),
      ),
    ).toBe(true)
  })

  it('does not flag a healthy margin', () => {
    expect(
      isThinMargin(
        calculateCraftProfit({ ingredients: BOOTS, salePrice: 20000 }),
      ),
    ).toBe(false)
  })

  it('does not flag a loss — that is not thin, it is negative', () => {
    expect(
      isThinMargin(
        calculateCraftProfit({ ingredients: BOOTS, salePrice: 9000 }),
      ),
    ).toBe(false)
  })
})
