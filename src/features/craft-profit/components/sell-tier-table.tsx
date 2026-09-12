import { ArrowUpIcon } from 'lucide-react'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { PackTier } from '@/types/game'
import { formatCompactKamas, formatKamas, formatTier } from '@/utils/format'
import type { CraftProfit } from '../types'
import { PriceInput } from './price-input'

const COLUMNS = 'grid grid-cols-[2.5rem_minmax(0,1fr)_4.25rem_4.25rem] gap-2'

function Net({ value }: { value?: number }) {
  return (
    <span
      className={cn(
        'text-right tabular-nums',
        value === undefined && 'text-muted-foreground',
        value !== undefined && value > 0 && 'text-gain',
        value !== undefined && value < 0 && 'text-loss',
      )}
    >
      {value === undefined ? '—' : formatCompactKamas(value)}
    </span>
  )
}

export function SellTierTable({
  profit,
  onPriceChange,
}: {
  profit: CraftProfit
  onPriceChange: (tier: PackTier, packPrice?: number) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className={cn(COLUMNS, 'text-muted-foreground text-xs')}>
        <span>Pack</span>
        <span className="text-right">Pack price</span>
        <span className="text-right">Net / pack</span>
        <span className="text-right">Net / unit</span>
      </div>

      {profit.tiers.map((tier) => {
        const best = profit.bestTier === tier.tier

        return (
          <div
            key={tier.tier}
            className={cn(COLUMNS, 'items-center', best && 'font-semibold')}
          >
            <Tooltip>
              <TooltipTrigger
                render={
                  <span
                    className={cn(
                      'flex items-center gap-1 tabular-nums',
                      !best && 'text-muted-foreground',
                    )}
                  >
                    {formatTier(tier.tier)}
                    {best && <ArrowUpIcon className="size-3.5 shrink-0" />}
                  </span>
                }
              />
              <TooltipContent>
                Listing a pack of {tier.tier} means crafting {tier.tier}.
              </TooltipContent>
            </Tooltip>

            <PriceInput
              label={`Sale price, pack of ${tier.tier}`}
              value={tier.packPrice}
              onChange={(packPrice) => onPriceChange(tier.tier, packPrice)}
              className="font-normal"
            />

            <Net value={tier.netProfit} />
            <Net value={tier.perUnit} />
            <div className="col-span-4 flex items-baseline justify-between gap-3 font-normal text-muted-foreground text-xs">
              <span>Craft cost / pack</span>
              <output
                className="tabular-nums"
                aria-label={`Craft cost, pack of ${tier.tier}`}
                aria-live="off"
              >
                {profit.craftCost === undefined
                  ? '—'
                  : formatKamas(profit.craftCost * tier.tier)}
              </output>
            </div>
          </div>
        )
      })}
    </div>
  )
}
