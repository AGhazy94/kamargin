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
import { cn } from '@/lib/utils'
import type { Snapshot } from '@/types/saved'
import { formatCompactKamas, formatKamas, formatTier } from '@/utils/format'

const COLUMNS =
  'grid grid-cols-[2.5rem_minmax(0,1fr)_5rem_5rem] items-baseline gap-3'

function Net({ value }: { value?: number }) {
  return (
    <span
      className={cn(
        'text-right tabular-nums',
        value === undefined && 'text-muted-foreground',
        value !== undefined && value > 0 && 'text-gain',
        value !== undefined && value < 0 && 'text-loss',
      )}
    >
      {value === undefined ? '—' : formatCompactKamas(value)}
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
          <span />
          <span className="text-right">Pack price</span>
          <span className="text-right">Net</span>
          <span className="text-right">/unit</span>
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
                'text-right tabular-nums',
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

export function SnapshotView({
  snapshot,
  onClose,
  onRestore,
  onDelete,
}: {
  snapshot: Snapshot | null
  onClose: () => void
  onRestore: (snapshot: Snapshot) => void
  onDelete: (id: string) => void
}) {
  return (
    <Dialog
      open={snapshot !== null}
      onOpenChange={(next) => !next && onClose()}
    >
      <DialogContent className="sm:max-w-md">
        {snapshot && (
          <>
            <DialogHeader>
              <DialogTitle>{snapshot.label}</DialogTitle>
              <DialogDescription>
                {snapshot.itemName} ·{' '}
                {new Date(snapshot.takenAt).toLocaleString('en-GB', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
                . Frozen — these figures never recalculate.
              </DialogDescription>
            </DialogHeader>

            <Frozen snapshot={snapshot} />

            <DialogFooter className="sm:justify-between">
              <Button
                variant="ghost"
                className="text-destructive sm:mr-auto"
                onClick={() => {
                  onDelete(snapshot.id)
                  onClose()
                }}
              >
                Delete
              </Button>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button
                onClick={() => {
                  onRestore(snapshot)
                  onClose()
                }}
              >
                Copy prices in
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
