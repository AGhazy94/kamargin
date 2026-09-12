import { useMemo, useState } from 'react'

import { ScrollPanel } from '@/components/scroll-panel'
import { getCraftableItems, getJobName } from '@/lib/game-data'
import { usePriceBook, writeTierPrice } from '@/stores/price-book'
import type { Item } from '@/types/game'
import { BlockerPanel } from './components/blocker-panel'
import { EmptyState, NoMatches } from './components/empty-state'
import { FillPricesDialog } from './components/fill-prices-dialog'
import { FilterRow } from './components/filter-row'
import { RecommendationTable } from './components/recommendation-table'
import { useVisibleRows } from './hooks/use-visible-rows'
import { useRecommendationFilters } from './stores/filters'
import type { Recommendation } from './types'
import { topBlockers } from './utils/blockers'
import { countByState, matchesFilters, rankRecommendations } from './utils/rank'

function describeFilters(jobId: number | null, min: number, max: number) {
  const job = jobId === null ? 'recipes' : `${getJobName(jobId)} recipes`
  return `No ${job} between level ${min} and ${max}.`
}

export function Recommendations({
  serverId,
  onOpenItem,
  calculatorHref,
}: {
  serverId: number
  onOpenItem: (item: Item) => void
  calculatorHref: string
}) {
  const { book } = usePriceBook(serverId)
  const { filters, update, reset } = useRecommendationFilters(serverId)
  const [filling, setFilling] = useState<Recommendation | null>(null)

  const rows = useMemo(
    () => rankRecommendations(getCraftableItems(), book, filters),
    [book, filters],
  )
  const counts = countByState(rows)
  const inFilter = useMemo(
    () => getCraftableItems().filter((item) => matchesFilters(item, filters)),
    [filters],
  )
  const { visible, hasMore, sentinelRef } = useVisibleRows(rows)
  const blockers = useMemo(
    () => (counts.ranked === 0 ? topBlockers(inFilter, book) : []),
    [counts.ranked, inFilter, book],
  )

  const blockerPanel = (
    <BlockerPanel
      // A new filter is a new backlog: the queue and its saved rows start over.
      key={`${filters.jobId}:${filters.minLevel}:${filters.maxLevel}`}
      blockers={blockers}
      onOpen={onOpenItem}
      onPrice={(itemId, packPrice) =>
        writeTierPrice(serverId, itemId, 1, packPrice)
      }
    />
  )

  return (
    <>
      <ScrollPanel
        className="max-w-5xl"
        header={<FilterRow filters={filters} onChange={update} />}
        footer={
          <p className="text-muted-foreground text-sm tabular-nums">
            {counts.ranked} ranked · {counts.unpricedSale} unpriced ·{' '}
            {counts.missingInputs} need prices
          </p>
        }
      >
        {inFilter.length === 0 ? (
          <NoMatches
            description={describeFilters(
              filters.jobId,
              filters.minLevel,
              filters.maxLevel,
            )}
            onReset={reset}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            description={
              Object.keys(book).length > 0
                ? 'Nothing ranks yet — every craft here is still missing an ingredient price.'
                : 'Price a few resources and your crafts will rank here.'
            }
            blockerPanel={blockerPanel}
            calculatorHref={calculatorHref}
            onReset={reset}
          />
        ) : (
          <>
            {/* The backlog stays visible: the panel says which of it to clear first. */}
            {counts.ranked === 0 && <div className="py-4">{blockerPanel}</div>}
            <RecommendationTable
              rows={visible}
              onOpen={onOpenItem}
              onFill={setFilling}
              sentinelRef={hasMore ? sentinelRef : undefined}
            />
          </>
        )}
      </ScrollPanel>

      <FillPricesDialog
        row={filling}
        onClose={() => setFilling(null)}
        onSave={(prices) => {
          for (const [itemId, packPrice] of Object.entries(prices)) {
            writeTierPrice(serverId, Number(itemId), 1, packPrice)
          }
        }}
      />
    </>
  )
}
