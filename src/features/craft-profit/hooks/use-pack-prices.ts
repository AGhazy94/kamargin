import { useCallback, useEffect, useState } from 'react'

import {
  getPackPrices,
  readPriceBook,
  removeTierPrice,
  writeTierPrice,
} from '@/stores/price-book'
import type { Item, PackTier } from '@/types/game'
import { PACK_TIERS, type PackPrices } from '@/utils/pack-tiers'

const PERSIST_DELAY_MS = 400

export type PackPriceMap = Record<number, PackPrices>

function itemIdsOf(item: Item): number[] {
  return [item.id, ...(item.recipe?.map(({ itemId }) => itemId) ?? [])]
}

export function usePackPrices(serverId: number, item: Item | null) {
  const [prices, setPrices] = useState<PackPriceMap>({})

  useEffect(() => {
    if (!item) {
      setPrices({})
      return
    }

    const book = readPriceBook(serverId)
    setPrices(
      Object.fromEntries(
        itemIdsOf(item).map((id) => [id, getPackPrices(book[id])]),
      ),
    )
  }, [item, serverId])

  useEffect(() => {
    const timer = setTimeout(() => {
      const stored = readPriceBook(serverId)

      for (const [id, packPrices] of Object.entries(prices)) {
        const itemId = Number(id)
        const storedTiers = stored[itemId]?.tiers ?? {}

        for (const tier of PACK_TIERS) {
          const packPrice = packPrices[tier]
          if (packPrice === undefined) {
            if (storedTiers[tier]) removeTierPrice(serverId, itemId, tier)
          } else if (storedTiers[tier]?.packPrice !== packPrice) {
            writeTierPrice(serverId, itemId, tier, packPrice)
          }
        }
      }
    }, PERSIST_DELAY_MS)

    return () => clearTimeout(timer)
  }, [prices, serverId])

  const setPrice = useCallback(
    (itemId: number, tier: PackTier, packPrice?: number) =>
      setPrices((current) => {
        const next = { ...(current[itemId] ?? {}) }
        if (packPrice === undefined) delete next[tier]
        else next[tier] = packPrice
        return { ...current, [itemId]: next }
      }),
    [],
  )

  // Restoring a snapshot writes through to the book, so it survives the next item switch.
  const restorePrices = useCallback(
    (restored: PackPriceMap) => {
      for (const [id, packPrices] of Object.entries(restored)) {
        for (const tier of PACK_TIERS) {
          const packPrice = packPrices[tier]
          if (packPrice !== undefined) {
            writeTierPrice(serverId, Number(id), tier, packPrice)
          }
        }
      }
      setPrices((current) => ({ ...current, ...restored }))
    },
    [serverId],
  )

  return { prices, setPrice, restorePrices }
}
