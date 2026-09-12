// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getItem } from '@/lib/game-data'
import { readPriceBook, writeTierPrice } from '@/stores/price-book'
import { usePackPrices } from '../use-pack-prices'

const ITEM = getItem(910)
if (!ITEM) throw new Error('The bundled test item is missing')

beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('usePackPrices', () => {
  it('persists an edit before an immediate unmount', () => {
    const { result, unmount } = renderHook(() => usePackPrices(355, ITEM))

    act(() => result.current.setPrice(ITEM.id, 1, 12_000))
    unmount()

    expect(readPriceBook(355)[ITEM.id].tiers[1]?.packPrice).toBe(12_000)
    const reopened = renderHook(() => usePackPrices(355, ITEM))
    expect(reopened.result.current.prices[ITEM.id][1]).toBe(12_000)
  })

  it('switches server prices without leaking the previous server values', () => {
    const { result, rerender } = renderHook(
      ({ serverId }) => usePackPrices(serverId, ITEM),
      { initialProps: { serverId: 355 } },
    )

    act(() => result.current.setPrice(ITEM.id, 1, 100))
    rerender({ serverId: 356 })
    expect(result.current.prices[ITEM.id][1]).toBeUndefined()

    act(() => result.current.setPrice(ITEM.id, 1, 200))
    expect(readPriceBook(355)[ITEM.id].tiers[1]?.packPrice).toBe(100)
    expect(readPriceBook(356)[ITEM.id].tiers[1]?.packPrice).toBe(200)
  })

  it('clears a tier immediately and reacts to changes from another reader', () => {
    const { result } = renderHook(() => usePackPrices(355, ITEM))

    act(() => writeTierPrice(355, ITEM.id, 100, 50_000))
    expect(result.current.prices[ITEM.id][100]).toBe(50_000)

    act(() => result.current.setPrice(ITEM.id, 100))
    expect(readPriceBook(355)[ITEM.id]).toBeUndefined()
    expect(result.current.prices[ITEM.id][100]).toBeUndefined()
  })

  it('restores the exact tier set without keeping newer extra tiers', () => {
    const { result } = renderHook(() => usePackPrices(355, ITEM))

    act(() => result.current.setPrice(ITEM.id, 100, 50_000))
    act(() =>
      result.current.restorePrices(
        { [ITEM.id]: { 1: 300 } },
        1_700_000_000_000,
      ),
    )

    expect(result.current.prices[ITEM.id]).toEqual({ 1: 300 })
    expect(readPriceBook(355)[ITEM.id].tiers[100]).toBeUndefined()
    expect(readPriceBook(355)[ITEM.id].tiers[1]?.capturedAt).toBe(
      1_700_000_000_000,
    )
  })

  it('keeps edits usable in memory if persistent storage is full', () => {
    const { result, unmount } = renderHook(() => usePackPrices(355, ITEM))
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is full', 'QuotaExceededError')
    })

    act(() => result.current.setPrice(ITEM.id, 1, 125))
    expect(result.current.prices[ITEM.id][1]).toBe(125)
    unmount()

    const reopened = renderHook(() => usePackPrices(355, ITEM))
    expect(reopened.result.current.prices[ITEM.id][1]).toBe(125)
  })
})
