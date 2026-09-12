import {
  getPackPrices,
  isStale,
  type PriceBook,
  type PriceEntry,
  type TierPrice,
} from '@/stores/price-book'
import type { Item, PackTier } from '@/types/game'
import type { CraftProfit, PricedIngredient, TierProfit } from '@/types/profit'
import { cheapestTier, pricedTierCount } from '@/utils/pack-tiers'
import { calculateCraftProfit } from '@/utils/profit'

export type CraftSummary = {
  profit: CraftProfit
  /** The tier the figures are quoted at — the one that maximises margin. */
  best?: TierProfit
  stale: boolean
}

// The ranking sorts on margin, so the winning tier must be the one that maximises it.
export function bestMarginTier(
  tiers: readonly TierProfit[],
): TierProfit | undefined {
  let best: TierProfit | undefined

  for (const tier of tiers) {
    if (tier.margin === undefined) continue
    if (best?.margin === undefined || tier.margin > best.margin) best = tier
  }

  return best
}

function usedPrice(
  entry: PriceEntry | undefined,
  tier: PackTier | undefined,
): TierPrice | undefined {
  return tier === undefined ? undefined : entry?.tiers[tier]
}

/** One craft priced against the book — what both the ranking and the watchlist quote. */
export function summariseCraft(
  item: Item,
  book: PriceBook,
  now = Date.now(),
): CraftSummary {
  const recipe = item.recipe ?? []
  const used: TierPrice[] = []

  const ingredients: PricedIngredient[] = recipe.map((ingredient) => {
    const entry = book[ingredient.itemId]
    const prices = getPackPrices(entry)
    const cheapest = cheapestTier(prices)
    const price = usedPrice(entry, cheapest?.tier)
    if (price) used.push(price)

    return {
      itemId: ingredient.itemId,
      quantity: ingredient.quantity,
      unitPrice: cheapest?.unitPrice,
      winningTier: cheapest?.tier,
      pricedTierCount: pricedTierCount(prices),
    }
  })

  const saleEntry = book[item.id]
  const profit = calculateCraftProfit({
    ingredients,
    salePrices: getPackPrices(saleEntry),
  })
  const best = bestMarginTier(profit.tiers)
  const salePrice = usedPrice(saleEntry, best?.tier)
  if (salePrice) used.push(salePrice)

  return {
    profit,
    best,
    // Freshness is shown, never scored: a stale row keeps its place in the order.
    stale: used.length > 0 && used.every((price) => isStale(price, now)),
  }
}
