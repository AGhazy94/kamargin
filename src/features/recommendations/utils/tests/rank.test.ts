import { describe, expect, it } from 'vitest'

import type { PriceBook } from '@/stores/price-book'
import type {
  RecommendationFilters,
  RecommendationSort,
  SortKey,
} from '../../types'
import {
  countByState,
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  rankRecommendations,
} from '../rank'
import {
  book,
  craftable,
  JEWELLER,
  NOW,
  SHOEMAKER,
  YESTERDAY,
} from './fixtures'

const RING = craftable(100, { name: 'Ring', recipe: [[1, 1]] })
const AMULET = craftable(200, { name: 'Amulet', recipe: [[2, 1]] })

function filters(
  overrides: Partial<RecommendationFilters> = {},
): RecommendationFilters {
  return { ...DEFAULT_FILTERS, ...overrides }
}

function rank(
  items: Parameters<typeof rankRecommendations>[0],
  prices: PriceBook,
  overrides: Partial<RecommendationFilters> = {},
  sort: RecommendationSort = DEFAULT_SORT,
) {
  return rankRecommendations(items, prices, filters(overrides), sort, NOW)
}

describe('rankRecommendations', () => {
  it('sorts ranked rows by margin, not by net profit', () => {
    // The amulet earns far more per craft; the ring turns its cost over faster.
    const rows = rank(
      [AMULET, RING],
      book({
        1: { 1: 100 },
        100: { 1: 200 },
        2: { 1: 10_000 },
        200: { 1: 12_000 },
      }),
    )

    expect(rows.map((row) => row.item.name)).toEqual(['Ring', 'Amulet'])
    expect(rows[0].margin).toBeGreaterThan(rows[1].margin ?? 0)
    expect(rows[0].netPerUnit).toBeLessThan(rows[1].netPerUnit ?? 0)
  })

  it('counts a craftable ingredient without a price as missing', () => {
    const worn = craftable(1, { name: 'Worn boots', recipe: [[3, 1]] })
    const boots = craftable(100, { name: 'Boots', recipe: [[1, 1]] })

    // Every input of the worn boots is priced — the worn boots themselves are not.
    const rows = rank([boots, worn], book({ 3: { 1: 50 }, 100: { 1: 9000 } }))
    const row = rows.find(({ item }) => item.id === boots.id)

    expect(row?.state).toBe('missing-inputs')
    expect(row?.craftCost).toBeUndefined()
    expect(row?.missing).toEqual([{ itemId: 1, quantity: 1 }])
  })

  it('orders states ranked, unpriced-sale, then fewest missing inputs first', () => {
    const ranked = craftable(100, { name: 'Ranked', recipe: [[1, 1]] })
    const unpricedSale = craftable(200, { name: 'Unpriced', recipe: [[1, 1]] })
    const oneMissing = craftable(300, {
      name: 'One missing',
      recipe: [
        [1, 1],
        [8, 1],
      ],
    })
    const twoMissing = craftable(400, {
      name: 'Two missing',
      recipe: [
        [8, 1],
        [9, 1],
      ],
    })

    const rows = rank(
      [twoMissing, oneMissing, unpricedSale, ranked],
      book({ 1: { 1: 100 }, 100: { 1: 200 } }),
    )

    expect(rows.map((row) => row.state)).toEqual([
      'ranked',
      'unpriced-sale',
      'missing-inputs',
      'missing-inputs',
    ])
    expect(rows.map((row) => row.item.name)).toEqual([
      'Ranked',
      'Unpriced',
      'One missing',
      'Two missing',
    ])
    expect(rows[1].breakEven).toBeDefined()
    expect(countByState(rows)).toEqual({
      ranked: 1,
      unpricedSale: 1,
      missingInputs: 2,
      profitable: 1,
    })
  })

  it('badges stale rows without moving them', () => {
    const fresh = craftable(100, { name: 'Fresh', recipe: [[1, 1]] })
    const stale = craftable(200, { name: 'Stale', recipe: [[2, 1]] })

    const rows = rank(
      [fresh, stale],
      {
        ...book({ 1: { 1: 100 }, 100: { 1: 200 } }),
        ...book({ 2: { 1: 100 }, 200: { 1: 300 } }, YESTERDAY),
      },
      {},
    )

    // The stale row has the better margin, and keeps first place.
    expect(rows.map((row) => [row.item.name, row.stale])).toEqual([
      ['Stale', true],
      ['Fresh', false],
    ])
  })

  it('flags a thin margin without dropping the row', () => {
    const rows = rank([RING], book({ 1: { 1: 1000 }, 100: { 1: 1050 } }))

    expect(rows[0].thinMargin).toBe(true)
    expect(rows[0].state).toBe('ranked')
  })

  it('reads no prices for an item the filters exclude', () => {
    const read: number[] = []
    const watched = new Proxy(
      book({ 1: { 1: 100 }, 2: { 1: 100 }, 100: { 1: 200 }, 200: { 1: 400 } }),
      {
        get(target, key) {
          if (typeof key === 'string') read.push(Number(key))
          return Reflect.get(target, key)
        },
      },
    )

    const shoes = craftable(200, {
      name: 'Shoes',
      job: SHOEMAKER,
      recipe: [[2, 1]],
    })
    const rows = rankRecommendations(
      [RING, shoes],
      watched,
      filters({ jobId: JEWELLER }),
      DEFAULT_SORT,
      NOW,
    )

    expect(rows.map((row) => row.item.name)).toEqual(['Ring'])
    expect(read).not.toContain(shoes.id)
    expect(read).not.toContain(2)
  })

  it('never shows an item without a job, whatever the filters', () => {
    const gathered = { ...RING, id: 300, name: 'Gathered', job: undefined }

    expect(rank([gathered], book({ 1: { 1: 100 }, 300: { 1: 200 } }))).toEqual(
      [],
    )
  })

  it('keeps only recipes inside the craft-level range', () => {
    const low = craftable(100, { name: 'Low', craftLevel: 20 })
    const high = craftable(200, { name: 'High', craftLevel: 120 })

    const rows = rank([low, high], {}, { minLevel: 40, maxLevel: 140 })

    expect(rows.map((row) => row.item.name)).toEqual(['High'])
  })

  it('hides missing-inputs rows when the backlog is toggled off', () => {
    const rows = rank([RING], {}, { hideIncomplete: true })

    expect(rows).toEqual([])
  })

  describe('sorting', () => {
    const priced = book({
      1: { 1: 100 },
      100: { 1: 200 },
      2: { 1: 10_000 },
      200: { 1: 12_000 },
    })

    function names(key: SortKey, direction: RecommendationSort['direction']) {
      return rank([AMULET, RING], priced, {}, { key, direction }).map(
        (row) => row.item.name,
      )
    }

    it('turns every column around', () => {
      expect(names('margin', 'desc')).toEqual(['Ring', 'Amulet'])
      expect(names('margin', 'asc')).toEqual(['Amulet', 'Ring'])
      expect(names('craftCost', 'desc')).toEqual(['Amulet', 'Ring'])
      expect(names('netPerUnit', 'desc')).toEqual(['Amulet', 'Ring'])
      expect(names('name', 'asc')).toEqual(['Amulet', 'Ring'])
      expect(names('name', 'desc')).toEqual(['Ring', 'Amulet'])
    })

    it('keeps the states apart, whatever the column', () => {
      const missing = craftable(300, { name: 'Aaa missing', recipe: [[9, 1]] })
      const rows = rank(
        [missing, AMULET, RING],
        priced,
        {},
        {
          key: 'name',
          direction: 'asc',
        },
      )

      // The unpriceable row sorts first by name, and still lands last.
      expect(rows.map((row) => row.item.name)).toEqual([
        'Amulet',
        'Ring',
        'Aaa missing',
      ])
    })

    it('sinks a row with no figure in the sorted column', () => {
      const unpriced = craftable(300, { name: 'Aaa', recipe: [[1, 1]] })
      const rows = rank(
        [unpriced, RING],
        priced,
        {},
        {
          key: 'craftCost',
          direction: 'asc',
        },
      )

      // Both rank; only the ring has a sale price, so only it has a craft cost to beat.
      expect(rows.map((row) => row.item.name)).toEqual(['Ring', 'Aaa'])
    })
  })
})
