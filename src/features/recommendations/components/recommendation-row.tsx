import { ItemIcon } from '@/components/item-icon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { getJobName } from '@/lib/game-data'
import { cn } from '@/lib/utils'
import type { Item } from '@/types/game'
import { formatKamas, formatMargin, formatTier } from '@/utils/format'
import type { Recommendation } from '../types'

function Blank() {
  return <span className="text-muted-foreground">—</span>
}

function signed(value: number | undefined) {
  return cn(
    'tabular-nums',
    value !== undefined && value > 0 && 'text-gain',
    value !== undefined && value < 0 && 'text-loss',
  )
}

export function RecommendationRow({
  row,
  onOpen,
  onFill,
}: {
  row: Recommendation
  onOpen: (item: Item) => void
  onFill: (row: Recommendation) => void
}) {
  const { item, state, craftCost, margin, netPerUnit } = row
  // The figures grey out; the name and the action stay an invitation to fill the row in.
  const dim = (state === 'missing-inputs' || state === 'dead') && 'opacity-60'
  const caption = [
    `Lv ${item.craftLevel}`,
    getJobName(item.job),
    craftCost !== undefined && `craft ${formatKamas(craftCost)}`,
  ].filter(Boolean)

  return (
    <TableRow>
      <TableCell className="w-full min-w-36">
        <button
          type="button"
          onClick={() => onOpen(item)}
          className="flex min-h-11 w-full items-center gap-3 rounded-md text-left outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ItemIcon item={item} className="size-8" />
          <span className="min-w-0">
            <span className="wrap-anywhere block whitespace-normal">
              {item.name}
            </span>
            <span className="block whitespace-normal text-muted-foreground text-xs">
              {caption.slice(0, 2).join(' · ')}
              <span className="sm:hidden">
                {caption.length > 2 && ` · ${caption[2]}`}
              </span>
            </span>
          </span>
        </button>
      </TableCell>

      <TableCell
        className={cn('hidden text-right tabular-nums sm:table-cell', dim)}
      >
        {craftCost === undefined ? (
          <Blank />
        ) : (
          <span className="text-kama">{formatKamas(craftCost)}</span>
        )}
      </TableCell>

      <TableCell className={cn('hidden text-right sm:table-cell', dim)}>
        {netPerUnit === undefined ? (
          <Blank />
        ) : (
          <>
            <span className={signed(netPerUnit)}>
              {formatKamas(netPerUnit)}
            </span>
            {row.bestTier !== undefined && (
              <span className="block text-muted-foreground text-xs tabular-nums">
                {formatTier(row.bestTier)}
              </span>
            )}
          </>
        )}
      </TableCell>

      <TableCell
        className={cn(
          'whitespace-nowrap text-right font-medium text-base sm:text-lg',
          signed(margin),
          dim,
        )}
      >
        {margin === undefined ? (
          state === 'dead' && row.optimisticPerUnit !== undefined ? (
            <span className="text-muted-foreground text-sm">
              <span className="hidden sm:inline">best case </span>
              {formatKamas(row.optimisticPerUnit)}
            </span>
          ) : state === 'unpriced-sale' && row.breakEven !== undefined ? (
            <span className="text-muted-foreground text-sm">
              <span className="hidden sm:inline">break-even </span>≥{' '}
              {formatKamas(row.breakEven)}
            </span>
          ) : (
            <Blank />
          )
        ) : (
          `${margin > 0 ? '+' : ''}${formatMargin(margin)}`
        )}
      </TableCell>

      <TableCell className="whitespace-normal text-right">
        <span className="flex flex-wrap items-center justify-end gap-1.5">
          {row.stale && <Badge variant="outline">stale</Badge>}
          {row.thinMargin && <Badge variant="secondary">thin</Badge>}
          {/* No fill button: a wrong verdict is corrected on the sale price, not the inputs. */}
          {state === 'dead' && <Badge variant="outline">dead</Badge>}
          {state === 'missing-inputs' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFill(row)}
              aria-label={`Price the ${row.missingPriceCount} missing inputs of ${item.name}`}
            >
              {row.missingPriceCount}
              <span className="hidden sm:inline">missing</span>
            </Button>
          )}
        </span>
      </TableCell>
    </TableRow>
  )
}
