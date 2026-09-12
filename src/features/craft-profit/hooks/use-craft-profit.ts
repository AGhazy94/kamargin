import { useMemo } from 'react'

import type { Item } from '@/types/game'
import type { CraftProfit } from '../types'
import { calculateCraftProfit } from '../utils/profit'

export type CraftProfitStatus =
  | 'no-recipe'
  | 'missing-ingredient-prices'
  | 'missing-sale-price'
  | 'complete'

export function useCraftProfit(
  item: Item | null,
  prices: Record<number, number | undefined>,
): { profit: CraftProfit; status: CraftProfitStatus } {
  return useMemo(() => {
    const recipe = item?.recipe
    if (!item || !recipe?.length) {
      return {
        profit: { lines: [], missingPriceCount: 0 },
        status: 'no-recipe' as const,
      }
    }

    const profit = calculateCraftProfit({
      ingredients: recipe.map((ingredient) => ({
        ...ingredient,
        unitPrice: prices[ingredient.itemId],
      })),
      salePrice: prices[item.id],
    })

    if (profit.missingPriceCount > 0) {
      return { profit, status: 'missing-ingredient-prices' as const }
    }
    if (profit.netProfit === undefined) {
      return { profit, status: 'missing-sale-price' as const }
    }
    return { profit, status: 'complete' as const }
  }, [item, prices])
}
