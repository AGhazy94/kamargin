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
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null)

  if (!item || brokenUrl === item.iconUrl)
    return (
      <span
        aria-hidden
        className={cn(
          'flex shrink-0 items-center justify-center rounded-md bg-muted font-medium text-[0.7em] text-muted-foreground uppercase',
          className,
        )}
      >
        {item?.name.slice(0, 1)}
      </span>
    )

  return (
    <img
      src={item.iconUrl}
      alt=""
      width={64}
      height={64}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setBrokenUrl(item.iconUrl)}
      className={cn('shrink-0', className)}
    />
  )
}
