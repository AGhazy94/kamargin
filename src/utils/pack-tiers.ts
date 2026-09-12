import type { PackTier } from '@/types/game'

export const PACK_TIERS: readonly PackTier[] = [1, 10, 100, 1000]

/** Pack totals, as the game shows them. Per-unit is always derived, never stored. */
export type PackPrices = Partial<Record<PackTier, number>>

export function unitPriceOf(packPrice: number, tier: PackTier): number {
  return packPrice / tier
}

// Bulk is not reliably cheaper, so the winner has to be found rather than assumed.
export function cheapestTier(
  prices: PackPrices,
): { tier: PackTier; unitPrice: number } | undefined {
  let best: { tier: PackTier; unitPrice: number } | undefined

  for (const tier of PACK_TIERS) {
    const packPrice = prices[tier]
    if (packPrice === undefined) continue

    const unitPrice = unitPriceOf(packPrice, tier)
    if (best === undefined || unitPrice < best.unitPrice) {
      best = { tier, unitPrice }
    }
  }

  return best
}

export function pricedTierCount(prices: PackPrices): number {
  return PACK_TIERS.filter((tier) => prices[tier] !== undefined).length
}
