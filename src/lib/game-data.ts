import itemsData from '@/assets/game-data/items.json'
import meta from '@/assets/game-data/meta.json'
import type { Item } from '@/types/game'

type RawItem = {
  id: number
  name: string
  level: number
  type: string
  icon: number | null
  recipe?: [itemId: number, quantity: number][]
}

const ICON_BASE = 'https://api.dofusdu.de/dofus3/v1/img/item'
const SEARCH_RESULT_LIMIT = 50

function toItem(raw: RawItem): Item {
  return {
    id: raw.id,
    name: raw.name,
    level: raw.level,
    type: raw.type,
    iconUrl: `${ICON_BASE}/${raw.icon}-64.png`,
    recipe: raw.recipe?.map(([itemId, quantity]) => ({ itemId, quantity })),
  }
}

const itemsById = new Map<number, Item>(
  (itemsData as RawItem[]).map((raw) => [raw.id, toItem(raw)]),
)

export const GAME_DATA_VERSION = meta.gameVersion

export function getItem(ankamaId: number): Item | undefined {
  return itemsById.get(ankamaId)
}

export function searchItems(query: string): Item[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return []

  const startsWith: Item[] = []
  const contains: Item[] = []
  for (const item of itemsById.values()) {
    const name = item.name.toLowerCase()
    if (name.startsWith(needle)) startsWith.push(item)
    else if (name.includes(needle)) contains.push(item)
    if (startsWith.length >= SEARCH_RESULT_LIMIT) break
  }

  return [...startsWith, ...contains].slice(0, SEARCH_RESULT_LIMIT)
}
