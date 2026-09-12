import { Button } from '@/components/ui/button'
import { CraftProfitCalculator } from '@/features/craft-profit/craft-profit-calculator'
import { SavedPanel } from '@/features/saved-items/saved-panel'
import { DropHint } from '@/features/screenshot-import/components/drop-hint'
import { getItem } from '@/lib/game-data'
import { restorePackPrices } from '@/stores/price-book'
import { useSnapshots } from '@/stores/saved-items'
import type { Item } from '@/types/game'
import { itemParam, serverParam } from '@/utils/url-params'
import { useScreenshotImport } from '../screenshot-import'

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
  const addImports = useScreenshotImport()
  const item = itemId === null ? null : (getItem(itemId) ?? null)
  const historyParams = new URLSearchParams({ server: serverParam(serverId) })
  if (item) historyParams.set('item', itemParam(item.id, item.name))

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
      onDropScreenshots={
        addImports
          ? (itemId, files) =>
              addImports(files.map((file) => ({ file, itemId })))
          : undefined
      }
      importHint={<DropHint />}
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
