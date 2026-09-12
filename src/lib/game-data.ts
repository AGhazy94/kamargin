import itemsData from '@/assets/game-data/items.json'
import meta from '@/assets/game-data/meta.json'
import { JOBS } from '@/config/jobs'
import type { Item, Job } from '@/types/game'

type RawItem = {
  id: number
  name: string
  level: number
  type: string
  icon: number | null
  recipe?: [itemId: number, quantity: number][]
  job?: number
  craftLevel?: number
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
    job: raw.job,
    craftLevel: raw.craftLevel,
  }
}

const itemsById = new Map<number, Item>(
  (itemsData as RawItem[]).map((raw) => [raw.id, toItem(raw)]),
)

const itemTypes = [
  ...new Set([...itemsById.values()].map((item) => item.type)),
].sort((a, b) => a.localeCompare(b))

// Prepared once: ranking iterates this array rather than a 13k map, on every filter change.
const craftableItems = [...itemsById.values()]
  .filter((item) => item.recipe?.length && item.job !== undefined)
  .sort((a, b) => a.name.localeCompare(b.name))

// Built once so a resource can answer "what am I for?" without scanning 13k recipes.
const recipesByIngredient = new Map<number, Item[]>()
for (const item of craftableItems) {
  for (const { itemId } of item.recipe ?? []) {
    const users = recipesByIngredient.get(itemId)
    if (users) users.push(item)
    else recipesByIngredient.set(itemId, [item])
  }
}

export const GAME_DATA_VERSION = meta.gameVersion

export function getRecipesUsing(ankamaId: number): readonly Item[] {
  return recipesByIngredient.get(ankamaId) ?? []
}

export function getCraftableItems(): readonly Item[] {
  return craftableItems
}

export function getJobs(): readonly Job[] {
  return JOBS
}

export function getJobName(jobId: number | undefined): string | undefined {
  return JOBS.find((job) => job.id === jobId)?.name
}

export function getItem(ankamaId: number): Item | undefined {
  return itemsById.get(ankamaId)
}

export function getItemTypes(): string[] {
  return itemTypes
}

export function searchItems(query: string, type?: string): Item[] {
  const needle = query.trim().toLowerCase()
  if (!needle && !type) return []

  const startsWith: Item[] = []
  const contains: Item[] = []
  for (const item of itemsById.values()) {
    if (type && item.type !== type) continue
    if (!needle) {
      startsWith.push(item)
    } else {
      const name = item.name.toLowerCase()
      if (name.startsWith(needle)) startsWith.push(item)
      else if (name.includes(needle)) contains.push(item)
    }
    if (startsWith.length >= SEARCH_RESULT_LIMIT) break
  }

  return [...startsWith, ...contains].slice(0, SEARCH_RESULT_LIMIT)
}
