import type { PriceBook } from '@/stores/price-book'
import type { Item } from '@/types/game'
import { summariseCraft } from '@/utils/craft'
import {
  isSettled,
  isVolatile,
  type PriceHistory,
  volatilityOf,
} from '@/utils/price-history'
import { isThinMargin } from '@/utils/profit'
import type {
  Recommendation,
  RecommendationFilters,
  RecommendationSort,
  RowState,
  SortKey,
} from '../types'

export const LEVEL_RANGE = { min: 1, max: 200 } as const

const EMPTY_HISTORY: PriceHistory = new Map()

export const DEFAULT_FILTERS: RecommendationFilters = {
  jobId: null,
  minLevel: LEVEL_RANGE.min,
  maxLevel: LEVEL_RANGE.max,
  hideIncomplete: false,
  showDead: false,
}

/** Reproduces the ranking the screen is named for: the fattest margin first. */
export const DEFAULT_SORT: RecommendationSort = {
  key: 'margin',
  direction: 'desc',
}

const STATE_ORDER: Record<RowState, number> = {
  ranked: 0,
  'unpriced-sale': 1,
  'missing-inputs': 2,
  dead: 3,
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
  history: PriceHistory,
): Recommendation {
  const { profit, best, optimisticPerUnit, usedItemIds, stale } =
    summariseCraft(item, book, now)

  const swings = usedItemIds.map((id) => volatilityOf(history.get(id)))

  const incomplete =
    profit.missingPriceCount > 0 || profit.craftCost === undefined
  // A bound that loses with its gaps free loses at every real price they could take.
  const dead =
    incomplete && optimisticPerUnit !== undefined && optimisticPerUnit <= 0

  const state: RowState = dead
    ? 'dead'
    : incomplete
      ? 'missing-inputs'
      : best === undefined
        ? 'unpriced-sale'
        : 'ranked'

  return {
    item,
    state,
    optimisticPerUnit,
    craftCost: profit.craftCost,
    breakEven: profit.breakEven,
    bestTier: best?.tier,
    netPerUnit: best?.perUnit,
    margin: best?.margin,
    missingPriceCount: profit.missingPriceCount,
    missing: profit.lines
      .filter((line) => line.unitPrice === undefined)
      .map(({ itemId, quantity }) => ({ itemId, quantity })),
    stale,
    settled: stale && swings.length > 0 && swings.every(isSettled),
    volatile: swings.some(isVolatile),
    thinMargin: isThinMargin(best),
  }
}

function figure(row: Recommendation, key: SortKey): number | undefined {
  if (key === 'margin') return row.margin
  if (key === 'craftCost') return row.craftCost
  if (key === 'netPerUnit') return row.netPerUnit
  return undefined
}

function compare(
  a: Recommendation,
  b: Recommendation,
  sort: RecommendationSort,
): number {
  if (a.state !== b.state) return STATE_ORDER[a.state] - STATE_ORDER[b.state]

  if (sort.key === 'name') {
    const byName = a.item.name.localeCompare(b.item.name)
    return sort.direction === 'asc' ? byName : -byName
  }

  const left = figure(a, sort.key)
  const right = figure(b, sort.key)
  if (left !== undefined && right !== undefined && left !== right)
    return sort.direction === 'asc' ? left - right : right - left
  // A row with no figure to sort on is not worth promoting, whatever the column.
  if (left !== right) return left === undefined ? 1 : -1

  if (a.state === 'missing-inputs') {
    const missing = a.missingPriceCount - b.missingPriceCount
    if (missing !== 0) return missing
  }

  // Among the dead, the near misses first: those are the ones a corrected sale price revives.
  if (a.state === 'dead') {
    const bound = (b.optimisticPerUnit ?? 0) - (a.optimisticPerUnit ?? 0)
    if (bound !== 0) return bound
  }

  return a.item.name.localeCompare(b.item.name)
}

export function rankRecommendations(
  items: readonly Item[],
  book: PriceBook,
  filters: RecommendationFilters,
  sort: RecommendationSort = DEFAULT_SORT,
  now = Date.now(),
  history: PriceHistory = EMPTY_HISTORY,
): Recommendation[] {
  const rows: Recommendation[] = []

  for (const item of items) {
    // Job and level are plain field comparisons: they cut the set before a price is read.
    if (!matchesFilters(item, filters)) continue
    rows.push(toRecommendation(item, book, now, history))
  }

  return rows.sort((a, b) => compare(a, b, sort))
}

/**
 * Visibility is applied after ranking, not during it: the counts and the blocker
 * panel both need the rows a filter is hiding.
 */
export function visibleRows(
  rows: readonly Recommendation[],
  filters: RecommendationFilters,
): Recommendation[] {
  // Dead rows sort last of all, so listing them alongside hundreds of live ones would
  // answer "show me what you pruned" with a screen that looks unchanged.
  if (filters.showDead) return rows.filter((row) => row.state === 'dead')

  return rows.filter(
    (row) =>
      row.state !== 'dead' &&
      !(filters.hideIncomplete && row.state === 'missing-inputs'),
  )
}

export function countByState(rows: readonly Recommendation[]) {
  return {
    ranked: rows.filter((row) => row.state === 'ranked').length,
    unpricedSale: rows.filter((row) => row.state === 'unpriced-sale').length,
    missingInputs: rows.filter((row) => row.state === 'missing-inputs').length,
    dead: rows.filter((row) => row.state === 'dead').length,
    // A screen of losses reads like a screen of wins until something says otherwise.
    profitable: rows.filter((row) => (row.margin ?? 0) > 0).length,
  }
}
