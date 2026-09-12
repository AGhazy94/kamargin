import { useState } from 'react'

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { PriceBook } from '@/stores/price-book'
import type { PackTier } from '@/types/game'
import type { CraftProfit } from '@/types/profit'
import type { PackPriceMap } from '../hooks/use-pack-prices'
import { IngredientPriceRow } from './ingredient-price-row'

export function RecipeTable({
  profit,
  prices,
  book,
  onPriceChange,
  onDropScreenshots,
}: {
  profit: CraftProfit
  prices: PackPriceMap
  book: PriceBook
  onPriceChange: (itemId: number, tier: PackTier, packPrice?: number) => void
  onDropScreenshots?: (itemId: number, files: File[]) => void
}) {
  const [openItemIds, setOpenItemIds] = useState<Set<number>>(() => new Set())

  return (
    // Sticky head resolves against the panel, not a scroll container of the table's own.
    <Table containerClassName="overflow-visible">
      <TableHeader className="sticky top-0 z-10 bg-card">
        <TableRow>
          <TableHead>Ingredient</TableHead>
          <TableHead className="hidden text-right sm:table-cell">Qty</TableHead>
          <TableHead className="w-40 min-w-40 text-right sm:w-44 sm:min-w-44">
            Pack price
          </TableHead>
          <TableHead className="hidden text-right sm:table-cell">
            Cost
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {profit.lines.map((line) => (
          <IngredientPriceRow
            key={line.itemId}
            line={line}
            packPrices={prices[line.itemId] ?? {}}
            entry={book[line.itemId]}
            expanded={openItemIds.has(line.itemId)}
            onToggle={() =>
              setOpenItemIds((current) => {
                const next = new Set(current)
                if (next.has(line.itemId)) next.delete(line.itemId)
                else next.add(line.itemId)
                return next
              })
            }
            onPriceChange={(tier, packPrice) =>
              onPriceChange(line.itemId, tier, packPrice)
            }
            onDropScreenshots={
              onDropScreenshots &&
              ((files) => onDropScreenshots(line.itemId, files))
            }
          />
        ))}
      </TableBody>
    </Table>
  )
}
