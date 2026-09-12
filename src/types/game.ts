// The marketplace sells in packs, and each tier carries its own total price.
export type PackTier = 1 | 10 | 100 | 1000

export type Server = {
  id: number
  name: string
}

export type Ingredient = {
  itemId: number
  quantity: number
}

export type Recipe = readonly Ingredient[]

export type Item = {
  id: number
  name: string
  level: number
  type: string
  iconUrl: string
  recipe?: Recipe
}
