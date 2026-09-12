import { useCallback, useSyncExternalStore } from 'react'

type Listener = () => void

const listeners = new Map<string, Set<Listener>>()

// useSyncExternalStore compares snapshots by identity, so parsed values persist.
const snapshots = new Map<string, { raw: string | null; value: unknown }>()

function notify(key: string) {
  for (const listener of listeners.get(key) ?? []) listener()
}

function subscribe(key: string, listener: Listener) {
  const forKey = listeners.get(key) ?? new Set<Listener>()
  forKey.add(listener)
  listeners.set(key, forKey)

  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === key) listener()
  }
  window.addEventListener('storage', onStorage)

  return () => {
    forKey.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function readStored<T>(key: string, fallback: T): T {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(key)
  } catch {
    return fallback
  }

  const cached = snapshots.get(key)
  if (cached && cached.raw === raw) return cached.value as T

  let value = fallback
  if (raw !== null) {
    try {
      value = JSON.parse(raw) as T
    } catch {
      value = fallback
    }
  }

  snapshots.set(key, { raw, value })
  return value
}

export function writeStored<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // A full or blocked store must not break the calculation in progress.
  }
  notify(key)
}

export function useLocalStorage<T>(key: string, fallback: T) {
  const value = useSyncExternalStore(
    useCallback((listener: Listener) => subscribe(key, listener), [key]),
    () => readStored(key, fallback),
  )

  const setValue = useCallback(
    (next: T | ((current: T) => T)) => {
      const resolved =
        typeof next === 'function'
          ? (next as (current: T) => T)(readStored(key, fallback))
          : next
      writeStored(key, resolved)
    },
    [key, fallback],
  )

  return [value, setValue] as const
}
