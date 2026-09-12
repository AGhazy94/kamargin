import { useEffect, useRef, useState } from 'react'
import type { Worker } from 'tesseract.js'

import type { Item } from '@/types/game'

import type { OcrJob } from '../types'
import { matchItem } from '../utils/match-item'

export function useOcrQueue(items: readonly Item[]) {
  const [jobs, setJobs] = useState<OcrJob[]>([])
  const state = useRef({
    jobs: [] as OcrJob[],
    worker: undefined as Promise<Worker> | undefined,
    active: undefined as
      | { id: string; controller: AbortController }
      | undefined,
    running: false,
    mounted: true,
    generation: 0,
  })

  useEffect(() => {
    const current = state.current
    current.mounted = true
    return () => {
      current.mounted = false
      current.generation++
      current.active?.controller.abort()
      void current.worker?.then((worker) => worker.terminate()).catch(() => {})
      current.worker = undefined
      for (const job of current.jobs) URL.revokeObjectURL(job.sourceUrl)
      current.jobs = []
    }
  }, [])

  function update(id: string, patch: Partial<OcrJob>) {
    const current = state.current
    if (!current.mounted) return
    current.jobs = current.jobs.map((job) =>
      job.id === id ? { ...job, ...patch } : job,
    )
    setJobs(current.jobs)
  }

  async function terminateWorker() {
    const current = state.current
    const pending = current.worker
    current.worker = undefined
    await pending?.then((worker) => worker.terminate()).catch(() => {})
  }

  async function pump() {
    const current = state.current
    if (current.running || !current.mounted) return
    current.running = true
    const generation = current.generation
    try {
      while (current.mounted && current.generation === generation) {
        const job = current.jobs.find((entry) => entry.status === 'queued')
        if (!job) break
        const controller = new AbortController()
        current.active = { id: job.id, controller }
        update(job.id, {
          status: 'reading',
          progress: 0,
          phase: 'Loading engine',
        })
        const interrupted = new Promise<never>((_, reject) => {
          controller.signal.addEventListener(
            'abort',
            () =>
              reject(
                controller.signal.reason ??
                  new DOMException('Cancelled', 'AbortError'),
              ),
            { once: true },
          )
        })
        const work = async () => {
          const [{ createOcrWorker }, { readScreenshot }] = await Promise.all([
            import('../utils/ocr'),
            import('../utils/read-screenshot'),
          ])
          controller.signal.throwIfAborted()
          current.worker ??= createOcrWorker({
            logger: ({ progress }) => {
              const active = current.active
              if (active && !active.controller.signal.aborted) {
                update(active.id, {
                  progress: Math.min(1, Math.max(0, progress)),
                })
              }
            },
            errorHandler: (error: unknown) => {
              current.active?.controller.abort(
                new Error(
                  typeof error === 'string' ? error : 'The OCR worker failed.',
                ),
              )
            },
          })
          const worker = await current.worker
          controller.signal.throwIfAborted()
          return readScreenshot(
            worker,
            job.file,
            controller.signal,
            (phase) => {
              if (!controller.signal.aborted)
                update(job.id, { phase, progress: 0 })
            },
          )
        }
        try {
          const reading = await Promise.race([work(), interrupted])
          if (!controller.signal.aborted) {
            update(job.id, {
              status: 'ready',
              progress: 1,
              phase: 'Ready',
              reading,
              match: matchItem(reading.parsed, items),
            })
          }
        } catch (error) {
          const cancelled =
            controller.signal.aborted &&
            controller.signal.reason?.name === 'AbortError'
          if (!cancelled) {
            update(job.id, {
              status: 'error',
              phase: 'Reading failed',
              progress: 0,
              error:
                error instanceof Error
                  ? error.message
                  : 'The screenshot could not be read.',
            })
          }
          await terminateWorker()
        } finally {
          if (current.active?.id === job.id) current.active = undefined
        }
      }
    } finally {
      current.running = false
    }
  }

  function enqueue(files: readonly File[]) {
    const current = state.current
    if (!current.mounted) return
    const additions = files.map(
      (file): OcrJob => ({
        id: crypto.randomUUID(),
        file,
        sourceUrl: URL.createObjectURL(file),
        status: 'queued',
        progress: 0,
        phase: 'Queued',
      }),
    )
    current.jobs = [...current.jobs, ...additions]
    setJobs(current.jobs)
    void pump()
  }

  function cancel(id: string) {
    const job = state.current.jobs.find((entry) => entry.id === id)
    if (!job || (job.status !== 'queued' && job.status !== 'reading')) return
    update(id, { status: 'cancelled', phase: 'Cancelled', progress: 0 })
    const active = state.current.active
    if (active?.id === id) active.controller.abort()
  }

  function remove(id: string) {
    cancel(id)
    const current = state.current
    const job = current.jobs.find((entry) => entry.id === id)
    if (job) URL.revokeObjectURL(job.sourceUrl)
    current.jobs = current.jobs.filter((entry) => entry.id !== id)
    setJobs(current.jobs)
  }

  function retry(id: string) {
    const job = state.current.jobs.find((entry) => entry.id === id)
    if (!job || (job.status !== 'error' && job.status !== 'cancelled')) return
    update(id, {
      status: 'queued',
      phase: 'Queued',
      progress: 0,
      error: undefined,
    })
    void pump()
  }

  return { jobs, enqueue, cancel, remove, retry }
}
