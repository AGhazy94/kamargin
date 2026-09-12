// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { StrictMode } from 'react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SERVERS } from '@/config/servers'
import { getItem } from '@/lib/game-data'
import { readPriceBook, writeTierPrice } from '@/stores/price-book'
import type { Snapshot } from '@/types/saved'
import { formatKamas } from '@/utils/format'
import { AppProvider } from '../provider'
import { AppRouter } from '../router'

const ITEM = getItem(910)
const OTHER_SERVER = SERVERS.find((server) => server.id !== 355)
if (!ITEM?.recipe || !OTHER_SERVER)
  throw new Error('Bundled test data is missing')

const CRAFT_COST = ITEM.recipe.reduce(
  (total, ingredient) => total + ingredient.quantity * 100,
  0,
)
const SNAPSHOT: Snapshot = {
  id: 'latest-snapshot',
  itemId: ITEM.id,
  itemName: ITEM.name,
  label: 'Latest quote',
  takenAt: 1_700_000_000_000,
  prices: {
    ...Object.fromEntries(
      ITEM.recipe.map(({ itemId }) => [itemId, { 1: 100 }]),
    ),
    [ITEM.id]: { 1: 2000 },
  },
  figures: {
    craftCost: CRAFT_COST,
    breakEven: CRAFT_COST / 0.98,
    bestTier: 1,
    tiers: [
      {
        tier: 1,
        packPrice: 2000,
        netProfit: 1960 - CRAFT_COST,
        perUnit: 1960 - CRAFT_COST,
      },
      { tier: 10 },
      { tier: 100 },
      { tier: 1000 },
    ],
  },
}

function HistoryControls() {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <aside aria-label="Test navigation">
      <output data-testid="location">
        {location.pathname}
        {location.search}
      </output>
      <button type="button" onClick={() => navigate(-1)}>
        Test back
      </button>
      <button type="button" onClick={() => navigate(1)}>
        Test forward
      </button>
    </aside>
  )
}

function openRoute(path: string) {
  return render(
    <StrictMode>
      <AppProvider>
        <MemoryRouter initialEntries={[path]}>
          <AppRouter />
          <HistoryControls />
        </MemoryRouter>
      </AppProvider>
    </StrictMode>,
  )
}

beforeEach(() => {
  localStorage.clear()
  Object.defineProperty(Element.prototype, 'getAnimations', {
    configurable: true,
    value: () => [],
  })
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    },
  )
  localStorage.setItem('serverId', '355')
  localStorage.setItem(
    'watchlist:355',
    JSON.stringify([{ itemId: ITEM.id, addedAt: SNAPSHOT.takenAt }]),
  )
  localStorage.setItem(
    'snapshots:355',
    JSON.stringify([
      SNAPSHOT,
      {
        ...SNAPSHOT,
        id: 'older-snapshot',
        label: 'Older quote',
        takenAt: SNAPSHOT.takenAt - 1000,
      },
      {
        ...SNAPSHOT,
        id: 'other-item',
        itemId: 911,
        itemName: 'Another item',
        label: 'Unrelated quote',
      },
    ]),
  )
  localStorage.setItem(
    `snapshots:${OTHER_SERVER.id}`,
    JSON.stringify([{ ...SNAPSHOT, label: 'Other server quote' }]),
  )
  for (const itemId of Object.keys(SNAPSHOT.prices))
    writeTierPrice(355, Number(itemId), 1, 100)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('application navigation', () => {
  it('preserves the selected item and last edit across navigation and history', async () => {
    openRoute('/calculator?server=355&item=910')
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Sale price, pack of 1' }),
      { target: { value: '12000' } },
    )
    fireEvent.click(screen.getByRole('link', { name: 'Watchlist' }))
    await screen.findByRole('heading', { name: /Watchlist/ })
    expect(readPriceBook(355)[ITEM.id].tiers[1]?.packPrice).toBe(12_000)
    expect(
      screen.getByRole('link', { name: 'Calculator' }).getAttribute('href'),
    ).toBe('/calculator?server=355&item=910')

    fireEvent.click(screen.getByRole('button', { name: 'Test back' }))
    await screen.findByRole('textbox', { name: 'Sale price, pack of 1' })
    expect(
      (
        screen.getByRole('textbox', {
          name: 'Sale price, pack of 1',
        }) as HTMLInputElement
      ).value,
    ).toBe('12,000')
    fireEvent.click(screen.getByRole('button', { name: 'Test forward' }))
    await screen.findByRole('heading', { name: /Watchlist/ })
  })

  it('restores snapshot search context after visiting a detail route', async () => {
    openRoute('/snapshots?server=355&q=latest')
    fireEvent.click(
      screen.getByRole('button', { name: /^Open snapshot Latest quote/ }),
    )
    await screen.findByRole('heading', { name: 'Latest quote' })
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await screen.findByRole('searchbox', { name: 'Search snapshots' })
    expect(
      (
        screen.getByRole('searchbox', {
          name: 'Search snapshots',
        }) as HTMLInputElement
      ).value,
    ).toBe('latest')
    expect(
      screen.queryByRole('button', { name: /^Open snapshot Older quote/ }),
    ).toBeNull()
  })

  it('opens a frozen snapshot item with current prices without restoring', async () => {
    openRoute('/snapshots/latest-snapshot?server=355')
    fireEvent.click(screen.getByRole('button', { name: 'Open item' }))
    await screen.findByRole('textbox', { name: 'Sale price, pack of 1' })
    expect(readPriceBook(355)[ITEM.id].tiers[1]?.packPrice).toBe(100)
  })

  it('handles unavailable items and snapshot IDs without loading another record', async () => {
    const view = openRoute('/calculator?server=355&item=99999999')
    await screen.findByRole('heading', { name: 'Item unavailable' })
    view.unmount()
    openRoute('/snapshots/missing-record?server=355')
    await screen.findByRole('heading', { name: 'Snapshot unavailable' })
    expect(screen.queryByRole('button', { name: 'Restore prices' })).toBeNull()
  })
})

