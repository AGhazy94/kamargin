import { Trash2Icon } from 'lucide-react'
import { useRef, useState } from 'react'

import { ItemIcon } from '@/components/item-icon'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getItem } from '@/lib/game-data'
import { cn } from '@/lib/utils'
import type { Snapshot } from '@/types/saved'
import { formatAge, formatCompactKamas, formatTier } from '@/utils/format'

function SnapshotNet({ value }: { value?: number }) {
  return (
    <span
      className={cn(
        'tabular-nums',
        value === undefined && 'text-muted-foreground',
        value !== undefined && value > 0 && 'text-gain',
        value !== undefined && value < 0 && 'text-loss',
      )}
    >
      {value === undefined ? '—' : formatCompactKamas(value)}
    </span>
  )
}

export function SnapshotList({
  snapshots,
  onOpen,
  onDelete,
  compact = false,
}: {
  snapshots: readonly Snapshot[]
  onOpen: (snapshot: Snapshot) => void
  /** Omitted where the row is only a preview of a record managed elsewhere. */
  onDelete?: (id: string) => void
  compact?: boolean
}) {
  const [pending, setPending] = useState<Snapshot | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  if (snapshots.length === 0) {
    return <p className="text-muted-foreground text-xs">No snapshots.</p>
  }

  return (
    <div>
      {!compact && (
        <div className="hidden grid-cols-[minmax(0,1fr)_9rem_3rem_6rem_6rem] gap-4 border-b px-2 py-3 text-muted-foreground text-xs sm:grid">
          <span>Item / label</span>
          <span>Saved</span>
          <span>Pack</span>
          <span className="text-right">Net / pack</span>
          <span className="text-right">Net / unit</span>
        </div>
      )}
      <ul className="flex flex-col">
        {snapshots.map((snapshot) => {
          const best = snapshot.figures.tiers.find(
            (tier) => tier.tier === snapshot.figures.bestTier,
          )

          return (
            <li
              key={snapshot.id}
              className={cn('flex items-center gap-1', !compact && 'border-b')}
            >
              <button
                type="button"
                onClick={() => onOpen(snapshot)}
                aria-label={`Open snapshot ${snapshot.label} for ${snapshot.itemName}`}
                className={cn(
                  'min-h-11 min-w-0 flex-1 rounded-md px-2 py-3 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
                  compact
                    ? 'flex items-start justify-between gap-3'
                    : 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,1fr)_9rem_3rem_6rem_6rem]',
                )}
              >
                <span
                  className={cn(
                    'flex min-w-0 items-center gap-3',
                    !compact && 'col-span-2 sm:col-span-1',
                  )}
                >
                  {!compact && (
                    <ItemIcon
                      item={getItem(snapshot.itemId)}
                      className="size-9"
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    {!compact && (
                      <span className="wrap-anywhere block font-medium">
                        {snapshot.itemName}
                      </span>
                    )}
                    <span
                      className={cn(
                        'wrap-anywhere line-clamp-2',
                        compact
                          ? 'text-sm'
                          : 'mt-1 text-muted-foreground text-sm',
                      )}
                    >
                      {snapshot.label}
                    </span>
                    {compact && (
                      <span className="mt-1 block text-muted-foreground text-xs">
                        Saved {formatAge(snapshot.takenAt)}
                      </span>
                    )}
                  </span>
                </span>
                {compact ? (
                  <span className="shrink-0 text-right text-sm">
                    <SnapshotNet value={best?.perUnit} />
                    <span className="mt-1 block text-muted-foreground text-xs">
                      {best ? `/unit · ${formatTier(best.tier)}` : 'Incomplete'}
                    </span>
                  </span>
                ) : (
                  <>
                    <time
                      className="text-muted-foreground text-xs"
                      dateTime={new Date(snapshot.takenAt).toISOString()}
                    >
                      {new Date(snapshot.takenAt).toLocaleString('en-GB', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </time>
                    <span className="text-right text-muted-foreground text-sm sm:text-left">
                      {best ? formatTier(best.tier) : '—'}
                    </span>
                    <span className="text-sm sm:text-right">
                      <span className="mr-2 text-muted-foreground text-xs sm:hidden">
                        Net / pack
                      </span>
                      <SnapshotNet value={best?.netProfit} />
                    </span>
                    <span className="text-right text-sm">
                      <span className="mr-2 text-muted-foreground text-xs sm:hidden">
                        Net / unit
                      </span>
                      <SnapshotNet value={best?.perUnit} />
                    </span>
                  </>
                )}
              </button>
              {onDelete && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`Delete snapshot ${snapshot.label}`}
                        onClick={() => setPending(snapshot)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      />
                    }
                  >
                    <Trash2Icon className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent>Delete snapshot</TooltipContent>
                </Tooltip>
              )}
            </li>
          )
        })}
      </ul>

      <Dialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
      >
        <DialogContent initialFocus={cancelRef} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete snapshot?</DialogTitle>
            <DialogDescription className="wrap-anywhere">
              {pending &&
                `Delete "${pending.label}" for ${pending.itemName}? This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              ref={cancelRef}
              variant="outline"
              onClick={() => setPending(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (pending) onDelete?.(pending.id)
                setPending(null)
              }}
            >
              <Trash2Icon /> Delete snapshot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
