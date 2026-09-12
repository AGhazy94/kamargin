import { ChevronDownIcon } from 'lucide-react'
import { useState } from 'react'

import { ScrollPanel } from '@/components/scroll-panel'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useSnapshots, useWatchlist } from '@/stores/saved-items'
import type { Item } from '@/types/game'
import type { Snapshot } from '@/types/saved'
import { SnapshotList } from './components/snapshot-list'
import { SnapshotView } from './components/snapshot-view'
import { Watchlist } from './components/watchlist'

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {title}
      </p>
      {children}
    </div>
  )
}

export function SavedPanel({
  serverId,
  onSelectItem,
  onRestore,
}: {
  serverId: number
  onSelectItem: (item: Item) => void
  onRestore: (snapshot: Snapshot) => void
}) {
  const { entries, unwatch } = useWatchlist(serverId)
  const { snapshots, removeSnapshot } = useSnapshots(serverId)
  const [open, setOpen] = useState(true)
  const [viewing, setViewing] = useState<Snapshot | null>(null)

  const header = (
    <div className="flex items-center justify-between gap-2">
      <span className="font-heading font-medium">Saved</span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-expanded={open}
        aria-label={open ? 'Collapse saved items' : 'Expand saved items'}
        onClick={() => setOpen((current) => !current)}
      >
        <ChevronDownIcon
          className={cn('size-4 transition-transform', !open && '-rotate-90')}
        />
      </Button>
    </div>
  )

  return (
    <>
      <ScrollPanel
        header={header}
        // Sized to its content, never past a third of the column: the sell panel is the answer.
        className={cn('shrink-0', open && 'lg:max-h-[45%]')}
      >
        {open && (
          <div className="flex flex-col gap-5">
            <Section title="Watchlist">
              <Watchlist
                entries={entries}
                onSelect={onSelectItem}
                onRemove={unwatch}
              />
            </Section>
            <Separator />
            <Section title="Snapshots">
              <SnapshotList snapshots={snapshots} onOpen={setViewing} />
            </Section>
          </div>
        )}
      </ScrollPanel>

      <SnapshotView
        snapshot={viewing}
        onClose={() => setViewing(null)}
        onRestore={onRestore}
        onDelete={removeSnapshot}
      />
    </>
  )
}
