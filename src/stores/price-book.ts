import { useCallback } from 'react'

import {
  readStored,
  useLocalStorage,
  writeStored,
} from '@/hooks/use-local-storage'

export type PriceEntry = {
  serverId: number
  itemId: number
  unitPrice: number
  capturedAt: number
}

export type PriceBook = Record<number, PriceEntry>

export const STALE_AFTER_MS = 24 * 60 * 60 * 1000

const EMPTY_BOOK: PriceBook = {}

function key(serverId: number) {
  return `prices:${serverId}`
}

export function isStale(entry: PriceEntry, now = Date.now()) {
  return now - entry.capturedAt > STALE_AFTER_MS
}

export function readPriceBook(serverId: number): PriceBook {
  return readStored(key(serverId), EMPTY_BOOK)
}

export function writePrice(
  serverId: number,
  itemId: number,
  unitPrice: number,
) {
  writeStored(key(serverId), {
    ...readPriceBook(serverId),
    [itemId]: { serverId, itemId, unitPrice, capturedAt: Date.now() },
  })
}

export function removePrice(serverId: number, itemId: number) {
  const next = { ...readPriceBook(serverId) }
  delete next[itemId]
  writeStored(key(serverId), next)
}

export function usePriceBook(serverId: number) {
  const [book] = useLocalStorage(key(serverId), EMPTY_BOOK)

  const getEntry = useCallback(
    (itemId: number): PriceEntry | undefined => book[itemId],
    [book],
  )

  return { book, getEntry }
}
