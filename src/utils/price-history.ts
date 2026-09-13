import { getPackPrices, type PriceBook } from '@/stores/price-book'
import type { Snapshot } from '@/types/saved'
import { cheapestTier } from '@/utils/pack-tiers'

export type PriceObservation = {
  at: number
  unitPrice: number
}

export type Volatility = {
  /** Relative spread across every observation: (max − min) / median. */
  swing: number
  observations: number
  lastSeenAt: number
}

export type PriceHistory = ReadonlyMap<number, readonly PriceObservation[]>

// Under this an old price is still worth trusting; over VOLATILE_SWING a fresh one is not.
export const SETTLED_SWING = 0.05
export const VOLATILE_SWING = 0.25

const DAY_MS = 24 * 60 * 60 * 1000

function push(
  history: Map<number, PriceObservation[]>,
  itemId: number,
  observation: PriceObservation,
) {
  const observations = history.get(itemId) ?? []
  // Restoring a snapshot rewrites the book at the snapshot's own instant, so the same
  // moment can arrive twice for one item.
  if (observations.some((seen) => seen.at === observation.at)) return
  observations.push(observation)
  history.set(itemId, observations)
}

/** Every price the app has ever recorded for an item, per unit so the tiers compare. */
export function buildPriceHistory(
  snapshots: readonly Snapshot[],
  book: PriceBook,
): PriceHistory {
  const history = new Map<number, PriceObservation[]>()

  for (const snapshot of snapshots) {
    for (const [id, prices] of Object.entries(snapshot.prices)) {
      const cheapest = cheapestTier(prices)
      if (!cheapest) continue
      push(history, Number(id), {
        at: snapshot.takenAt,
        unitPrice: cheapest.unitPrice,
      })
    }
  }

  for (const entry of Object.values(book)) {
    const prices = getPackPrices(entry)
    const cheapest = cheapestTier(prices)
    const captured = entry.tiers[cheapest?.tier ?? 1]?.capturedAt
    if (!cheapest || captured === undefined) continue
    push(history, entry.itemId, {
      at: captured,
      unitPrice: cheapest.unitPrice,
    })
  }

  for (const observations of history.values()) {
    observations.sort((a, b) => a.at - b.at)
  }

  return history
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

/** How far a price has ranged. Undefined below two observations: one sighting is not a history. */
export function volatilityOf(
  observations: readonly PriceObservation[] | undefined,
): Volatility | undefined {
  if (!observations || observations.length < 2) return undefined

  const prices = observations.map((observation) => observation.unitPrice)
  const centre = median(prices)
  if (centre === 0) return undefined

  return {
    swing: (Math.max(...prices) - Math.min(...prices)) / centre,
    observations: observations.length,
    // Taken rather than read off the end: nothing here should depend on the caller's ordering.
    lastSeenAt: Math.max(...observations.map((observation) => observation.at)),
  }
}

export function isSettled(volatility: Volatility | undefined): boolean {
  return volatility !== undefined && volatility.swing < SETTLED_SWING
}

export function isVolatile(volatility: Volatility | undefined): boolean {
  return volatility !== undefined && volatility.swing >= VOLATILE_SWING
}

export type RefreshCandidate = Volatility & { itemId: number }

/**
 * What a swinging price costs you grows with how long ago you saw it, so the two
 * multiply: a big old swing outranks both a steady old price and a volatile fresh one.
 */
export function refreshQueue(
  history: PriceHistory,
  now = Date.now(),
  limit = 5,
): RefreshCandidate[] {
  const candidates: { candidate: RefreshCandidate; priority: number }[] = []

  for (const [itemId, observations] of history) {
    const volatility = volatilityOf(observations)
    if (volatility === undefined || !isVolatile(volatility)) continue

    const ageInDays = Math.max(0, now - volatility.lastSeenAt) / DAY_MS
    candidates.push({
      candidate: { ...volatility, itemId },
      priority: volatility.swing * ageInDays,
    })
  }

  return candidates
    .sort(
      (a, b) =>
        b.priority - a.priority || a.candidate.itemId - b.candidate.itemId,
    )
    .slice(0, limit)
    .map((entry) => entry.candidate)
}
