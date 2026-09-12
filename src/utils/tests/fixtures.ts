import type { PricedIngredient } from '@/types/profit'

// Hogmeiser's Boots (ankama_id 910) at plausible Kourial prices.
export const HOGMEISER_BOOTS_INGREDIENTS: readonly PricedIngredient[] = [
  { itemId: 911, quantity: 1, unitPrice: 8000 },
  { itemId: 12075, quantity: 1, unitPrice: 450 },
  { itemId: 2504, quantity: 1, unitPrice: 300 },
  { itemId: 8761, quantity: 1, unitPrice: 1200 },
  { itemId: 18366, quantity: 6, unitPrice: 95 },
]

export const BOOTS_CRAFT_COST = 10520
