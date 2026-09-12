import { XIcon } from 'lucide-react'

import { ItemIcon } from '@/components/item-icon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getItem } from '@/lib/game-data'
import { cn } from '@/lib/utils'
import type { PriceBook } from '@/stores/price-book'
import type { Item } from '@/types/game'
import type { WatchlistEntry } from '@/types/saved'
import { summariseCraft } from '@/utils/craft'
import { formatAge, formatKamas, formatMargin } from '@/utils/format'

function Figures({ item, book }: { item: Item; book: PriceBook }) {
  if (!item.recipe) return null

  const { profit, best, stale } = summariseCraft(item, book)
  const margin = best?.margin

  return (
    <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
      <span
        className={cn(
          'font-medium tabular-nums',
          margin === undefined && 'text-muted-foreground text-sm',
          margin !== undefined && margin > 0 && 'text-gain',
          margin !== undefined && margin < 0 && 'text-loss',
        )}
      >
        {margin === undefined
          ? profit.missingPriceCount > 0
            ? `${profit.missingPriceCount} to price`
            : 'No sale price'
          : `${margin > 0 ? '+' : ''}${formatMargin(margin)}`}
      </span>
      <span className="flex items-center gap-1.5 text-muted-foreground text-xs tabular-nums">
        {stale && <Badge variant="outline">stale</Badge>}
        {profit.craftCost === undefined
          ? '—'
          : `craft ${formatKamas(profit.craftCost)}`}
      </span>
    </span>
  )
}

export function Watchlist({
  entries,
  book,
  onSelect,
  onRemove,
}: {
  entries: readonly WatchlistEntry[]
  book: PriceBook
  onSelect: (item: Item) => void
  onRemove: (itemId: number) => void
}) {
  if (entries.length === 0) {
    return <p className="text-muted-foreground text-xs">No watched items.</p>
  }

  return (
    <ul className="flex flex-col">
      {entries.map(({ itemId, addedAt }) => {
        const item = getItem(itemId)

        return (
          <li key={itemId} className="flex items-center gap-3 border-b py-3">
            {item ? (
              <button
                type="button"
                onClick={() => onSelect(item)}
                className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ItemIcon item={item} className="size-10" />
                <span className="min-w-0 flex-1">
                  <span className="wrap-anywhere block font-medium">
                    {item.name}
                  </span>
                  <span className="mt-1 block text-muted-foreground text-xs">
                    {item.type} · level {item.level}
                    <span className="hidden sm:inline">
                      {' '}
                      · added {formatAge(addedAt)}
                    </span>
                  </span>
                </span>
                <Figures item={item} book={book} />
              </button>
            ) : (
              // A regenerated game bundle must not strand a saved list.
              <span className="flex-1 py-1.5 text-muted-foreground">
                Item {itemId}
              </span>
            )}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    aria-label={`Remove ${item?.name ?? itemId} from watchlist`}
                    onClick={() => onRemove(itemId)}
                    className="text-muted-foreground hover:text-destructive"
                  />
                }
              >
                <XIcon className="size-4" />
              </TooltipTrigger>
              <TooltipContent>Remove from watchlist</TooltipContent>
            </Tooltip>
          </li>
        )
      })}
    </ul>
  )
}
