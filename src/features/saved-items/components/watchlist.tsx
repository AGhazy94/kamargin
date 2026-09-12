import { XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { getItem } from '@/lib/game-data'
import type { Item } from '@/types/game'
import type { WatchlistEntry } from '@/types/saved'

export function Watchlist({
  entries,
  onSelect,
  onRemove,
}: {
  entries: readonly WatchlistEntry[]
  onSelect: (item: Item) => void
  onRemove: (itemId: number) => void
}) {
  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">
        Star an item to keep it here.
      </p>
    )
  }

  return (
    <ul className="flex flex-col">
      {entries.map(({ itemId }) => {
        const item = getItem(itemId)

        return (
          <li key={itemId} className="group flex items-center gap-2">
            {item ? (
              <button
                type="button"
                onClick={() => onSelect(item)}
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md py-1.5 text-left outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <img src={item.iconUrl} alt="" className="size-6 shrink-0" />
                <span className="truncate">{item.name}</span>
              </button>
            ) : (
              // A regenerated game bundle must not strand a saved list.
              <span className="flex-1 py-1.5 text-muted-foreground">
                Item {itemId}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${item?.name ?? itemId} from watchlist`}
              onClick={() => onRemove(itemId)}
              className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
            >
              <XIcon className="size-3.5" />
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
