import { useCallback } from 'react'

import { DEFAULT_SERVER_ID, SERVERS } from '@/config/servers'
import { useLocalStorage } from '@/hooks/use-local-storage'
import type { Server } from '@/types/game'

const STORAGE_KEY = 'serverId'

export function useServer() {
  const [storedId, setStoredId] = useLocalStorage(
    STORAGE_KEY,
    DEFAULT_SERVER_ID,
  )

  // A regenerated server list must not leave the app on a server that is gone.
  const server: Server =
    SERVERS.find((candidate) => candidate.id === storedId) ??
    SERVERS.find((candidate) => candidate.id === DEFAULT_SERVER_ID) ??
    SERVERS[0]

  const selectServer = useCallback(
    (id: number) => setStoredId(id),
    [setStoredId],
  )

  return { server, serverId: server.id, selectServer }
}
