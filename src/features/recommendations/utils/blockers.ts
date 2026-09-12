import { getItem } from '@/lib/game-data'
import { getPackPrices, type PriceBook } from '@/stores/price-book'
import type { Item } from '@/types/game'
import { cheapestTier } from '@/utils/pack-tiers'
import type { Blocker } from '../types'

/** Which unpriced ingredients hold back the most recipes — the answer to a cold price book. */
export function topBlockers(
  items: readonly Item[],
  book: PriceBook,
  limit = 5,
): Blocker[] {
  const blocked = new Map<number, number>()

  for (const item of items) {
    for (const ingredient of item.recipe ?? []) {
      if (cheapestTier(getPackPrices(book[ingredient.itemId]))) continue
      blocked.set(ingredient.itemId, (blocked.get(ingredient.itemId) ?? 0) + 1)
    }
  }

  return [...blocked]
    .map(([itemId, recipeCount]) => ({
      itemId,
      name: getItem(itemId)?.name ?? `Item ${itemId}`,
      recipeCount,
    }))
    .sort(
      (a, b) => b.recipeCount - a.recipeCount || a.name.localeCompare(b.name),
    )
    .slice(0, limit)
}
