import { cn } from '@/lib/utils'
import type { CraftProfit } from '@/types/profit'
import { formatKamas, formatTier } from '@/utils/format'
import { getTier } from '@/utils/profit'

export function ProfitSummaryBar({ profit }: { profit: CraftProfit }) {
  const best = getTier(profit, profit.bestTier)
  const netProfit = best?.netProfit

  return (
    <section
      aria-label="Net profit summary"
      className="fixed inset-x-0 bottom-0 z-30 border-border border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="mx-auto flex max-w-app items-baseline justify-between gap-4 px-4 py-4 sm:px-8">
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
    </section>
  )
}
