import { Button } from '@/components/ui/button'
import { CraftProfitCalculator } from '@/features/craft-profit/craft-profit-calculator'
import { SavedPanel } from '@/features/saved-items/saved-panel'
import { getItem } from '@/lib/game-data'
import { restorePackPrices } from '@/stores/price-book'
import { useSnapshots } from '@/stores/saved-items'
import type { Item } from '@/types/game'

export function HomeRoute({
  serverId,
  itemId,
  onItemChange,
}: {
  serverId: number
  itemId: number | null
  onItemChange: (item: Item | null) => void
}) {
  const { addSnapshot } = useSnapshots(serverId)
  const item = itemId === null ? null : (getItem(itemId) ?? null)
  const historyParams = new URLSearchParams({ server: String(serverId) })
  if (item) historyParams.set('item', String(item.id))

  if (itemId !== null && !item)
    return (
      <div className="flex flex-col items-start gap-4">
        <h1 className="font-heading font-semibold text-xl">Item unavailable</h1>
        <Button variant="outline" onClick={() => onItemChange(null)}>
          Choose another item
        </Button>
      </div>
    )

  return (
    <CraftProfitCalculator
      serverId={serverId}
      item={item}
      onItemChange={onItemChange}
      onTakeSnapshot={addSnapshot}
      savedPanel={
        <SavedPanel
          key={`${serverId}:${item?.id ?? 'none'}`}
          serverId={serverId}
          itemId={item?.id ?? null}
          historyHref={`/snapshots?${historyParams}`}
          onSelectItem={onItemChange}
          onRestore={(snapshot) =>
            restorePackPrices(serverId, snapshot.prices, snapshot.takenAt)
          }
        />
      }
    />
  )
}
