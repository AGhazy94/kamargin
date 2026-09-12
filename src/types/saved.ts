import type { PackTier } from '@/types/game'

export type WatchlistEntry = {
  itemId: number
  addedAt: number
}

export type SnapshotTier = {
  tier: PackTier
  packPrice?: number
  netProfit?: number
  perUnit?: number
}

/** What a snapshot froze. Shaped here, not in the feature, so the store crosses no layer. */
export type SnapshotFigures = {
  craftCost?: number
  breakEven?: number
  bestTier?: PackTier
  tiers: readonly SnapshotTier[]
}

export type NewSnapshot = Omit<Snapshot, 'id' | 'takenAt'>

export type Snapshot = {
  id: string
  itemId: number
  // Carried, not looked up: a regenerated game bundle must not blank an old record.
  itemName: string
  label: string
  takenAt: number
  prices: Record<number, Partial<Record<PackTier, number>>>
  figures: SnapshotFigures
}
