import { TableCell, TableRow } from '@/components/ui/table'
import { getItem } from '@/lib/game-data'
import { isStale, type PriceEntry } from '@/stores/price-book'
import type { Ingredient } from '@/types/game'
import { formatAge, formatKamas } from '@/utils/format'
import { PriceInput } from './price-input'

export function IngredientPriceRow({
  ingredient,
  unitPrice,
  entry,
  lineCost,
  onPriceChange,
}: {
  ingredient: Ingredient
  unitPrice?: number
  entry?: PriceEntry
  lineCost?: number
  onPriceChange: (unitPrice: number | undefined) => void
}) {
  const item = getItem(ingredient.itemId)
  const name = item?.name ?? `Item ${ingredient.itemId}`
  const priced = unitPrice !== undefined
  const stale = entry !== undefined && isStale(entry)

  return (
    <TableRow data-unpriced={!priced}>
      <TableCell>
        <div className="flex items-center gap-2">
          {!priced && (
            <span
              aria-hidden
              className="size-1.5 shrink-0 rounded-full bg-muted-foreground/60"
            />
          )}
          {item && (
            <img src={item.iconUrl} alt="" className="size-6 shrink-0" />
          )}
          <span className="truncate">{name}</span>
        </div>
      </TableCell>
      <TableCell className="text-right text-muted-foreground tabular-nums">
        {ingredient.quantity}
      </TableCell>
      <TableCell className="w-40">
        <PriceInput
          label={`${name} — unit price`}
          value={unitPrice}
          onChange={onPriceChange}
        />
        {entry && (
          <p className="mt-1 flex items-center justify-end gap-1 text-muted-foreground text-xs">
            {stale && (
              <span
                aria-hidden
                className="size-1.5 rounded-full bg-muted-foreground/60"
              />
            )}
            {formatAge(entry.capturedAt)}
          </p>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {lineCost === undefined ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          formatKamas(lineCost)
        )}
      </TableCell>
    </TableRow>
  )
}
