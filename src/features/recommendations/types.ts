import type { Ingredient, Item, PackTier } from '@/types/game'

export type RowState = 'ranked' | 'unpriced-sale' | 'missing-inputs' | 'dead'

export type Recommendation = {
  item: Item
  state: RowState
  craftCost?: number
  breakEven?: number
  bestTier?: PackTier
  netPerUnit?: number
  margin?: number
  missingPriceCount: number
  /** Net per unit with the missing ingredients free — what makes a `dead` row dead. */
  optimisticPerUnit?: number
  /** The unpriced ingredients, in recipe order — what the fill dialog asks for. */
  missing: readonly Ingredient[]
  stale: boolean
  thinMargin: boolean
}

export type SortKey = 'margin' | 'craftCost' | 'netPerUnit' | 'name'

export type RecommendationSort = {
  key: SortKey
  direction: 'asc' | 'desc'
}

export type RecommendationFilters = {
  jobId: number | null
  minLevel: number
  maxLevel: number
  hideIncomplete: boolean
  showDead: boolean
}

/** An unpriced ingredient, with the number of craftable recipes it blocks. */
export type Blocker = {
  itemId: number
  name: string
  recipeCount: number
}
