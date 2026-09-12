import { cn } from '@/lib/utils'
import type { Snapshot } from '@/types/saved'
import { formatAge, formatCompactKamas, formatTier } from '@/utils/format'

function bestNet(snapshot: Snapshot) {
  return snapshot.figures.tiers.find(
    (tier) => tier.tier === snapshot.figures.bestTier,
  )?.netProfit
}

export function SnapshotList({
  snapshots,
  onOpen,
}: {
  snapshots: readonly Snapshot[]
  onOpen: (snapshot: Snapshot) => void
}) {
  if (snapshots.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">
        Take a snapshot to record today's numbers.
      </p>
    )
  }

  return (
    <ul className="flex flex-col">
      {snapshots.map((snapshot) => {
        const net = bestNet(snapshot)

        return (
          <li key={snapshot.id}>
            <button
              type="button"
              onClick={() => onOpen(snapshot)}
              className="flex w-full items-baseline gap-2 rounded-md py-1.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="min-w-0 flex-1 truncate">{snapshot.label}</span>
              <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                {formatAge(snapshot.takenAt)}
              </span>
              <span
                className={cn(
                  'w-16 shrink-0 text-right tabular-nums',
                  net === undefined && 'text-muted-foreground',
                  net !== undefined && net > 0 && 'text-gain',
                  net !== undefined && net < 0 && 'text-loss',
                )}
              >
                {net === undefined ? '—' : formatCompactKamas(net)}
              </span>
              <span className="w-9 shrink-0 text-right text-muted-foreground text-xs tabular-nums">
                {snapshot.figures.bestTier
                  ? formatTier(snapshot.figures.bestTier)
                  : ''}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
