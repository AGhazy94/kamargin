import { ArrowLeftIcon } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SERVERS } from '@/config/servers'
import { SnapshotList } from '@/features/saved-items/components/snapshot-list'
import { SnapshotDetails } from '@/features/saved-items/components/snapshot-view'
import { Watchlist } from '@/features/saved-items/components/watchlist'
import { getItem } from '@/lib/game-data'
import { usePriceBook } from '@/stores/price-book'
import { useSnapshots, useWatchlist } from '@/stores/saved-items'
import type { Item } from '@/types/game'
import type { Snapshot } from '@/types/saved'

const SEARCHABLE_FROM = 6

export function WatchlistRoute({
  serverId,
  onSelectItem,
  calculatorHref,
}: {
  serverId: number
  onSelectItem: (item: Item) => void
  calculatorHref: string
}) {
  const { entries, unwatch } = useWatchlist(serverId)
  const { book } = usePriceBook(serverId)
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const filtered = entries.filter(({ itemId }) =>
    (getItem(itemId)?.name ?? String(itemId))
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  )

  return (
    <section className="flex flex-col gap-6" aria-labelledby="watchlist-title">
      <header className="flex items-baseline justify-between gap-4">
        <h1 id="watchlist-title" className="font-heading font-semibold text-xl">
          Watchlist{' '}
          <span className="text-muted-foreground">({entries.length})</span>
        </h1>
      </header>
      {entries.length > 0 ? (
        <>
          {/* A list you can read at a glance does not need to be searched. */}
          {entries.length > SEARCHABLE_FROM && (
            <Input
              type="search"
              aria-label="Search watchlist"
              placeholder="Search watched items"
              value={query}
              onChange={(event) => {
                const next = new URLSearchParams(params)
                if (event.target.value) next.set('q', event.target.value)
                else next.delete('q')
                setParams(next, { replace: true })
              }}
            />
          )}
          {filtered.length ? (
            <Watchlist
              entries={filtered}
              book={book}
              onSelect={onSelectItem}
              onRemove={unwatch}
            />
          ) : (
            <p className="text-muted-foreground text-sm">No matching items.</p>
          )}
        </>
      ) : (
        <div className="flex flex-col items-start gap-4 py-8">
          <p className="text-muted-foreground">
            No watched items on this server.
          </p>
          <Link
            to={calculatorHref}
            className="text-primary underline underline-offset-4"
          >
            Browse items
          </Link>
        </div>
      )}
    </section>
  )
}

