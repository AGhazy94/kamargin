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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'
import { getItems, searchItems } from '@/lib/game-data'
import { readPriceBook, restorePackPrices } from '@/stores/price-book'

import type { OcrJob } from '../../types'
import { matchItem } from '../../utils/match-item'
import { parseDialog } from '../../utils/parse-dialog'
import { fixtureFor } from '../../utils/tests/fixtures'
import { ReviewSheet } from '../review-sheet'

const queue = vi.hoisted(() => ({
  jobs: [] as OcrJob[],
  enqueue: vi.fn(),
  cancel: vi.fn(),
  remove: vi.fn(),
  retry: vi.fn(),
}))
vi.mock('../../hooks/use-ocr-queue', () => ({ useOcrQueue: () => queue }))

const initialFiles = [new File(['image'], 'market.png', { type: 'image/png' })]
const greedo = searchItems('Greedo Rum')[0]
const kido = searchItems('Kido Beak')[0]

function makeJob(time = '7.07.16', id = 'greedo'): OcrJob {
  const fixture = fixtureFor(time)
  if (!fixture.crop) throw new Error('Expected a market-dialog fixture')
  const parsed = parseDialog(fixture.words)
  if (parsed.level) parsed.level.confidence = 96
  if (parsed.type) parsed.type.confidence = 96
  if (parsed.averagePrice) parsed.averagePrice.confidence = 96
  return {
    id,
    file: new File(['image'], `${id}.png`, { type: 'image/png' }),
    sourceUrl: `blob:${id}`,
    status: 'ready',
    progress: 1,
    phase: 'Ready',
    reading: {
      parsed,
      width: fixture.source.width,
      height: fixture.source.height,
      location: { crop: fixture.crop, confident: true },
    },
    match: matchItem(parsed, getItems()),
  }
}

function openSheet(onClose = vi.fn()) {
  return render(
    <StrictMode>
      <TooltipProvider>
        <ReviewSheet
          serverId={355}
          initialFiles={initialFiles}
          onClose={onClose}
        />
      </TooltipProvider>
    </StrictMode>,
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  queue.jobs = [makeJob()]
  Object.defineProperty(Element.prototype, 'getAnimations', {
    configurable: true,
    value: () => [],
  })
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  })
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    },
  )
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
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ReviewSheet', () => {
  it('queues the original files only once under StrictMode', async () => {
    openSheet()
    await waitFor(() => expect(queue.enqueue).toHaveBeenCalledTimes(1))
    expect(queue.enqueue).toHaveBeenCalledWith(initialFiles)
  })

  it('keeps OCR results and edits out of storage until confirmation, then supports undo', async () => {
    restorePackPrices(355, { [greedo.id]: { 1000: 100000 } }, 123)
    const previous = readPriceBook(355)[greedo.id]
    openSheet()
    const input = screen.getByLabelText(
      'Greedo Rum pack 1 price',
    ) as HTMLInputElement
    expect(input.value).toBe('1,482')
    fireEvent.change(input, { target: { value: '1 600' } })
    expect(input.value).toBe('1,600')
    expect(readPriceBook(355)[greedo.id]).toEqual(previous)
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(readPriceBook(355)[greedo.id].tiers[1]?.packPrice).toBe(1600)
    expect(screen.getByLabelText('Greedo Rum import receipt')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(readPriceBook(355)[greedo.id]).toEqual(previous)
    await waitFor(() =>
      expect(screen.getByLabelText('Greedo Rum pack 1 price')).toBeTruthy(),
    )
  })

  it('confirms only eligible cards in a mixed batch', () => {
    const flagged = makeJob('7.07.41', 'kido')
    const price = flagged.reading?.parsed.tiers[1000]
    if (!price) throw new Error('Expected the pack-1000 fixture price')
    price.confidence = 12
    queue.jobs = [makeJob(), flagged]
    openSheet()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm all 1' }))
    expect(readPriceBook(355)[greedo.id].tiers[1]?.packPrice).toBe(1482)
    expect(readPriceBook(355)[kido.id]).toBeUndefined()
    expect(
      screen
        .getByLabelText('Kido Beak pack 1000 price')
        .getAttribute('aria-invalid'),
    ).toBe('true')
    expect(
      screen
        .getByRole('button', { name: 'Confirm all 0' })
        .hasAttribute('disabled'),
    ).toBe(true)
  })

  it('lets the player resolve an unmatched item without losing prices', async () => {
    queue.jobs[0].match = {
      candidates: [{ item: greedo, distance: 1, score: 1 }],
      confident: false,
    }
    openSheet()
    expect(
      screen.getByRole('button', { name: 'Confirm' }).hasAttribute('disabled'),
    ).toBe(true)
    fireEvent.click(screen.getByRole('combobox', { name: 'Choose item' }))
    fireEvent.click(await screen.findByRole('option', { name: /Greedo Rum/ }))
    expect(
      (screen.getByLabelText('Greedo Rum pack 10 price') as HTMLInputElement)
        .value,
    ).toBe('23,998')
    expect(
      screen.getByRole('button', { name: 'Confirm' }).hasAttribute('disabled'),
    ).toBe(false)
  })

  it('allows explicit confirmation of flagged fields', () => {
    const price = queue.jobs[0].reading?.parsed.tiers[100]
    if (!price) throw new Error('Expected the pack-100 fixture price')
    price.confidence = 10
    openSheet()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(readPriceBook(355)[greedo.id].tiers[100]?.packPrice).toBe(155550)
  })

  it('offers retry and manual inputs when the worker fails', () => {
    queue.jobs = [
      {
        ...makeJob(),
        status: 'error',
        error: 'Worker unavailable',
        reading: undefined,
        match: undefined,
      },
    ]
    openSheet()
    expect(screen.getByRole('alert').textContent).toContain(
      'Worker unavailable',
    )
    expect(screen.getAllByRole('textbox')).toHaveLength(4)
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(queue.retry).toHaveBeenCalledWith('greedo')
  })

  it('enlarges the original screenshot and offers full-resolution zoom', async () => {
    openSheet()
    fireEvent.click(screen.getByRole('button', { name: 'Enlarge screenshot' }))
    const preview = await screen.findByRole('dialog', {
      name: 'Source screenshot',
    })
    expect(
      within(preview)
        .getByAltText('Full original screenshot')
        .getAttribute('src'),
    ).toBe('blob:greedo')
    fireEvent.click(
      within(preview).getByRole('button', { name: 'Original size' }),
    )
    expect(
      within(preview).getByRole('button', { name: 'Fit image' }),
    ).toBeTruthy()
  })

  it('discards or dismisses drafts without saving them', () => {
    const onClose = vi.fn()
    openSheet(onClose)
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(queue.remove).toHaveBeenCalledWith('greedo')
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(readPriceBook(355)[greedo.id]).toBeUndefined()
  })
})
