export type PricedIngredient = {
  itemId: number
  quantity: number
  unitPrice?: number
}

export type ProfitInputs = {
  ingredients: readonly PricedIngredient[]
  salePrice?: number
}

export type ProfitLine = PricedIngredient & {
  lineCost?: number
}

export type CraftProfit = {
  lines: readonly ProfitLine[]
  missingPriceCount: number
  craftCost?: number
  fee?: number
  netProfit?: number
  margin?: number
  breakEven?: number
}
