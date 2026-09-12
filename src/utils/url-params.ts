import { SERVERS } from '@/config/servers'

export function slugify(value: string) {
  return (
    value
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      // Apostrophes close a word rather than break it: Hogmeiser's → hogmeisers.
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  )
}

/** Ankama's numeric ids mean nothing in a shared link, and they are theirs to renumber. */
export function serverParam(serverId: number) {
  const server = SERVERS.find((entry) => entry.id === serverId)
  return server ? slugify(server.name) : String(serverId)
}

export function parseServerParam(raw: string | null) {
  if (!raw) return undefined
  const slug = slugify(raw)
  const byName = SERVERS.find((entry) => slugify(entry.name) === slug)
  if (byName) return byName.id
  return SERVERS.find((entry) => entry.id === Number(raw))?.id
}

/** The id leads so the name is decoration: a renamed item still resolves. */
export function itemParam(itemId: number, name?: string) {
  const slug = name ? slugify(name) : ''
  return slug ? `${itemId}-${slug}` : String(itemId)
}

export function parseItemParam(raw: string | null) {
  if (raw === null) return null
  const id = Number.parseInt(raw, 10)
  return Number.isSafeInteger(id) ? id : Number.NaN
}
