import { useCallback } from 'react'

import { useLocalStorage } from '@/hooks/use-local-storage'
import type {
  RecommendationFilters,
  RecommendationSort,
  SortKey,
} from '../types'
import { DEFAULT_FILTERS, DEFAULT_SORT } from '../utils/rank'

export function useRecommendationFilters(serverId: number) {
  const [filters, setFilters] = useLocalStorage(
    `recommendation-filters:${serverId}`,
    DEFAULT_FILTERS,
  )

  const update = useCallback(
    (patch: Partial<RecommendationFilters>) =>
      setFilters((current) => ({ ...current, ...patch })),
    [setFilters],
  )

  const reset = useCallback(() => setFilters(DEFAULT_FILTERS), [setFilters])

  return { filters, update, reset }
}

export function useRecommendationSort(serverId: number) {
  const [sort, setSort] = useLocalStorage(
    `recommendation-sort:${serverId}`,
    DEFAULT_SORT,
  )

  // A fresh column opens on its most useful end: biggest figure first, names from A.
  const toggle = useCallback(
    (key: SortKey) =>
      setSort(
        (current): RecommendationSort =>
          current.key === key
            ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
            : { key, direction: key === 'name' ? 'asc' : 'desc' },
      ),
    [setSort],
  )

  return { sort, toggle }
}
