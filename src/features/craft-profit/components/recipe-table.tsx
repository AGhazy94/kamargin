import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { PriceBook } from '@/stores/price-book'
import { formatKamas } from '@/utils/format'
import type { CraftProfit } from '../types'
import { IngredientPriceRow } from './ingredient-price-row'

export function RecipeTable({
  profit,
  book,
  onPriceChange,
}: {
  profit: CraftProfit
  book: PriceBook
  onPriceChange: (itemId: number, unitPrice: number | undefined) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ingredient</TableHead>
          <TableHead className="text-right">Qty</TableHead>
          <TableHead className="w-40">
            Unit price{' '}
            <span className="font-normal text-muted-foreground">per unit</span>
          </TableHead>
          <TableHead className="text-right">Cost</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {profit.lines.map((line) => (
          <IngredientPriceRow
            key={line.itemId}
            ingredient={line}
            unitPrice={line.unitPrice}
            entry={book[line.itemId]}
            lineCost={line.lineCost}
            onPriceChange={(unitPrice) => onPriceChange(line.itemId, unitPrice)}
          />
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>Craft cost</TableCell>
          <TableCell className="text-right font-medium tabular-nums">
            {profit.craftCost === undefined ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              formatKamas(profit.craftCost)
            )}
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  )
}
