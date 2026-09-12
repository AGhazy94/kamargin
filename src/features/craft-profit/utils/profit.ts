import type { PackTier } from '@/types/game'
import { PACK_TIERS } from '@/utils/pack-tiers'
import type {
  CraftProfit,
  ProfitInputs,
  ProfitLine,
  TierProfit,
} from '../types'

export const MARKETPLACE_FEE_RATE = 0.02

// Community consensus, not a game rule: below this the unsold risk dominates.
export const THIN_MARGIN_THRESHOLD = 0.1

function emptyTiers(): TierProfit[] {
  return PACK_TIERS.map((tier) => ({ tier }))
}

function tierProfit(
  tier: PackTier,
  craftCost: number,
  packPrice: number | undefined,
): TierProfit {
  if (packPrice === undefined) return { tier }

  const packCost = craftCost * tier
  // 2% of the pack total at every tier, so no tier is fee-advantaged.
  const fee = Math.round(packPrice * MARKETPLACE_FEE_RATE)
  const netProfit = packPrice - packCost - fee

  return {
    tier,
    packPrice,
    packCost,
    fee,
    netProfit,
    perUnit: netProfit / tier,
    margin: packCost === 0 ? undefined : netProfit / packCost,
  }
}

function bestTierOf(tiers: readonly TierProfit[]): PackTier | undefined {
  let best: TierProfit | undefined

  for (const tier of tiers) {
    if (tier.perUnit === undefined) continue
    if (best?.perUnit === undefined || tier.perUnit > best.perUnit) best = tier
  }

  return best?.tier
}

export function calculateCraftProfit({
  ingredients,
  salePrices = {},
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
    return { lines, missingPriceCount, tiers: emptyTiers() }
  }

  const craftCost = lines.reduce(
    (total, line) => total + (line.lineCost ?? 0),
    0,
  )
  const tiers = PACK_TIERS.map((tier) =>
    tierProfit(tier, craftCost, salePrices[tier]),
  )

  return {
    lines,
    missingPriceCount,
    craftCost,
    breakEven: craftCost / (1 - MARKETPLACE_FEE_RATE),
    tiers,
    bestTier: bestTierOf(tiers),
  }
}

export function getTier(
  profit: CraftProfit,
  tier: PackTier | undefined,
): TierProfit | undefined {
  return tier === undefined
    ? undefined
    : profit.tiers.find((candidate) => candidate.tier === tier)
}

export function isThinMargin(tier: TierProfit | undefined): boolean {
  if (tier?.netProfit === undefined || tier.margin === undefined) return false
  return tier.netProfit > 0 && tier.margin < THIN_MARGIN_THRESHOLD
}
