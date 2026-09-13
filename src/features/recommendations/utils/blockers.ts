import { getItem } from '@/lib/game-data'
import { getPackPrices, type PriceBook } from '@/stores/price-book'
import { cheapestTier } from '@/utils/pack-tiers'
import type { Blocker, Recommendation } from '../types'

/**
 * Pricing a blocker removes it from the next ranking, which would snatch the row
 * out from under the cursor — so a row already priced holds its place.
 */
export function mergeBlockers(
  shown: readonly Blocker[],
  next: readonly Blocker[],
  priced: Readonly<Record<number, number>>,
): Blocker[] {
  const held = shown.filter((blocker) => priced[blocker.itemId] !== undefined)
  const heldIds = new Set(held.map((blocker) => blocker.itemId))
  const queue = next.filter((blocker) => !heldIds.has(blocker.itemId))

  const merged: Blocker[] = []
  let taken = 0
  for (const blocker of shown) {
    if (priced[blocker.itemId] !== undefined) merged.push(blocker)
    else if (taken < queue.length) merged.push(queue[taken++])
  }
  while (merged.length < next.length && taken < queue.length) {
    merged.push(queue[taken++])
  }

  return merged
}

function nameOf(itemId: number): string {
  return getItem(itemId)?.name ?? `Item ${itemId}`
}

/** Which unpriced ingredients hold back the most recipes — the answer to a cold price book. */
export function topBlockers(
  rows: readonly Recommendation[],
  book: PriceBook,
  limit = 5,
): Blocker[] {
  const blocked = new Map<number, number>()

  for (const row of rows) {
    // Pricing an ingredient of a doomed craft buys nothing: it cannot rank however cheap it turns out.
    if (row.state === 'dead') continue
    for (const ingredient of row.item.recipe ?? []) {
      if (cheapestTier(getPackPrices(book[ingredient.itemId]))) continue
      blocked.set(ingredient.itemId, (blocked.get(ingredient.itemId) ?? 0) + 1)
    }
  }

  return [...blocked]
    .sort(
      ([leftId, left], [rightId, right]) =>
        right - left || nameOf(leftId).localeCompare(nameOf(rightId)),
    )
    .slice(0, limit)
    .map(([itemId, recipeCount]) => ({
      itemId,
      name: nameOf(itemId),
      detail: `unlocks ${recipeCount} ${recipeCount === 1 ? 'craft' : 'crafts'}`,
    }))
}
