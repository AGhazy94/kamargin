import { ChevronRightIcon } from 'lucide-react'

import { TableCell, TableRow } from '@/components/ui/table'
import { getItem } from '@/lib/game-data'
import { cn } from '@/lib/utils'
import { isStale, type PriceEntry } from '@/stores/price-book'
import type { PackTier } from '@/types/game'
import { formatAge, formatKamas, formatTier } from '@/utils/format'
import type { PackPrices } from '@/utils/pack-tiers'
import type { ProfitLine } from '../types'
import { PriceInput } from './price-input'
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

  // With nothing recorded yet, a pack of one is what you are most likely looking at.
  const editTier = line.winningTier ?? 1
  const editPrice = entry?.tiers[editTier]

  return (
    <>
      <TableRow data-unpriced={!priced}>
        <TableCell className="w-full max-w-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={expanded}
              aria-label={`Pack prices for ${name}`}
              className={cn(
                'shrink-0 rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                // Colour alone carries "more than one tier here" — quiet enough for eight rows.
                multiTier ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <ChevronRightIcon
                className={cn(
                  'size-4 transition-transform',
                  expanded && 'rotate-90',
                )}
              />
            </button>
            {!priced && (
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full bg-muted-foreground/60"
              />
            )}
            {item && (
              <img
                src={item.iconUrl}
                alt=""
                className="hidden size-7 shrink-0 sm:block"
              />
            )}
            <div className="min-w-0">
              <p className="truncate">{name}</p>
              <p className="text-muted-foreground text-xs tabular-nums sm:hidden">
                ×{line.quantity}
                {line.lineCost !== undefined &&
                  ` · ${formatKamas(line.lineCost)}`}
              </p>
            </div>
          </div>
        </TableCell>
        <TableCell className="hidden text-right text-muted-foreground tabular-nums sm:table-cell">
          {line.quantity}
        </TableCell>
        <TableCell className="w-32 sm:w-44">
          <PriceInput
            label={`${name} — pack of ${editTier}`}
            value={packPrices[editTier]}
            onChange={(packPrice) => onPriceChange(editTier, packPrice)}
            reference={
              packPrices[editTier] === undefined ? null : formatTier(editTier)
            }
          />
          {editPrice && (
            <p className="mt-1 flex items-center justify-end gap-1 text-muted-foreground text-xs">
              {isStale(editPrice) && (
                <span
                  aria-hidden
                  className="size-1.5 rounded-full bg-muted-foreground/60"
                />
              )}
              {formatAge(editPrice.capturedAt)}
            </p>
          )}
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
          <TableCell colSpan={4} className="whitespace-normal bg-muted/30">
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
