import { useCallback } from 'react'

import {
  getPackPrices,
  removeTierPrice,
  restorePackPrices,
  usePriceBook,
  writeTierPrice,
} from '@/stores/price-book'
import type { Item, PackTier } from '@/types/game'
import type { PackPrices } from '@/utils/pack-tiers'

export type PackPriceMap = Record<number, PackPrices>

function itemIdsOf(item: Item): number[] {
  return [item.id, ...(item.recipe?.map(({ itemId }) => itemId) ?? [])]
}

export function usePackPrices(serverId: number, item: Item | null) {
  const { book } = usePriceBook(serverId)
  const prices: PackPriceMap = item
    ? Object.fromEntries(
        itemIdsOf(item).map((id) => [id, getPackPrices(book[id])]),
      )
    : {}

  const setPrice = useCallback(
    (itemId: number, tier: PackTier, packPrice?: number) => {
      if (packPrice === undefined) removeTierPrice(serverId, itemId, tier)
      else writeTierPrice(serverId, itemId, tier, packPrice)
    },
    [serverId],
  )

  const restorePrices = useCallback(
    (restored: PackPriceMap, capturedAt?: number) =>
      restorePackPrices(serverId, restored, capturedAt),
    [serverId],
  )

  return { prices, setPrice, restorePrices }
}
