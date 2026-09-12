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
import type { PackPriceMap } from '../hooks/use-pack-prices'
import type { CraftProfit } from '../types'
import { IngredientPriceRow } from './ingredient-price-row'

export function RecipeTable({
  profit,
  prices,
  book,
  onPriceChange,
}: {
  profit: CraftProfit
  prices: PackPriceMap
  book: PriceBook
  onPriceChange: (itemId: number, tier: PackTier, packPrice?: number) => void
}) {
  // One row open at a time: two sub-rows push the craft cost off-screen.
  const [openItemId, setOpenItemId] = useState<number | null>(null)

  return (
    // Sticky head resolves against the panel, not a scroll container of the table's own.
    <Table containerClassName="overflow-visible">
      <TableHeader className="sticky top-0 z-10 bg-card">
        <TableRow>
          <TableHead>Ingredient</TableHead>
          <TableHead className="hidden text-right sm:table-cell">Qty</TableHead>
          <TableHead className="w-32 text-right sm:w-44">
            Unit price{' '}
            <span className="font-normal text-muted-foreground">per pack</span>
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
            expanded={openItemId === line.itemId}
            onToggle={() =>
              setOpenItemId((current) =>
                current === line.itemId ? null : line.itemId,
              )
            }
            onPriceChange={(tier, packPrice) =>
              onPriceChange(line.itemId, tier, packPrice)
            }
          />
        ))}
      </TableBody>
    </Table>
  )
}
