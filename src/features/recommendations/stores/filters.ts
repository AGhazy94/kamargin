import { useCallback } from 'react'

import { useLocalStorage } from '@/hooks/use-local-storage'
import type { RecommendationFilters } from '../types'
import { DEFAULT_FILTERS } from '../utils/rank'

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