export function SnapshotsRoute({
  serverId,
  onOpen,
  calculatorHref,
}: {
  serverId: number
  onOpen: (snapshot: Snapshot) => void
  calculatorHref: string
}) {
  const { snapshots } = useSnapshots(serverId)
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const itemId = params.has('item') ? Number(params.get('item')) : null
  const itemOptions = [
    { value: 'all', label: 'All items' },
    ...new Map(
      snapshots.map((snapshot) => [
        snapshot.itemId,
        { value: String(snapshot.itemId), label: snapshot.itemName },
      ]),
    ).values(),
  ]
  if (
    itemId !== null &&
    !itemOptions.some((option) => option.value === String(itemId))
  )
    itemOptions.push({
      value: String(itemId),
      label: getItem(itemId)?.name ?? 'Unavailable item',
    })
  const filtered = snapshots
    .filter(
      (snapshot) =>
        (itemId === null || snapshot.itemId === itemId) &&
        `${snapshot.itemName} ${snapshot.label}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort((first, second) => second.takenAt - first.takenAt)

  return (
    <section className="flex flex-col gap-6" aria-labelledby="snapshots-title">
      <header className="flex items-baseline justify-between gap-4">
        <h1 id="snapshots-title" className="font-heading font-semibold text-xl">
          Snapshots{' '}
          <span className="text-muted-foreground">({snapshots.length})</span>
        </h1>
      </header>
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="search"
          aria-label="Search snapshots"
          placeholder="Search items or labels"
          className="min-w-0 flex-1 basis-full sm:basis-0"
          value={query}
          onChange={(event) => {
            const next = new URLSearchParams(params)
            if (event.target.value) next.set('q', event.target.value)
            else next.delete('q')
            setParams(next, { replace: true })
          }}
        />
        <Select
          items={itemOptions}
          value={itemId === null ? 'all' : String(itemId)}
          onValueChange={(value) => {
            if (value === null) return
            const next = new URLSearchParams(params)
            if (value === 'all') next.delete('item')
            else next.set('item', value)
            setParams(next, { replace: true })
          }}
        >
          <SelectTrigger
            aria-label="Filter snapshots by item"
            className="h-10 min-w-0 flex-1 sm:w-56 sm:flex-none"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {itemOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(itemId !== null || query) && (
          <Button
            variant="outline"
            onClick={() =>
              setParams({ server: String(serverId) }, { replace: true })
            }
          >
            Clear filters
          </Button>
        )}
      </div>
      {itemId !== null && (
        <p className="text-sm">
          History for{' '}
          {snapshots.find((snapshot) => snapshot.itemId === itemId)?.itemName ??
            getItem(itemId)?.name ??
            'unavailable item'}
        </p>
      )}
      {filtered.length ? (
        <SnapshotList snapshots={filtered} onOpen={onOpen} />
      ) : (
        <div className="flex flex-col items-start gap-4 py-8">
          <p className="text-muted-foreground">
            {snapshots.length
              ? 'No matching snapshots.'
              : 'No snapshots on this server.'}
          </p>
          {!snapshots.length && (
            <Link
              to={calculatorHref}
              className="text-primary underline underline-offset-4"
            >
              Open calculator
            </Link>
          )}
        </div>
      )}
    </section>
  )
}

export function SnapshotRoute({
  serverId,
  onClose,
  onOpenItem,
  onRestore,
}: {
  serverId: number
  onClose: () => void
  onOpenItem: (item: Item) => void
  onRestore: (snapshot: Snapshot) => void
}) {
  const { snapshotId } = useParams()
  const { snapshots, removeSnapshot } = useSnapshots(serverId)
  const snapshot = snapshots.find((entry) => entry.id === snapshotId)

  if (!snapshot)
    return (
      <div className="flex flex-col items-start gap-4">
        <h1 className="font-heading font-semibold text-xl">
          Snapshot unavailable
        </h1>
        <p className="text-muted-foreground">
          This record is not saved on the selected server.
        </p>
        <Button variant="outline" onClick={onClose}>
          Back to snapshots
        </Button>
      </div>
    )

  return (
    <section
      className="flex max-w-3xl flex-col gap-8"
      aria-labelledby="snapshot-title"
    >
      <header className="flex flex-col items-start gap-3 border-b pb-6">
        <div className="flex w-full items-center justify-between gap-4">
          <Button variant="ghost" onClick={onClose}>
            <ArrowLeftIcon /> Back
          </Button>
          <Badge variant="secondary">Snapshot</Badge>
        </div>
        <h1
          id="snapshot-title"
          className="wrap-anywhere max-w-full font-heading font-semibold text-xl"
        >
          {snapshot.label}
        </h1>
        <p className="wrap-anywhere text-muted-foreground text-sm">
          {snapshot.itemName} ·{' '}
          {SERVERS.find((server) => server.id === serverId)?.name}
        </p>
        <time
          className="text-muted-foreground text-xs"
          dateTime={new Date(snapshot.takenAt).toISOString()}
        >
          {new Date(snapshot.takenAt).toLocaleString('en-GB', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </time>
      </header>
      <SnapshotDetails
        key={snapshot.id}
        snapshot={snapshot}
        serverId={serverId}
        onOpenItem={onOpenItem}
        onRestore={onRestore}
        onDelete={(id) => {
          removeSnapshot(id)
          onClose()
        }}
      />
    </section>
  )
}
