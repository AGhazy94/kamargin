import { useCallback, useEffect, useRef, useState } from 'react'

import {
  clearWatchedFolder,
  readWatchedFolder,
  writeWatchedFolder,
} from '../utils/folder-handle-store'
import type { SeenMark } from '../utils/new-screenshots'
import { isScreenshotName, markFrom, selectNew } from '../utils/new-screenshots'

/** Long enough to be free on a folder of hundreds, short enough to feel live on a second monitor. */
const SCAN_INTERVAL_MS = 5_000

export type WatchStatus =
  | 'unsupported'
  | 'loading'
  | 'idle'
  | 'watching'
  | 'paused'

export type WatchState = {
  status: WatchStatus
  folderName?: string
  read: number
  /** Older files the most recent scan deliberately left behind. */
  skipped: number
  error?: string
}

export type WatchControls = WatchState & {
  start: () => void
  resume: () => void
  stop: () => void
}

export function isFolderWatchSupported() {
  return (
    typeof window !== 'undefined' &&
    typeof window.showDirectoryPicker === 'function' &&
    typeof indexedDB !== 'undefined'
  )
}

export function useWatchedFolder(
  onFiles: (files: File[]) => void,
): WatchControls {
  const supported = isFolderWatchSupported()
  const [state, setState] = useState<WatchState>(() => ({
    status: supported ? 'loading' : 'unsupported',
    read: 0,
    skipped: 0,
  }))
  const deliver = useRef(onFiles)
  deliver.current = onFiles
  const folder = useRef<{
    handle: FileSystemDirectoryHandle
    seen: SeenMark
  } | null>(null)
  const mounted = useRef(true)
  const scanning = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const patch = useCallback((next: Partial<WatchState>) => {
    if (mounted.current) setState((current) => ({ ...current, ...next }))
  }, [])

  const forget = useCallback(
    (error?: string) => {
      folder.current = null
      void clearWatchedFolder()
      patch({
        status: 'idle',
        folderName: undefined,
        read: 0,
        skipped: 0,
        error,
      })
    },
    [patch],
  )

  const scan = useCallback(async () => {
    const active = folder.current
    if (!active || scanning.current) return
    scanning.current = true
    try {
      const candidates: { name: string; lastModified: number; file: File }[] =
        []
      for await (const entry of active.handle.values()) {
        if (entry.kind !== 'file' || !isScreenshotName(entry.name)) continue
        const file = await entry.getFile()
        candidates.push({
          name: entry.name,
          lastModified: file.lastModified,
          file,
        })
      }

      const { ingest, skipped, next } = selectNew(candidates, active.seen)
      if (!ingest.length) {
        patch({ skipped: 0 })
        return
      }

      active.seen = next
      await writeWatchedFolder({ handle: active.handle, seen: next })
      deliver.current(ingest.map((candidate) => candidate.file))
      setState((current) => ({
        ...current,
        read: current.read + ingest.length,
        skipped,
        error: undefined,
      }))
    } catch (error) {
      const name = error instanceof DOMException ? error.name : ''
      if (name === 'NotAllowedError' || name === 'SecurityError')
        patch({ status: 'paused' })
      else if (name === 'NotFoundError')
        forget('That folder is gone. Pick another one.')
      else patch({ error: 'The folder could not be read.' })
    } finally {
      scanning.current = false
    }
  }, [patch, forget])

  useEffect(() => {
    if (!supported) return
    let cancelled = false
    void (async () => {
      const stored = await readWatchedFolder()
      if (cancelled || !mounted.current) return
      if (!stored) {
        patch({ status: 'idle' })
        return
      }
      folder.current = stored
      // requestPermission needs a gesture, so a lapsed grant can only be offered, not taken.
      const permission =
        (await stored.handle.queryPermission?.({ mode: 'read' })) ?? 'granted'
      if (cancelled || !mounted.current) return
      if (permission === 'denied') {
        forget()
        return
      }
      patch({
        status: permission === 'granted' ? 'watching' : 'paused',
        folderName: stored.handle.name,
      })
      if (permission === 'granted') void scan()
    })()
    return () => {
      cancelled = true
    }
  }, [supported, patch, forget, scan])

  useEffect(() => {
    if (state.status !== 'watching') return
    const whenVisible = () => {
      if (document.visibilityState === 'visible') void scan()
    }
    // The alt-tab back from Dofus is the moment that matters; the timer only covers two screens.
    const timer = setInterval(whenVisible, SCAN_INTERVAL_MS)
    window.addEventListener('focus', whenVisible)
    document.addEventListener('visibilitychange', whenVisible)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', whenVisible)
      document.removeEventListener('visibilitychange', whenVisible)
    }
  }, [state.status, scan])

  const start = useCallback(async () => {
    const pick = window.showDirectoryPicker
    if (!pick) return
    let handle: FileSystemDirectoryHandle
    try {
      handle = await pick.call(window, {
        id: 'kamargin-screenshots',
        mode: 'read',
        // Not 'desktop': Chromium refuses it outright as a system folder, so it is a dead start.
        startIn: 'pictures',
      })
    } catch (error) {
      // Cancelling is not a failure; anything else is, and silence would look like a broken button.
      if (error instanceof DOMException && error.name === 'AbortError') return
      patch({
        error:
          error instanceof Error
            ? `That folder could not be opened — ${error.message}`
            : 'That folder could not be opened.',
      })
      return
    }
    // Starting at "now" is what stops a folder of 400 old screenshots importing itself.
    const seen = markFrom(Date.now())
    folder.current = { handle, seen }
    await writeWatchedFolder({ handle, seen })
    patch({
      status: 'watching',
      folderName: handle.name,
      read: 0,
      skipped: 0,
      error: undefined,
    })
  }, [patch])

  const resume = useCallback(async () => {
    const active = folder.current
    if (!active) return
    const permission = await active.handle.requestPermission?.({ mode: 'read' })
    if (permission !== 'granted') {
      patch({ status: 'paused' })
      return
    }
    patch({ status: 'watching', error: undefined })
    void scan()
  }, [patch, scan])

  const stop = useCallback(() => forget(), [forget])

  return { ...state, start, resume, stop }
}
