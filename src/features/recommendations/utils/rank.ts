import {
  getPackPrices,
  isStale,
  type PriceBook,
  type PriceEntry,
  type TierPrice,
} from '@/stores/price-book'
import type { Item, PackTier } from '@/types/game'
import type { PricedIngredient, TierProfit } from '@/types/profit'
import { cheapestTier, pricedTierCount } from '@/utils/pack-tiers'
import { calculateCraftProfit, isThinMargin } from '@/utils/profit'
import type { Recommendation, RecommendationFilters, RowState } from '../types'

export const LEVEL_RANGE = { min: 1, max: 200 } as const

export const DEFAULT_FILTERS: RecommendationFilters = {
  jobId: null,
  minLevel: LEVEL_RANGE.min,
  maxLevel: LEVEL_RANGE.max,
  hideIncomplete: false,
}

const STATE_ORDER: Record<RowState, number> = {
  ranked: 0,
  'unpriced-sale': 1,
  'missing-inputs': 2,
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

export function matchesFilters(
  item: Item,
  { jobId, minLevel, maxLevel }: RecommendationFilters,
): boolean {
  if (item.job === undefined || item.craftLevel === undefined) return false
  if (jobId !== null && item.job !== jobId) return false
  return item.craftLevel >= minLevel && item.craftLevel <= maxLevel
}

function toRecommendation(
  item: Item,
  book: PriceBook,
  now: number,
): Recommendation {
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

  const state: RowState =
    profit.missingPriceCount > 0 || profit.craftCost === undefined
      ? 'missing-inputs'
      : best === undefined
        ? 'unpriced-sale'
        : 'ranked'

  return {
    item,
    state,
    craftCost: profit.craftCost,
    breakEven: profit.breakEven,
    bestTier: best?.tier,
    netPerUnit: best?.perUnit,
    margin: best?.margin,
    missingPriceCount: profit.missingPriceCount,
    missing: profit.lines
      .filter((line) => line.unitPrice === undefined)
      .map(({ itemId, quantity }) => ({ itemId, quantity })),
    // Freshness is shown, never scored: a stale row keeps its place in the order.
    stale: used.length > 0 && used.every((price) => isStale(price, now)),
    thinMargin: isThinMargin(best),
  }
}

function compare(a: Recommendation, b: Recommendation): number {
  if (a.state !== b.state) return STATE_ORDER[a.state] - STATE_ORDER[b.state]

  if (a.state === 'ranked') return (b.margin ?? 0) - (a.margin ?? 0)
  if (a.state === 'missing-inputs') {
    const missing = a.missingPriceCount - b.missingPriceCount
    if (missing !== 0) return missing
  }

  return a.item.name.localeCompare(b.item.name)
}

export function rankRecommendations(
  items: readonly Item[],
  book: PriceBook,
  filters: RecommendationFilters,
  now = Date.now(),
): Recommendation[] {
  const rows: Recommendation[] = []

  for (const item of items) {
    // Job and level are plain field comparisons: they cut the set before a price is read.
    if (!matchesFilters(item, filters)) continue
    const row = toRecommendation(item, book, now)
    if (filters.hideIncomplete && row.state === 'missing-inputs') continue
    rows.push(row)
  }

  return rows.sort(compare)
}

export function countByState(rows: readonly Recommendation[]) {
  return {
    ranked: rows.filter((row) => row.state === 'ranked').length,
    unpricedSale: rows.filter((row) => row.state === 'unpriced-sale').length,
    missingInputs: rows.filter((row) => row.state === 'missing-inputs').length,
  }
}
