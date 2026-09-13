import { getItem } from '@/lib/game-data'
import { formatAge } from '@/utils/format'
import { type PriceHistory, refreshQueue } from '@/utils/price-history'
import type { Blocker } from '../types'

/** The warm-start queue: prices you already have that the history says have moved. */
export function topRefresh(
  history: PriceHistory,
  now = Date.now(),
  limit = 5,
): Blocker[] {
  return refreshQueue(history, now, limit).map((candidate) => ({
    itemId: candidate.itemId,
    name: getItem(candidate.itemId)?.name ?? `Item ${candidate.itemId}`,
    detail: `moved ${Math.round(candidate.swing * 100)}% · seen ${formatAge(candidate.lastSeenAt, now)}`,
  }))
}
