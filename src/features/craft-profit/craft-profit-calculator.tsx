import type { ReactNode } from 'react'

import { ScrollPanel } from '@/components/scroll-panel'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { usePriceBook } from '@/stores/price-book'
import { useWatchlist } from '@/stores/saved-items'
import type { Item } from '@/types/game'
import type { NewSnapshot } from '@/types/saved'
import { CraftCostTotal } from './components/craft-cost-total'
import { EmptyState } from './components/empty-state'
import { ItemPicker } from './components/item-picker'
import { ItemSummary } from './components/item-summary'
import { ProfitPanel } from './components/profit-panel'
import { ProfitSummaryBar } from './components/profit-summary-bar'
import { RecipeTable } from './components/recipe-table'
import { ResourcePanel } from './components/resource-panel'
import { SnapshotDialog } from './components/snapshot-dialog'
import { useCraftProfit } from './hooks/use-craft-profit'
import { usePackPrices } from './hooks/use-pack-prices'

export function CraftProfitCalculator({
  serverId,
  item,
  onItemChange,
  savedPanel = null,
  onTakeSnapshot,
}: {
  serverId: number
  item: Item | null
  onItemChange: (item: Item | null) => void
  savedPanel?: ReactNode
  onTakeSnapshot?: (snapshot: NewSnapshot) => void
}) {
  const { book } = usePriceBook(serverId)
  const { isWatched, toggleWatched } = useWatchlist(serverId)
  const { prices, setPrice } = usePackPrices(serverId, item)
  const { profit, status } = useCraftProfit(item, prices)

  const summary = item && (
    <ItemSummary
      item={item}
      watched={isWatched(item.id)}
      onToggleWatch={() => toggleWatched(item.id)}
      onClear={() => onItemChange(null)}
    />
  )

  return (
    <div
      className={cn(
        'flex flex-col gap-8 lg:h-full lg:min-h-0',
        item &&
          status !== 'no-recipe' &&
          'pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0',
      )}
    >
      <div className="shrink-0">
        <ItemPicker onSelect={onItemChange} />
      </div>

      <div className="grid items-start gap-8 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-stretch xl:grid-cols-[minmax(0,1fr)_26rem]">
        {!item ? (
          <EmptyState />
        ) : status === 'no-recipe' ? (
          <ScrollPanel
            key={item.id}
            scroll="lg"
            header={
              <div className="flex flex-col gap-6">
                {summary}
                <Separator />
              </div>
            }
          >
            <ResourcePanel
              item={item}
              packPrices={prices[item.id] ?? {}}
              entry={book[item.id]}
              onPriceChange={(tier, packPrice) =>
                setPrice(item.id, tier, packPrice)
              }
              onOpenItem={onItemChange}
            />
          </ScrollPanel>
        ) : (
          <ScrollPanel
            key={item.id}
            scroll="lg"
            header={
              <div className="flex flex-col gap-6">
                {summary}
                <Separator />
              </div>
            }
            footer={<CraftCostTotal craftCost={profit.craftCost} />}
          >
            <RecipeTable
              profit={profit}
              prices={prices}
              book={book}
              onPriceChange={setPrice}
            />
          </ScrollPanel>
        )}

        <div className="flex flex-col gap-6 lg:min-h-0">
          {item && status !== 'no-recipe' && (
            <ProfitPanel
              profit={profit}
              header={
                <div className="flex items-center justify-between gap-2">
                  <span className="font-heading font-medium">Sell</span>
                  {onTakeSnapshot && (
                    <SnapshotDialog
                      key={item.id}
                      item={item}
                      profit={profit}
                      prices={prices}
                      onTake={onTakeSnapshot}
                    />
                  )}
                </div>
              }
              onSalePriceChange={(tier, packPrice) =>
                setPrice(item.id, tier, packPrice)
              }
            />
          )}
          {savedPanel}
        </div>
      </div>

      {item && status !== 'no-recipe' && <ProfitSummaryBar profit={profit} />}
    </div>
  )
}
