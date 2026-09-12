import { XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { Item } from '@/types/game'

export function ItemSummary({
  item,
  onClear,
}: {
  item: Item
  onClear: () => void
}) {
  return (
    <div className="flex items-center gap-3">
      <img src={item.iconUrl} alt="" className="size-9 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{item.name}</p>
        <p className="text-muted-foreground text-xs">
          {item.type} · level {item.level}
        </p>
      </div>
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
