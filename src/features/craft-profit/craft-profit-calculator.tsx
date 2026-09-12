import { useCallback, useEffect, useState } from 'react'

import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  readPriceBook,
  removePrice,
  usePriceBook,
  writePrice,
} from '@/stores/price-book'
import { useServer } from '@/stores/server'
import type { Item } from '@/types/game'
import { EmptyState } from './components/empty-state'
import { ItemPicker } from './components/item-picker'
import { ItemSummary } from './components/item-summary'
import { ProfitPanel } from './components/profit-panel'
import { ProfitSummaryBar } from './components/profit-summary-bar'
import { RecipeTable } from './components/recipe-table'
import { useCraftProfit } from './hooks/use-craft-profit'

const PERSIST_DELAY_MS = 400

type Prices = Record<number, number | undefined>

export function CraftProfitCalculator() {
  const { serverId } = useServer()
  const { book } = usePriceBook(serverId)
  const [item, setItem] = useState<Item | null>(null)
  const [prices, setPrices] = useState<Prices>({})

  useEffect(() => {
    if (!item) {
      setPrices({})
      return
    }
    const stored = readPriceBook(serverId)
    const ids = [item.id, ...(item.recipe?.map(({ itemId }) => itemId) ?? [])]
    setPrices(
      Object.fromEntries(
        ids.map((id) => [id, stored[id]?.unitPrice]),
      ) as Prices,
    )
  }, [item, serverId])

  useEffect(() => {
    const timer = setTimeout(() => {
      const stored = readPriceBook(serverId)
      for (const [id, unitPrice] of Object.entries(prices)) {
        const itemId = Number(id)
        if (unitPrice === undefined) {
          if (stored[itemId]) removePrice(serverId, itemId)
        } else if (stored[itemId]?.unitPrice !== unitPrice) {
          writePrice(serverId, itemId, unitPrice)
        }
      }
    }, PERSIST_DELAY_MS)

    return () => clearTimeout(timer)
  }, [prices, serverId])

  const setPrice = useCallback((itemId: number, unitPrice?: number) => {
    setPrices((current) => ({ ...current, [itemId]: unitPrice }))
  }, [])

  const { profit, status } = useCraftProfit(item, prices)

  return (
    <div className="flex flex-col gap-6">
      <ItemPicker onSelect={setItem} />

      {!item && <EmptyState />}

      {item && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <ItemSummary item={item} onClear={() => setItem(null)} />
              {status === 'no-recipe' ? null : (
                <>
                  <Separator />
                  <RecipeTable
                    profit={profit}
                    book={book}
                    onPriceChange={setPrice}
                  />
                </>
              )}
            </CardContent>
          </Card>

          {status === 'no-recipe' ? (
            <Card>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  This item can't be crafted.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ProfitPanel
              profit={profit}
              salePrice={prices[item.id]}
              onSalePriceChange={(salePrice) => setPrice(item.id, salePrice)}
            />
          )}
        </div>
      )}

      {item && status !== 'no-recipe' && (
        <ProfitSummaryBar netProfit={profit.netProfit} />
      )}
    </div>
  )
}
