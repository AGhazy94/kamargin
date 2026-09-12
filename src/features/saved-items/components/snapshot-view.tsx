import { ArrowRightIcon, RotateCcwIcon, Trash2Icon } from 'lucide-react'
import { useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { SERVERS } from '@/config/servers'
import { getItem } from '@/lib/game-data'
import { cn } from '@/lib/utils'
import type { Item } from '@/types/game'
import type { Snapshot } from '@/types/saved'
import { formatKamas, formatTier } from '@/utils/format'

const COLUMNS =
  'grid grid-cols-[2.75rem_repeat(3,minmax(0,1fr))] items-baseline gap-2 text-sm'

type SnapshotActions = {
  serverId: number
  onOpenItem: (item: Item) => void
  onRestore: (snapshot: Snapshot) => void
  onDelete: (id: string) => void
}

function Net({ value }: { value?: number }) {
  return (
    <span
      className={cn(
        'break-all text-right tabular-nums',
        value === undefined && 'text-muted-foreground',
        value !== undefined && value > 0 && 'text-gain',
        value !== undefined && value < 0 && 'text-loss',
      )}
    >
      {value === undefined ? '—' : formatKamas(value)}
    </span>
  )
}

function Frozen({ snapshot }: { snapshot: Snapshot }) {
  const { craftCost, breakEven, bestTier, tiers } = snapshot.figures

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-muted-foreground">Craft cost</span>
          <span className="tabular-nums">
            {craftCost === undefined ? '—' : `${formatKamas(craftCost)}/u`}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-muted-foreground">Break-even</span>
          <span className="tabular-nums">
            {breakEven === undefined ? '—' : `${formatKamas(breakEven)}/u`}
          </span>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <div className={cn(COLUMNS, 'text-muted-foreground text-xs')}>
          <span>Pack</span>
          <span className="text-right">Pack price</span>
          <span className="text-right">Net / pack</span>
          <span className="text-right">Net / unit</span>
        </div>
        {tiers.map((tier) => (
          <div
            key={tier.tier}
            className={cn(COLUMNS, bestTier === tier.tier && 'font-semibold')}
          >
            <span
              className={cn(
                'tabular-nums',
                bestTier !== tier.tier && 'text-muted-foreground',
              )}
            >
              {formatTier(tier.tier)}
            </span>
            <span
              className={cn(
                'break-all text-right tabular-nums',
                tier.packPrice === undefined && 'text-muted-foreground',
              )}
            >
              {tier.packPrice === undefined ? '—' : formatKamas(tier.packPrice)}
            </span>
            <Net value={tier.netProfit} />
            <Net value={tier.perUnit} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SnapshotDetails({
  snapshot,
  serverId,
  onOpenItem,
  onRestore,
  onDelete,
}: SnapshotActions & { snapshot: Snapshot }) {
  const [confirmation, setConfirmation] = useState<'restore' | 'delete' | null>(
    null,
  )
  const cancelRef = useRef<HTMLButtonElement>(null)
  const item = getItem(snapshot.itemId)
  const serverName = SERVERS.find((server) => server.id === serverId)?.name

  return (
    <div className="flex flex-col gap-6">
      <Frozen snapshot={snapshot} />
      {!item && (
        <p className="text-muted-foreground text-sm">
          This item is no longer in the bundled catalog.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3 border-t pt-6">
        <Button disabled={!item} onClick={() => item && onOpenItem(item)}>
          <ArrowRightIcon /> Open item
        </Button>
        <Button
          variant="outline"
          disabled={!item}
          onClick={() => setConfirmation('restore')}
        >
          <RotateCcwIcon /> Restore prices
        </Button>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-lg"
                className="ml-auto text-destructive"
                aria-label="Delete snapshot"
                onClick={() => setConfirmation('delete')}
              />
            }
          >
            <Trash2Icon />
          </TooltipTrigger>
          <TooltipContent>Delete snapshot</TooltipContent>
        </Tooltip>
      </div>

      <Dialog
        open={confirmation !== null}
        onOpenChange={(open) => !open && setConfirmation(null)}
      >
        <DialogContent
          initialFocus={cancelRef}
          className="max-h-[85dvh] overflow-y-auto sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle>
              {confirmation === 'restore'
                ? 'Restore snapshot prices?'
                : 'Delete snapshot?'}
            </DialogTitle>
            <DialogDescription className="wrap-anywhere">
              {confirmation === 'restore'
                ? `This replaces the recorded item and ingredient prices in ${serverName}'s shared price book. Other recipes using those ingredients are affected. The snapshot stays unchanged, and prices keep the snapshot date.`
                : `Delete "${snapshot.label}" from ${serverName}? This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              ref={cancelRef}
              variant="outline"
              onClick={() => setConfirmation(null)}
            >
              Cancel
            </Button>
            <Button
              variant={confirmation === 'delete' ? 'destructive' : 'default'}
              onClick={() => {
                if (confirmation === 'restore' && item) onRestore(snapshot)
                if (confirmation === 'delete') onDelete(snapshot.id)
                setConfirmation(null)
              }}
            >
              {confirmation === 'restore' ? (
                <>
                  <RotateCcwIcon /> Restore prices
                </>
              ) : (
                <>
                  <Trash2Icon /> Delete snapshot
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function SnapshotView({
  snapshot,
  serverId,
  onClose,
  onOpenItem,
  onRestore,
  onDelete,
}: SnapshotActions & { snapshot: Snapshot | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)

  return (
    <Dialog
      open={snapshot !== null}
      onOpenChange={(next) => !next && onClose()}
    >
      <DialogContent
        initialFocus={closeRef}
        className="max-h-[85dvh] overflow-y-auto sm:max-w-lg"
      >
        {snapshot && (
          <>
            <DialogHeader>
              <DialogTitle className="wrap-anywhere leading-snug">
                {snapshot.label}
              </DialogTitle>
              <DialogDescription>
                {snapshot.itemName} ·{' '}
                {SERVERS.find((server) => server.id === serverId)?.name} ·{' '}
                {new Date(snapshot.takenAt).toLocaleString('en-GB', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
                . Snapshot.
              </DialogDescription>
            </DialogHeader>

            <SnapshotDetails
              key={snapshot.id}
              snapshot={snapshot}
              serverId={serverId}
              onOpenItem={(item) => {
                onOpenItem(item)
                onClose()
              }}
              onRestore={(record) => {
                onRestore(record)
                onClose()
              }}
              onDelete={(id) => {
                onDelete(id)
                onClose()
              }}
            />

            <DialogFooter>
              <Button ref={closeRef} variant="outline" onClick={onClose}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
