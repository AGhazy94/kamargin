import type { PackTier } from '@/types/game'
import type { PackPrices } from '@/utils/pack-tiers'

export type PricedIngredient = {
  itemId: number
  quantity: number
  unitPrice?: number
  winningTier?: PackTier
  pricedTierCount?: number
}

export type ProfitInputs = {
  ingredients: readonly PricedIngredient[]
  /** Pack totals the crafted item is listed at, per tier. */
  salePrices?: PackPrices
}

export type ProfitLine = PricedIngredient & {
  lineCost?: number
}

export type TierProfit = {
  tier: PackTier
  packPrice?: number
  packCost?: number
  fee?: number
  netProfit?: number
  perUnit?: number
  margin?: number
}

export type CraftProfit = {
  lines: readonly ProfitLine[]
  missingPriceCount: number
  /** Per one crafted item; every tier figure is built from it. */
  craftCost?: number
  breakEven?: number
  tiers: readonly TierProfit[]
  bestTier?: PackTier
}
