// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  readPriceBook,
  restorePackPrices,
  writeTierPrice,
} from '@/stores/price-book'

import { confirmImport, undoImport } from '../review-import'

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('review imports', () => {
  it('writes only the confirmed item on the captured server', () => {
    restorePackPrices(355, { 10: { 1: 17 }, 11: { 10: 300 } }, 100)
    restorePackPrices(36, { 10: { 1: 55 } }, 200)
    confirmImport(355, 10, { 1: 1482, 10: 23998 })
    expect(readPriceBook(355)[10].tiers[1]?.packPrice).toBe(1482)
    expect(readPriceBook(355)[11].tiers[10]?.packPrice).toBe(300)
    expect(readPriceBook(36)[10].tiers[1]?.packPrice).toBe(55)
  })

  it('undo restores the exact previous tiers and their distinct timestamps', () => {
    vi.spyOn(Date, 'now').mockReturnValue(100)
    writeTierPrice(355, 10, 1, 77)
    vi.spyOn(Date, 'now').mockReturnValue(200)
    writeTierPrice(355, 10, 1000, 45000)
    const before = readPriceBook(355)[10]
    const receipt = confirmImport(355, 10, { 10: 23998 })
    expect(undoImport(receipt)).toBe(true)
    expect(readPriceBook(355)[10]).toEqual(before)
  })

  it('undo removes a newly imported item but preserves later unrelated work', () => {
    const receipt = confirmImport(355, 10, { 1: 1482 })
    writeTierPrice(355, 11, 1, 99)
    expect(undoImport(receipt)).toBe(true)
    expect(readPriceBook(355)[10]).toBeUndefined()
    expect(readPriceBook(355)[11].tiers[1]?.packPrice).toBe(99)
  })

  it('refuses to undo over a newer edit to the same item', () => {
    const receipt = confirmImport(355, 10, { 1: 1482 })
    writeTierPrice(355, 10, 1, 555)
    expect(undoImport(receipt)).toBe(false)
    expect(readPriceBook(355)[10].tiers[1]?.packPrice).toBe(555)
  })

  it('unwinds repeated screenshots for the same item in reverse order', () => {
    const first = confirmImport(355, 10, { 1: 100 })
    const second = confirmImport(355, 10, { 1: 200 })
    expect(undoImport(first)).toBe(false)
    expect(undoImport(second)).toBe(true)
    expect(undoImport(first)).toBe(true)
    expect(readPriceBook(355)[10]).toBeUndefined()
  })

  it.each([
    {},
    { 1: 0 },
    { 1: -1 },
    { 10: Number.NaN },
    { 100: 1.5 },
    { 1: Number.MAX_SAFE_INTEGER + 1 },
  ])('rejects invalid or empty prices without writing', (prices) => {
    expect(() => confirmImport(355, 10, prices)).toThrow('valid pack price')
    expect(readPriceBook(355)[10]).toBeUndefined()
  })
})
