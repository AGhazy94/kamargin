import { useCallback, useState } from 'react'

import { AppShell } from '@/components/layouts/app-shell'
import { CraftProfitCalculator } from '@/features/craft-profit/craft-profit-calculator'
import { SavedPanel } from '@/features/saved-items/saved-panel'
import { getItem } from '@/lib/game-data'
import { useSnapshots } from '@/stores/saved-items'
import { useServer } from '@/stores/server'
import type { Item } from '@/types/game'
import type { Snapshot } from '@/types/saved'

export function HomeRoute() {
  const { serverId } = useServer()
  const { addSnapshot } = useSnapshots(serverId)
  const [item, setItem] = useState<Item | null>(null)
  const [restoring, setRestoring] = useState<Snapshot | null>(null)

  // The two features never meet: the route holds the selected item between them.
  const restore = useCallback((snapshot: Snapshot) => {
    setItem(getItem(snapshot.itemId) ?? null)
    setRestoring(snapshot)
  }, [])

  return (
    <AppShell>
      <CraftProfitCalculator
        item={item}
        onItemChange={setItem}
        restoring={restoring}
        onRestored={useCallback(() => setRestoring(null), [])}
        onTakeSnapshot={addSnapshot}
        savedPanel={
          <SavedPanel
            serverId={serverId}
            onSelectItem={setItem}
            onRestore={restore}
          />
        }
      />
    </AppShell>
  )
}
