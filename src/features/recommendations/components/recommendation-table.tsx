import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react'

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { Item } from '@/types/game'
import type { Recommendation, RecommendationSort, SortKey } from '../types'
import { RecommendationRow } from './recommendation-row'
import { SkeletonRows } from './skeleton-rows'

function SortableHead({
  sortKey,
  label,
  sort,
  onSort,
  className,
}: {
  sortKey: SortKey
  label: string
  sort: RecommendationSort
  onSort: (key: SortKey) => void
  className?: string
}) {
  const active = sort.key === sortKey
  const Arrow = sort.direction === 'asc' ? ArrowUpIcon : ArrowDownIcon

  return (
    <TableHead
      className={className}
      aria-sort={
        active
          ? sort.direction === 'asc'
            ? 'ascending'
            : 'descending'
          : 'none'
      }
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'group flex min-h-11 w-full items-center gap-1 rounded-md outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
          className?.includes('text-right') && 'justify-end',
          active && 'text-foreground',
        )}
      >
        {label}
        {/* An idle column still shows where its arrow would land, so it reads as sortable. */}
        <Arrow
          className={cn(
            'size-3 shrink-0',
            !active &&
              'opacity-0 group-hover:opacity-40 group-focus-visible:opacity-40',
          )}
        />
      </button>
    </TableHead>
  )
}

export function RecommendationTable({
  rows,
  sort,
  onSort,
  onOpen,
  onFill,
  sentinelRef,
}: {
  rows: readonly Recommendation[]
  sort: RecommendationSort
  onSort: (key: SortKey) => void
  onOpen: (item: Item) => void
  onFill: (row: Recommendation) => void
  /** Marks the end of the rendered page: reaching it loads the next one. */
  sentinelRef?: (node: HTMLElement | null) => void
}) {
  return (
    // The wrapper's own overflow would trap the sticky header; columns fold instead.
    <Table containerClassName="overflow-visible">
      <TableHeader className="sticky top-0 z-10 bg-card">
        <TableRow>
          <SortableHead
            sortKey="name"
            label="Item"
            sort={sort}
            onSort={onSort}
          />
          <SortableHead
            sortKey="craftCost"
            label="Craft cost"
            sort={sort}
            onSort={onSort}
            className="hidden text-right sm:table-cell"
          />
          <SortableHead
            sortKey="netPerUnit"
            label="Net / unit"
            sort={sort}
            onSort={onSort}
            className="hidden text-right sm:table-cell"
          />
          <SortableHead
            sortKey="margin"
            label="Margin"
            sort={sort}
            onSort={onSort}
            className="text-right"
          />
          <TableHead className="sr-only">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <RecommendationRow
            key={row.item.id}
            row={row}
            onOpen={onOpen}
            onFill={onFill}
          />
        ))}
        {sentinelRef && <SkeletonRows sentinelRef={sentinelRef} />}
      </TableBody>
    </Table>
  )
}
