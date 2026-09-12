import { StarIcon, XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Item } from '@/types/game'

export function ItemSummary({
  item,
  watched,
  onToggleWatch,
  onClear,
}: {
  item: Item
  watched: boolean
  onToggleWatch: () => void
  onClear: () => void
}) {
  return (
    <div className="flex items-center gap-4">
      <img src={item.iconUrl} alt="" className="size-11 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-heading font-semibold text-lg">
          {item.name}
        </p>
        <p className="text-muted-foreground text-xs">
          {item.type} · level {item.level}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
        aria-pressed={watched}
        onClick={onToggleWatch}
      >
        <StarIcon
          className={cn('size-4', watched && 'fill-primary text-primary')}
        />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Clear item"
        onClick={onClear}
      >
        <XIcon className="size-4" />
      </Button>
    </div>
  )
}
