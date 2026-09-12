import { useCallback } from 'react'

import { useLocalStorage } from '@/hooks/use-local-storage'
import type { NewSnapshot, Snapshot, WatchlistEntry } from '@/types/saved'

const EMPTY_WATCHLIST: readonly WatchlistEntry[] = []
const EMPTY_SNAPSHOTS: readonly Snapshot[] = []

function watchlistKey(serverId: number) {
  return `watchlist:${serverId}`
}

function snapshotsKey(serverId: number) {
  return `snapshots:${serverId}`
}

export function useWatchlist(serverId: number) {
  const [entries, setEntries] = useLocalStorage(
    watchlistKey(serverId),
    EMPTY_WATCHLIST,
  )

  const isWatched = useCallback(
    (itemId: number) => entries.some((entry) => entry.itemId === itemId),
    [entries],
  )

  const toggleWatched = useCallback(
    (itemId: number) =>
      setEntries((current) =>
        current.some((entry) => entry.itemId === itemId)
          ? current.filter((entry) => entry.itemId !== itemId)
          : [{ itemId, addedAt: Date.now() }, ...current],
      ),
    [setEntries],
  )

  const unwatch = useCallback(
    (itemId: number) =>
      setEntries((current) =>
        current.filter((entry) => entry.itemId !== itemId),
      ),
    [setEntries],
  )

  return { entries, isWatched, toggleWatched, unwatch }
}

export function useSnapshots(serverId: number) {
  const [snapshots, setSnapshots] = useLocalStorage(
    snapshotsKey(serverId),
    EMPTY_SNAPSHOTS,
  )

  const addSnapshot = useCallback(
    (snapshot: NewSnapshot) =>
      setSnapshots((current) => [
        { ...snapshot, id: crypto.randomUUID(), takenAt: Date.now() },
        ...current,
      ]),
    [setSnapshots],
  )

  const removeSnapshot = useCallback(
    (id: string) =>
      setSnapshots((current) =>
        current.filter((snapshot) => snapshot.id !== id),
      ),
    [setSnapshots],
  )

  return { snapshots, addSnapshot, removeSnapshot }
}
