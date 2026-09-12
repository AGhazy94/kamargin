import { describe, expect, it } from 'vitest'

import { SERVERS } from '../../config/servers'
import {
  itemParam,
  parseItemParam,
  parseServerParam,
  serverParam,
  slugify,
} from '../url-params'

describe('server params', () => {
  it('names the server instead of numbering it', () => {
    expect(serverParam(355)).toBe('kourial')
    expect(serverParam(294)).toBe('hell-mina')
  })

  it('reads back every server it writes', () => {
    for (const server of SERVERS)
      expect(parseServerParam(serverParam(server.id))).toBe(server.id)
  })

  it('still opens a link written with the old numeric id', () => {
    expect(parseServerParam('355')).toBe(355)
    expect(parseServerParam('290')).toBe(290)
  })

  it('accepts a name typed with different capitals or spacing', () => {
    expect(parseServerParam('Kourial')).toBe(355)
    expect(parseServerParam('Hell Mina')).toBe(294)
    expect(parseServerParam('hell_mina')).toBe(294)
  })

  it('has nothing to say about a server that does not exist', () => {
    expect(parseServerParam('atlantis')).toBeUndefined()
    expect(parseServerParam('999999')).toBeUndefined()
    expect(parseServerParam(null)).toBeUndefined()
    expect(parseServerParam('')).toBeUndefined()
  })

  it('falls back to the number for an id no server claims', () => {
    expect(serverParam(1)).toBe('1')
  })
})

describe('item params', () => {
  it('leads with the id and trails the name', () => {
    expect(itemParam(9968, 'Bottle of Greedoburg')).toBe(
      '9968-bottle-of-greedoburg',
    )
    expect(itemParam(910, "Hogmeiser's Boots")).toBe('910-hogmeisers-boots')
  })

  it('reads the id back out, name or no name', () => {
    expect(parseItemParam('9968-bottle-of-greedoburg')).toBe(9968)
    expect(parseItemParam('9968')).toBe(9968)
  })

  it('ignores a name that has gone stale, because the id leads', () => {
    expect(parseItemParam('9968-something-else-entirely')).toBe(9968)
  })

  it('drops a name that slugs to nothing', () => {
    expect(itemParam(42, '???')).toBe('42')
    expect(itemParam(42)).toBe('42')
  })

  it('separates an absent item from an unreadable one', () => {
    expect(parseItemParam(null)).toBeNull()
    expect(parseItemParam('nonsense')).toBeNaN()
  })
})

describe('slugify', () => {
  it('strips punctuation, diacritics and case', () => {
    expect(slugify("Hogmeiser's Boots")).toBe('hogmeisers-boots')
    expect(slugify('Crâne de Bouftou')).toBe('crane-de-bouftou')
    expect(slugify('  spaced  out  ')).toBe('spaced-out')
  })
})
