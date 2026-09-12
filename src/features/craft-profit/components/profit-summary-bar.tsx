import { cn } from '@/lib/utils'
import { formatKamas, formatTier } from '@/utils/format'
import type { CraftProfit } from '../types'
import { getTier } from '../utils/profit'

export function ProfitSummaryBar({ profit }: { profit: CraftProfit }) {
  const best = getTier(profit, profit.bestTier)
  const netProfit = best?.netProfit

  return (
    <div className="sticky bottom-0 z-30 -mx-4 border-border border-t bg-background/90 px-4 py-4 backdrop-blur sm:-mx-8 sm:px-8 lg:hidden">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-muted-foreground text-sm">
          Net profit
          {best && (
            <span className="ml-1.5 tabular-nums">{formatTier(best.tier)}</span>
          )}
        </span>
        <span
          className={cn(
            'font-semibold tabular-nums',
            netProfit !== undefined && netProfit > 0 && 'text-gain',
            netProfit !== undefined && netProfit < 0 && 'text-loss',
          )}
        >
          {netProfit === undefined ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            formatKamas(netProfit)
          )}
        </span>
      </div>
    </div>
  )
}
