import { useState } from 'react'

import { cn } from '@/lib/utils'
import type { Item } from '@/types/game'

/**
 * The only runtime network call the app makes, and the only place its failure is handled:
 * icons are fetched lazily from the Dofus CDN and fall back to the item's initial offline.
 */
export function ItemIcon({
  item,
  className,
}: {
  item: Item | undefined
  className?: string
}) {
  const [settled, setSettled] = useState<{ url: string; ok: boolean } | null>(
    null,
  )
  const url = item?.iconUrl
  const state =
    url === undefined
      ? 'failed'
      : settled?.url === url
        ? settled.ok
          ? 'ready'
          : 'failed'
        : 'loading'

  return (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-md',
        className,
      )}
    >
      {state !== 'ready' && (
        <span
          aria-hidden
          className={cn(
            'absolute inset-0 flex items-center justify-center bg-muted font-medium text-[0.7em] text-muted-foreground uppercase',
            state === 'loading' && 'animate-pulse',
          )}
        >
          {state === 'failed' && item?.name.slice(0, 1)}
        </span>
      )}
      {url !== undefined && (
        <img
          src={url}
          alt=""
          width={64}
          height={64}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setSettled({ url, ok: true })}
          onError={() => setSettled({ url, ok: false })}
          className={cn(
            'size-full object-contain',
            state !== 'ready' && 'opacity-0',
          )}
        />
      )}
    </span>
  )
}