describe('contextual snapshot history', () => {
  it('shows only the current item, keeps the latest row when collapsed, and links to filtered history', () => {
    openRoute('/calculator?server=355&item=910')
    const history = screen.getByRole('region', { name: 'Snapshot history' })
    expect(within(history).getByRole('heading').textContent).toBe(
      'Snapshot history (2)',
    )
    expect(within(history).queryByText('Unrelated quote')).toBeNull()
    expect(within(history).queryByText('Other server quote')).toBeNull()
    expect(within(history).queryByText('Older quote')).toBeNull()
    expect(
      within(history)
        .getByRole('link', { name: 'View all' })
        .getAttribute('href'),
    ).toBe('/snapshots?server=355&item=910')

    fireEvent.click(
      within(history).getByRole('button', { name: 'Show recent snapshots' }),
    )
    expect(within(history).getByText('Older quote')).toBeTruthy()
    fireEvent.click(
      within(history).getByRole('button', { name: 'Show latest snapshot' }),
    )
    expect(within(history).getByText('Latest quote')).toBeTruthy()
    expect(within(history).queryByText('Older quote')).toBeNull()
  })

  it('hides history with no selected item or matching records', () => {
    const view = openRoute('/calculator?server=355')
    expect(
      screen.queryByRole('region', { name: 'Snapshot history' }),
    ).toBeNull()
    view.unmount()
    localStorage.setItem('snapshots:355', '[]')
    openRoute('/calculator?server=355&item=910')
    expect(
      screen.queryByRole('region', { name: 'Snapshot history' }),
    ).toBeNull()
  })

  it('uses the URL server immediately without showing the previous server history', () => {
    openRoute(`/calculator?server=${OTHER_SERVER.id}&item=910`)
    const history = screen.getByRole('region', { name: 'Snapshot history' })
    expect(within(history).getByText('Other server quote')).toBeTruthy()
    expect(within(history).queryByText('Latest quote')).toBeNull()
    expect(readPriceBook(OTHER_SERVER.id)[ITEM.id]).toBeUndefined()
  })

  it('focuses Close in a preview and requires confirmation before deleting the last match', async () => {
    localStorage.setItem('snapshots:355', JSON.stringify([SNAPSHOT]))
    openRoute('/calculator?server=355&item=910')
    fireEvent.click(
      screen.getByRole('button', { name: /^Open snapshot Latest quote/ }),
    )
    const preview = await screen.findByRole('dialog', { name: 'Latest quote' })
    await waitFor(() =>
      expect(document.activeElement?.textContent).toBe('Close'),
    )
    fireEvent.click(
      within(preview).getByRole('button', { name: 'Delete snapshot' }),
    )
    let confirmation = await screen.findByRole('dialog', {
      name: 'Delete snapshot?',
    })
    await waitFor(() =>
      expect(document.activeElement?.textContent).toBe('Cancel'),
    )
    fireEvent.click(
      within(confirmation).getByRole('button', { name: 'Cancel' }),
    )
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Delete snapshot?' }),
      ).toBeNull(),
    )
    expect(
      JSON.parse(localStorage.getItem('snapshots:355') ?? '[]'),
    ).toHaveLength(1)

    fireEvent.click(
      within(preview).getByRole('button', { name: 'Delete snapshot' }),
    )
    confirmation = await screen.findByRole('dialog', {
      name: 'Delete snapshot?',
    })
    fireEvent.click(
      within(confirmation).getByRole('button', { name: 'Delete snapshot' }),
    )
    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: 'Snapshot history' }),
      ).toBeNull(),
    )
    expect(JSON.parse(localStorage.getItem('snapshots:355') ?? '[]')).toEqual(
      [],
    )
  })

  it('confirms restoration, preserves frozen data, and restores historical tier dates', async () => {
    writeTierPrice(355, ITEM.id, 100, 12_000)
    writeTierPrice(355, 999999, 1, 42)
    const original = localStorage.getItem('snapshots:355')
    openRoute('/snapshots/latest-snapshot?server=355')
    fireEvent.click(screen.getByRole('button', { name: 'Restore prices' }))
    let confirmation = await screen.findByRole('dialog', {
      name: 'Restore snapshot prices?',
    })
    expect(within(confirmation).getByText(/shared price book/)).toBeTruthy()
    await waitFor(() =>
      expect(document.activeElement?.textContent).toBe('Cancel'),
    )
    fireEvent.click(
      within(confirmation).getByRole('button', { name: 'Cancel' }),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(readPriceBook(355)[ITEM.id].tiers[1]?.packPrice).toBe(100)

    fireEvent.click(screen.getByRole('button', { name: 'Restore prices' }))
    confirmation = await screen.findByRole('dialog', {
      name: 'Restore snapshot prices?',
    })
    fireEvent.click(
      within(confirmation).getByRole('button', { name: 'Restore prices' }),
    )
    await screen.findByRole('textbox', { name: 'Sale price, pack of 1' })
    expect(readPriceBook(355)[ITEM.id].tiers[1]).toEqual({
      packPrice: 2000,
      capturedAt: SNAPSHOT.takenAt,
    })
    expect(readPriceBook(355)[ITEM.id].tiers[100]).toBeUndefined()
    expect(readPriceBook(355)[999999].tiers[1]?.packPrice).toBe(42)
    expect(localStorage.getItem('snapshots:355')).toBe(original)
  })
})

describe('calculator interaction', () => {
  it('keeps ingredient expanders independent', () => {
    openRoute('/calculator?server=355&item=910')
    const expanders = screen.getAllByRole('button', {
      name: /^Pack prices for /,
    })
    fireEvent.click(expanders[0])
    fireEvent.click(expanders[1])
    expect(expanders[0].getAttribute('aria-expanded')).toBe('true')
    expect(expanders[1].getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(expanders[0])
    expect(expanders[0].getAttribute('aria-expanded')).toBe('false')
    expect(expanders[1].getAttribute('aria-expanded')).toBe('true')
  })

  it('shows the total craft cost for each sell-pack size', () => {
    openRoute('/calculator?server=355&item=910')
    expect(screen.getByLabelText('Craft cost, pack of 1').textContent).toBe(
      formatKamas(CRAFT_COST),
    )
    expect(screen.getByLabelText('Craft cost, pack of 100').textContent).toBe(
      formatKamas(CRAFT_COST * 100),
    )
    expect(screen.getByText('Craft cost / item')).toBeTruthy()
  })
})
