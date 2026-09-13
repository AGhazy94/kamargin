import { useMemo, useState } from 'react'

import { ScrollPanel } from '@/components/scroll-panel'
import { getCraftableItems, getJobName } from '@/lib/game-data'
import { cn } from '@/lib/utils'
import { usePriceBook, writeTierPrice } from '@/stores/price-book'
import type { Item } from '@/types/game'
import { BlockerPanel } from './components/blocker-panel'
import { EmptyState, NoMatches } from './components/empty-state'
import { FillPricesDialog } from './components/fill-prices-dialog'
import { FilterRow } from './components/filter-row'
import { RecommendationTable } from './components/recommendation-table'
import { useVisibleRows } from './hooks/use-visible-rows'
import {
  useRecommendationFilters,
  useRecommendationSort,
} from './stores/filters'
import type { Recommendation } from './types'
import { topBlockers } from './utils/blockers'
import { countByState, rankRecommendations, visibleRows } from './utils/rank'

/** The one place a hidden row is admitted to: a count you can open, not a silent drop. */
function DeadToggle({
  count,
  showing,
  onToggle,
}: {
  count: number
  showing: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={showing}
      title="Crafts that lose money even with their missing ingredients free"
      className={cn(
        'rounded-md px-1.5 py-0.5 underline decoration-dotted underline-offset-4 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
        showing && 'text-foreground',
      )}
    >
      {count} dead · {showing ? 'back' : 'show'}
    </button>
  )
}

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
  const { sort, toggle } = useRecommendationSort(serverId)
  const [filling, setFilling] = useState<Recommendation | null>(null)

  const inFilter = useMemo(
    () => rankRecommendations(getCraftableItems(), book, filters, sort),
    [book, filters, sort],
  )
  const counts = countByState(inFilter)
  const rows = useMemo(
    () => visibleRows(inFilter, filters),
    [inFilter, filters],
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
        className="max-w-app"
        scrollResetKey={`${filters.jobId}:${filters.minLevel}:${filters.maxLevel}:${filters.hideIncomplete}:${filters.showDead}:${sort.key}:${sort.direction}`}
        header={<FilterRow filters={filters} onChange={update} />}
        footer={
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-sm tabular-nums">
            <span>
              {counts.ranked} ranked · {counts.unpricedSale} unpriced ·{' '}
              {counts.missingInputs} need prices
            </span>
            {counts.dead > 0 && (
              <DeadToggle
                count={counts.dead}
                showing={filters.showDead}
                onToggle={() => update({ showDead: !filters.showDead })}
              />
            )}
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
              counts.dead === inFilter.length
                ? 'Every craft here loses money even with its missing ingredients free. Check a sale price if that looks wrong.'
                : Object.keys(book).length > 0
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
            {counts.ranked > 0 && counts.profitable === 0 && (
              <p className="py-3 text-muted-foreground text-sm">
                Nothing here turns a profit at these prices — the top row is the
                smallest loss.
              </p>
            )}
            <RecommendationTable
              rows={visible}
              sort={sort}
              onSort={toggle}
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
