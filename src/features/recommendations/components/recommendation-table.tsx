import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Item } from '@/types/game'
import type { Recommendation } from '../types'
import { RecommendationRow } from './recommendation-row'
import { SkeletonRows } from './skeleton-rows'

export function RecommendationTable({
  rows,
  onOpen,
  onFill,
  sentinelRef,
}: {
  rows: readonly Recommendation[]
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
          <TableHead>Item</TableHead>
          <TableHead className="hidden text-right sm:table-cell">
            Craft cost
          </TableHead>
          <TableHead className="hidden text-right md:table-cell">
            Tier
          </TableHead>
          <TableHead className="hidden text-right sm:table-cell">
            Net / unit
          </TableHead>
          <TableHead className="text-right">Margin</TableHead>
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
