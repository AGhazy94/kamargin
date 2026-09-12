// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { OcrReading } from '../../types'
import { useOcrQueue } from '../use-ocr-queue'

const mocks = vi.hoisted(() => ({
  createWorker: vi.fn(),
  readScreenshot: vi.fn(),
  terminate: vi.fn(),
}))
vi.mock('../../utils/ocr', () => ({ createOcrWorker: mocks.createWorker }))
vi.mock('../../utils/read-screenshot', () => ({
  readScreenshot: mocks.readScreenshot,
}))

const reading: OcrReading = {
  parsed: { isMarketDialog: false, tiers: {} },
  location: {
    crop: { left: 0, top: 0, width: 20, height: 20 },
    confident: false,
  },
  width: 20,
  height: 20,
}
const files = ['first.png', 'second.png'].map((name) => ({
  file: new File(['image'], name, { type: 'image/png' }),
}))

function deferred<Value>() {
  let resolve!: (value: Value) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<Value>((onResolve, onReject) => {
    resolve = onResolve
    reject = onReject
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.terminate.mockResolvedValue(undefined)
  mocks.createWorker.mockResolvedValue({ terminate: mocks.terminate })
  mocks.readScreenshot.mockResolvedValue(reading)
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn((file: File) => `blob:${file.name}`),
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  })
})
afterEach(cleanup)

describe('useOcrQueue', () => {
  it('does not initialize the engine before an image is queued', () => {
    const { result } = renderHook(() => useOcrQueue([]))
    expect(result.current.jobs).toEqual([])
    expect(mocks.createWorker).not.toHaveBeenCalled()
  })

  it('processes one image at a time and streams completed results', async () => {
    const first = deferred<OcrReading>()
    const second = deferred<OcrReading>()
    mocks.readScreenshot
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    const { result } = renderHook(() => useOcrQueue([]), {
      wrapper: StrictMode,
    })
    act(() => result.current.enqueue(files))
    await waitFor(() => expect(mocks.readScreenshot).toHaveBeenCalledTimes(1))
    expect(result.current.jobs.map((job) => job.status)).toEqual([
      'reading',
      'queued',
    ])
    await act(async () => first.resolve(reading))
    await waitFor(() => expect(mocks.readScreenshot).toHaveBeenCalledTimes(2))
    expect(result.current.jobs.map((job) => job.status)).toEqual([
      'ready',
      'reading',
    ])
    await act(async () => second.resolve(reading))
    expect(result.current.jobs.map((job) => job.status)).toEqual([
      'ready',
      'ready',
    ])
    expect(mocks.createWorker).toHaveBeenCalledTimes(1)
  })

  it('cancels an unresolved read and continues with a fresh worker', async () => {
    const first = deferred<OcrReading>()
    mocks.readScreenshot.mockReturnValueOnce(first.promise)
    const { result } = renderHook(() => useOcrQueue([]))
    act(() => result.current.enqueue(files))
    await waitFor(() => expect(mocks.readScreenshot).toHaveBeenCalledTimes(1))
    act(() => result.current.cancel(result.current.jobs[0].id))
    await waitFor(() => expect(result.current.jobs[1].status).toBe('ready'))
    expect(result.current.jobs[0].status).toBe('cancelled')
    expect(mocks.terminate).toHaveBeenCalledTimes(1)
    expect(mocks.createWorker).toHaveBeenCalledTimes(2)
    await act(async () => first.resolve(reading))
    expect(result.current.jobs[0].status).toBe('cancelled')
  })

  it('removes a queued image without reading it and releases its URL', async () => {
    const first = deferred<OcrReading>()
    mocks.readScreenshot.mockReturnValueOnce(first.promise)
    const { result } = renderHook(() => useOcrQueue([]))
    act(() => result.current.enqueue(files))
    act(() => result.current.remove(result.current.jobs[1].id))
    await act(async () => first.resolve(reading))
    await waitFor(() => expect(result.current.jobs[0].status).toBe('ready'))
    expect(mocks.readScreenshot).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:second.png')
  })

  it('reports a failure without blocking other images and allows retry', async () => {
    mocks.readScreenshot.mockRejectedValueOnce(new Error('Unreadable image'))
    const { result } = renderHook(() => useOcrQueue([]))
    act(() => result.current.enqueue(files))
    await waitFor(() => expect(result.current.jobs[1].status).toBe('ready'))
    expect(result.current.jobs[0].error).toBe('Unreadable image')
    act(() => result.current.retry(result.current.jobs[0].id))
    await waitFor(() => expect(result.current.jobs[0].status).toBe('ready'))
    expect(result.current.jobs[0].error).toBeUndefined()
  })

  it('updates progress and phase for the active image only', async () => {
    const first = deferred<OcrReading>()
    mocks.readScreenshot.mockReturnValueOnce(first.promise)
    const { result } = renderHook(() => useOcrQueue([]))
    act(() => result.current.enqueue(files))
    await waitFor(() => expect(mocks.readScreenshot).toHaveBeenCalledTimes(1))
    act(() => {
      mocks.readScreenshot.mock.calls[0][3]('Reading prices')
      mocks.createWorker.mock.calls[0][0].logger({ progress: 0.75 })
    })
    expect(result.current.jobs[0]).toMatchObject({
      phase: 'Reading prices',
      progress: 0.75,
    })
    expect(result.current.jobs[1]).toMatchObject({
      phase: 'Queued',
      progress: 0,
    })
  })

  it('terminates and releases image URLs on unmount even during initialization', async () => {
    const worker = deferred<{ terminate: typeof mocks.terminate }>()
    mocks.createWorker.mockReturnValueOnce(worker.promise)
    const { result, unmount } = renderHook(() => useOcrQueue([]))
    act(() => result.current.enqueue(files))
    await waitFor(() => expect(mocks.createWorker).toHaveBeenCalledTimes(1))
    unmount()
    await act(async () => worker.resolve({ terminate: mocks.terminate }))
    expect(mocks.terminate).toHaveBeenCalledTimes(1)
    expect(mocks.readScreenshot).not.toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2)
  })
})
