import { CheckIcon } from 'lucide-react'

import { isStale, type PriceEntry } from '@/stores/price-book'
import type { PackTier } from '@/types/game'
import { formatAge, formatKamas, formatTier } from '@/utils/format'
import { cheapestTier, PACK_TIERS, type PackPrices } from '@/utils/pack-tiers'
import { PriceInput } from './price-input'

export function TierPriceRows({
  name,
  packPrices,
  entry,
  onPriceChange,
}: {
  name: string
  packPrices: PackPrices
  entry?: PriceEntry
  onPriceChange: (tier: PackTier, packPrice?: number) => void
}) {
  const winner = cheapestTier(packPrices)

  return (
    <div className="flex flex-col gap-2 py-1">
      {PACK_TIERS.map((tier) => {
        const packPrice = packPrices[tier]
        const price = entry?.tiers[tier]

        return (
          <div
            key={tier}
            className="grid grid-cols-[3rem_minmax(0,11rem)_1fr] items-center gap-3 sm:grid-cols-[3rem_minmax(0,11rem)_6rem_1fr]"
          >
            <span className="text-muted-foreground tabular-nums">
              {formatTier(tier)}
            </span>
            <PriceInput
              label={`${name} — pack of ${tier}`}
              value={packPrice}
              onChange={(value) => onPriceChange(tier, value)}
            />
            <span className="flex items-center gap-1.5 tabular-nums">
              {packPrice === undefined ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                <>
                  <span className="text-muted-foreground">
                    {formatKamas(packPrice / tier)}/u
                  </span>
                  {winner?.tier === tier && (
                    <CheckIcon
                      aria-label="cheapest per unit"
                      className="size-3.5 shrink-0 text-primary"
                    />
                  )}
                </>
              )}
            </span>
            <span className="hidden items-center justify-end gap-1 text-muted-foreground text-xs sm:flex">
              {price && isStale(price) && (
                <span
                  aria-hidden
                  className="size-1.5 rounded-full bg-muted-foreground/60"
                />
              )}
              {price ? formatAge(price.capturedAt) : '—'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
