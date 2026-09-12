import type { PriceBook } from '@/stores/price-book'
import type { Item, PackTier } from '@/types/game'
import type { PackPrices } from '@/utils/pack-tiers'

export const NOW = Date.parse('2026-09-12T12:00:00Z')
export const YESTERDAY = NOW - 25 * 60 * 60 * 1000

export const JEWELLER = 16
export const SHOEMAKER = 15

export function craftable(
  id: number,
  {
    name = `Item ${id}`,
    job = JEWELLER,
    craftLevel = 60,
    recipe = [],
  }: Partial<Pick<Item, 'name' | 'job' | 'craftLevel'>> & {
    recipe?: [itemId: number, quantity: number][]
  } = {},
): Item {
  return {
    id,
    name,
    level: craftLevel,
    type: 'Ring',
    iconUrl: `icon/${id}.png`,
    recipe: recipe.map(([itemId, quantity]) => ({ itemId, quantity })),
    job,
    craftLevel,
  }
}

export function book(
  entries: Record<number, PackPrices>,
  capturedAt = NOW,
): PriceBook {
  const result: PriceBook = {}

  for (const [id, prices] of Object.entries(entries)) {
    const itemId = Number(id)
    const tiers: PriceBook[number]['tiers'] = {}
    for (const [tier, packPrice] of Object.entries(prices)) {
      tiers[Number(tier) as PackTier] = { packPrice, capturedAt }
    }
    result[itemId] = { serverId: 355, itemId, tiers }
  }

  return result
}
