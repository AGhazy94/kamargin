import { StarIcon, XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
        <h1 className="wrap-anywhere font-heading font-semibold text-lg leading-snug">
          {item.name}
        </h1>
        <p className="text-muted-foreground text-xs">
          {item.type} · level {item.level}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label={
                  watched ? 'Remove from watchlist' : 'Add to watchlist'
                }
                aria-pressed={watched}
                onClick={onToggleWatch}
              />
            }
          >
            <StarIcon
              className={cn('size-4', watched && 'fill-primary text-primary')}
            />
          </TooltipTrigger>
          <TooltipContent>
            {watched ? 'Remove from watchlist' : 'Add to watchlist'}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label="Clear item"
                onClick={onClear}
              />
            }
          >
            <XIcon className="size-4" />
          </TooltipTrigger>
          <TooltipContent>Clear item</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
