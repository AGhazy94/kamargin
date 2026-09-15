import type { SeenMark } from './new-screenshots'

const DB_NAME = 'kamargin-screenshot-watch'
const STORE = 'folder'
const KEY = 'screenshots'

/** A directory handle is structured-cloneable but not JSON, so this cannot live in localStorage. */
export type WatchedFolder = {
  handle: FileSystemDirectoryHandle
  seen: SeenMark
}

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error('IndexedDB failed'))
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode)
      const request = run(transaction.objectStore(STORE))
      transaction.oncomplete = () => resolve(request.result)
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('IndexedDB transaction aborted'))
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('IndexedDB transaction failed'))
    })
  } finally {
    db.close()
  }
}

export async function readWatchedFolder() {
  try {
    const stored = await withStore('readonly', (store) => store.get(KEY))
    const folder = stored as Partial<WatchedFolder> | undefined
    if (!folder?.handle || typeof folder.seen?.at !== 'number') return undefined
    return {
      handle: folder.handle,
      seen: { at: folder.seen.at, names: folder.seen.names ?? [] },
    }
  } catch {
    return undefined
  }
}

export async function writeWatchedFolder(folder: WatchedFolder) {
  try {
    await withStore('readwrite', (store) => store.put(folder, KEY))
  } catch {
    // Watching still works for this tab; only its memory across reloads is lost.
  }
}

export async function clearWatchedFolder() {
  try {
    await withStore('readwrite', (store) => store.delete(KEY))
  } catch {
    // Nothing to recover: the caller has already stopped watching in memory.
  }
}
