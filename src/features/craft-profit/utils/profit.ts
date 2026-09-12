import type { CraftProfit, ProfitInputs, ProfitLine } from '../types'

export const MARKETPLACE_FEE_RATE = 0.02

// Community consensus, not a game rule: below this the unsold risk dominates.
export const THIN_MARGIN_THRESHOLD = 0.1

export function calculateCraftProfit({
  ingredients,
  salePrice,
}: ProfitInputs): CraftProfit {
  const lines: ProfitLine[] = ingredients.map((ingredient) => ({
    ...ingredient,
    lineCost:
      ingredient.unitPrice === undefined
        ? undefined
        : ingredient.unitPrice * ingredient.quantity,
  }))

  const missingPriceCount = lines.filter(
    (line) => line.lineCost === undefined,
  ).length

  if (missingPriceCount > 0 || lines.length === 0) {
    return { lines, missingPriceCount }
  }

  const craftCost = lines.reduce(
    (total, line) => total + (line.lineCost ?? 0),
    0,
  )

  if (salePrice === undefined) {
    return { lines, missingPriceCount, craftCost }
  }

  const fee = Math.round(salePrice * MARKETPLACE_FEE_RATE)
  const netProfit = salePrice - craftCost - fee

  return {
    lines,
    missingPriceCount,
    craftCost,
    fee,
    netProfit,
    margin: craftCost === 0 ? undefined : netProfit / craftCost,
    breakEven: craftCost / (1 - MARKETPLACE_FEE_RATE),
  }
}

export function isThinMargin({ netProfit, margin }: CraftProfit): boolean {
  if (netProfit === undefined || margin === undefined) return false
  return netProfit > 0 && margin < THIN_MARGIN_THRESHOLD
}
