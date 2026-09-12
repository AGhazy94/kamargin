import { cn } from '@/lib/utils'
import { formatKamas } from '@/utils/format'

export function ProfitSummaryBar({ netProfit }: { netProfit?: number }) {
  return (
    <div className="sticky bottom-0 z-30 -mx-4 border-border border-t bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-muted-foreground text-sm">Net profit</span>
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
