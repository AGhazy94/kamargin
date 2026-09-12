import { useMemo } from 'react'

import type { Item } from '@/types/game'
import { cheapestTier, pricedTierCount } from '@/utils/pack-tiers'
import type { CraftProfit } from '../types'
import { calculateCraftProfit } from '../utils/profit'
import type { PackPriceMap } from './use-pack-prices'

export type CraftProfitStatus =
  | 'no-recipe'
  | 'missing-ingredient-prices'
  | 'missing-sale-price'
  | 'complete'

export function useCraftProfit(
  item: Item | null,
  prices: PackPriceMap,
): { profit: CraftProfit; status: CraftProfitStatus } {
  return useMemo(() => {
    const recipe = item?.recipe
    if (!item || !recipe?.length) {
      return {
        profit: { lines: [], missingPriceCount: 0, tiers: [] },
        status: 'no-recipe' as const,
      }
    }

    const profit = calculateCraftProfit({
      ingredients: recipe.map((ingredient) => {
        const packPrices = prices[ingredient.itemId] ?? {}
        const winner = cheapestTier(packPrices)

        return {
          ...ingredient,
          unitPrice: winner?.unitPrice,
          winningTier: winner?.tier,
          pricedTierCount: pricedTierCount(packPrices),
        }
      }),
      salePrices: prices[item.id],
    })

    if (profit.missingPriceCount > 0) {
      return { profit, status: 'missing-ingredient-prices' as const }
    }
    if (profit.bestTier === undefined) {
      return { profit, status: 'missing-sale-price' as const }
    }
    return { profit, status: 'complete' as const }
  }, [item, prices])
}
