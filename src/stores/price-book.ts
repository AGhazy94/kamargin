import { useCallback } from 'react'

import {
  readStored,
  useLocalStorage,
  writeStored,
} from '@/hooks/use-local-storage'
import type { PackTier } from '@/types/game'
import {
  cheapestTier,
  PACK_TIERS,
  type PackPrices,
  pricedTierCount,
} from '@/utils/pack-tiers'

export type TierPrice = {
  packPrice: number
  capturedAt: number
}

export type PriceEntry = {
  serverId: number
  itemId: number
  // Tiers are observed at different moments, so freshness lives here, not on the entry.
  tiers: Partial<Record<PackTier, TierPrice>>
}

export type PriceBook = Record<number, PriceEntry>

/** The v1 shape, read once so nothing already typed is lost. */
export type LegacyPriceEntry = {
  serverId: number
  itemId: number
  unitPrice: number
  capturedAt: number
}

export const STALE_AFTER_MS = 24 * 60 * 60 * 1000

const EMPTY_BOOK: PriceBook = {}
const KEY_PREFIX = 'prices:'

function key(serverId: number) {
  return `${KEY_PREFIX}${serverId}`
}

export function isStale(price: TierPrice, now = Date.now()) {
  return now - price.capturedAt > STALE_AFTER_MS
}

function isLegacy(
  entry: PriceEntry | LegacyPriceEntry,
): entry is LegacyPriceEntry {
  return 'unitPrice' in entry
}

// A v1 per-unit price is exactly a pack-of-1 total, so the conversion loses nothing.
export function migratePriceBook(
  book: Record<number, PriceEntry | LegacyPriceEntry>,
): {
  book: PriceBook
  changed: boolean
} {
  let changed = false
  const migrated: PriceBook = {}

  for (const [id, entry] of Object.entries(book)) {
    if (!isLegacy(entry)) {
      migrated[Number(id)] = entry
      continue
    }

    changed = true
    migrated[Number(id)] = {
      serverId: entry.serverId,
      itemId: entry.itemId,
      tiers: {
        1: { packPrice: entry.unitPrice, capturedAt: entry.capturedAt },
      },
    }
  }

  return { book: migrated, changed }
}

// Runs at import, before the first render, so no reader ever meets a v1 entry.
function migrateStoredBooks() {
  let keys: string[] = []
  try {
    keys = Object.keys(localStorage).filter((name) =>
      name.startsWith(KEY_PREFIX),
    )
  } catch {
    return
  }

  for (const name of keys) {
    const stored = readStored<Record<number, PriceEntry | LegacyPriceEntry>>(
      name,
      EMPTY_BOOK,
    )
    const { book, changed } = migratePriceBook(stored)
    if (changed) writeStored(name, book)
  }
}

migrateStoredBooks()

export function readPriceBook(serverId: number): PriceBook {
  return readStored(key(serverId), EMPTY_BOOK)
}

export function getPackPrices(entry: PriceEntry | undefined): PackPrices {
  if (!entry) return {}

  const prices: PackPrices = {}
  for (const tier of PACK_TIERS) {
    const price = entry.tiers[tier]
    if (price !== undefined) prices[tier] = price.packPrice
  }
  return prices
}

export function getWinningTier(entry: PriceEntry | undefined) {
  return cheapestTier(getPackPrices(entry))
}

export function getPricedTierCount(entry: PriceEntry | undefined): number {
  return pricedTierCount(getPackPrices(entry))
}

export function writeTierPrice(
  serverId: number,
  itemId: number,
  tier: PackTier,
  packPrice: number,
) {
  const book = readPriceBook(serverId)
  const entry = book[itemId] ?? { serverId, itemId, tiers: {} }

  writeStored(key(serverId), {
    ...book,
    [itemId]: {
      ...entry,
      tiers: { ...entry.tiers, [tier]: { packPrice, capturedAt: Date.now() } },
    },
  })
}

export function removeTierPrice(
  serverId: number,
  itemId: number,
  tier: PackTier,
) {
  const book = readPriceBook(serverId)
  const entry = book[itemId]
  if (!entry?.tiers[tier]) return

  const tiers = { ...entry.tiers }
  delete tiers[tier]

  const next = { ...book }
  if (Object.keys(tiers).length === 0) delete next[itemId]
  else next[itemId] = { ...entry, tiers }

  writeStored(key(serverId), next)
}

export function restorePackPrices(
  serverId: number,
  prices: Record<number, PackPrices>,
  capturedAt = Date.now(),
) {
  const book = { ...readPriceBook(serverId) }

  for (const [id, packPrices] of Object.entries(prices)) {
    const itemId = Number(id)
    const tiers: PriceEntry['tiers'] = {}
    for (const tier of PACK_TIERS) {
      const packPrice = packPrices[tier]
      if (packPrice !== undefined) tiers[tier] = { packPrice, capturedAt }
    }
    if (Object.keys(tiers).length === 0) delete book[itemId]
    else book[itemId] = { serverId, itemId, tiers }
  }

  writeStored(key(serverId), book)
}

export function restorePriceEntry(
  serverId: number,
  itemId: number,
  previous: PriceEntry | undefined,
  expected: PriceEntry,
) {
  const book = readPriceBook(serverId)
  const current = book[itemId]
  if (
    previous &&
    (previous.serverId !== serverId || previous.itemId !== itemId)
  )
    return false
  if (
    !current ||
    current.serverId !== serverId ||
    expected.serverId !== serverId ||
    expected.itemId !== itemId
  )
    return false
  if (
    PACK_TIERS.some(
      (tier) =>
        current.tiers[tier]?.packPrice !== expected.tiers[tier]?.packPrice ||
        current.tiers[tier]?.capturedAt !== expected.tiers[tier]?.capturedAt,
    )
  )
    return false
  const next = { ...book }
  if (previous) next[itemId] = previous
  else delete next[itemId]
  writeStored(key(serverId), next)
  return true
}

export function usePriceBook(serverId: number) {
  const [book] = useLocalStorage(key(serverId), EMPTY_BOOK)

  const getEntry = useCallback(
    (itemId: number): PriceEntry | undefined => book[itemId],
    [book],
  )

  return { book, getEntry }
}
