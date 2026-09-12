import { ChevronRightIcon } from 'lucide-react'
import { useId } from 'react'
import { ItemIcon } from '@/components/item-icon'
import { PriceInput } from '@/components/price-input'
import { TableCell, TableRow } from '@/components/ui/table'
import { getItem } from '@/lib/game-data'
import { cn } from '@/lib/utils'
import { isStale, type PriceEntry } from '@/stores/price-book'
import type { PackTier } from '@/types/game'
import type { ProfitLine } from '@/types/profit'
import { formatAge, formatKamas, formatTier } from '@/utils/format'
import type { PackPrices } from '@/utils/pack-tiers'
import { TierPriceRows } from './tier-price-rows'

export function IngredientPriceRow({
  line,
  packPrices,
  entry,
  expanded,
  onToggle,
  onPriceChange,
}: {
  line: ProfitLine
  packPrices: PackPrices
  entry?: PriceEntry
  expanded: boolean
  onToggle: () => void
  onPriceChange: (tier: PackTier, packPrice?: number) => void
}) {
  const item = getItem(line.itemId)
  const name = item?.name ?? `Item ${line.itemId}`
  const priced = line.unitPrice !== undefined
  const multiTier = (line.pricedTierCount ?? 0) > 1
  const panelId = useId()

  // With nothing recorded yet, a pack of one is what you are most likely looking at.
  const editTier = line.winningTier ?? 1
  const editPrice = entry?.tiers[editTier]

  return (
    <>
      <TableRow data-unpriced={!priced}>
        <TableCell className="w-full max-w-0">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={panelId}
            aria-label={`Pack prices for ${name}`}
            className="flex min-h-11 w-full items-center gap-3 rounded-md text-left outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ChevronRightIcon
              className={cn(
                'size-4 shrink-0 transition-transform',
                expanded && 'rotate-90',
                multiTier ? 'text-primary' : 'text-muted-foreground',
              )}
            />
            {!priced && (
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full bg-muted-foreground/60"
              />
            )}
            {item && (
              <span className="hidden shrink-0 sm:block">
                <ItemIcon item={item} className="size-7" />
              </span>
            )}
            <span className="min-w-0">
              <span className="wrap-anywhere block whitespace-normal">
                {name}
              </span>
              <span className="block text-muted-foreground text-xs tabular-nums sm:hidden">
                ×{line.quantity}
                {line.lineCost !== undefined &&
                  ` · ${formatKamas(line.lineCost)}`}
              </span>
            </span>
          </button>
        </TableCell>
        <TableCell className="hidden text-right text-muted-foreground tabular-nums sm:table-cell">
          {line.quantity}
        </TableCell>
        <TableCell className="w-40 min-w-40 sm:w-44 sm:min-w-44">
          <PriceInput
            label={`${name} — pack of ${editTier}`}
            value={packPrices[editTier]}
            onChange={(packPrice) => onPriceChange(editTier, packPrice)}
          />
          <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-muted-foreground text-xs">
            <span>{formatTier(editTier)}</span>
            {editPrice && (
              <span className="flex items-center gap-1">
                {isStale(editPrice) && (
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full bg-muted-foreground/60"
                  />
                )}
                {formatAge(editPrice.capturedAt)}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="hidden text-right tabular-nums sm:table-cell">
          {line.lineCost === undefined ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            formatKamas(line.lineCost)
          )}
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow className="hover:bg-transparent">
          <TableCell
            id={panelId}
            colSpan={4}
            className="whitespace-normal bg-muted/30"
          >
            <TierPriceRows
              name={name}
              packPrices={packPrices}
              entry={entry}
              onPriceChange={onPriceChange}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
