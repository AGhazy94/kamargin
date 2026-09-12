import { ChevronDownIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSnapshots } from '@/stores/saved-items'
import type { Item } from '@/types/game'
import type { Snapshot } from '@/types/saved'
import { SnapshotList } from './components/snapshot-list'
import { SnapshotView } from './components/snapshot-view'

export function SavedPanel({
  serverId,
  itemId,
  historyHref,
  onSelectItem,
  onRestore,
}: {
  serverId: number
  itemId: number | null
  historyHref: string
  onSelectItem: (item: Item) => void
  onRestore: (snapshot: Snapshot) => void
}) {
  const { snapshots, removeSnapshot } = useSnapshots(serverId)
  const [expanded, setExpanded] = useState(false)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const listId = useId()
  const matching = snapshots
    .filter((snapshot) => snapshot.itemId === itemId)
    .sort((first, second) => second.takenAt - first.takenAt)
  const viewing = matching.find((snapshot) => snapshot.id === viewingId) ?? null

  if (itemId === null || matching.length === 0) return null

  return (
    <>
      <section
        aria-label="Snapshot history"
        className="flex shrink-0 flex-col gap-2 border-t pt-3"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-heading font-medium text-sm">
            Snapshot history ({matching.length})
          </h2>
          <div className="flex items-center gap-2">
            <Link
              to={historyHref}
              className="rounded-sm text-primary text-xs underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              View all
            </Link>
            {matching.length > 1 && (
              <Button
                variant="ghost"
                size="icon-lg"
                aria-expanded={expanded}
                aria-controls={listId}
                aria-label={
                  expanded ? 'Show latest snapshot' : 'Show recent snapshots'
                }
                onClick={() => setExpanded((current) => !current)}
              >
                <ChevronDownIcon
                  className={cn(
                    'size-4 transition-transform',
                    expanded && 'rotate-180',
                  )}
                />
              </Button>
            )}
          </div>
        </div>
        <div id={listId} className="max-h-40 overflow-y-auto">
          <SnapshotList
            compact
            snapshots={matching.slice(0, expanded ? 3 : 1)}
            onOpen={(snapshot) => setViewingId(snapshot.id)}
          />
        </div>
      </section>

      <SnapshotView
        snapshot={viewing}
        serverId={serverId}
        onClose={() => setViewingId(null)}
        onOpenItem={onSelectItem}
        onRestore={onRestore}
        onDelete={removeSnapshot}
      />
    </>
  )
}
