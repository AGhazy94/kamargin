import type { ReactNode } from 'react'

import { ScrollPanel } from '@/components/scroll-panel'
import { Separator } from '@/components/ui/separator'
import type { PackTier } from '@/types/game'
import { formatKamas, formatMargin } from '@/utils/format'
import type { CraftProfit } from '../types'
import { getTier, isThinMargin } from '../utils/profit'
import { SellTierTable } from './sell-tier-table'

function Figure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{children}</span>
    </div>
  )
}

function Blank() {
  return <span className="text-muted-foreground">—</span>
}

export function ProfitPanel({
  profit,
  header,
  onSalePriceChange,
}: {
  profit: CraftProfit
  header?: ReactNode
  onSalePriceChange: (tier: PackTier, packPrice?: number) => void
}) {
  const { craftCost, breakEven } = profit
  const best = getTier(profit, profit.bestTier)

  return (
    <ScrollPanel header={header} className="lg:min-h-0 lg:flex-1">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Figure label="Craft cost">
            {craftCost === undefined ? (
              <Blank />
            ) : (
              <span className="text-kama">{formatKamas(craftCost)}/u</span>
            )}
          </Figure>
          <Figure label="Break-even">
            {breakEven === undefined ? (
              <Blank />
            ) : (
              `${formatKamas(breakEven)}/u`
            )}
          </Figure>
        </div>

        <Separator />

        <SellTierTable profit={profit} onPriceChange={onSalePriceChange} />

        <Separator />

        <div className="flex flex-col gap-2 text-muted-foreground text-xs">
          {profit.missingPriceCount > 0 && (
            <p>Enter a price for every ingredient.</p>
          )}
          {isThinMargin(best) && best?.margin !== undefined && (
            <p>
              The best tier's margin is thin ({formatMargin(best.margin)}).
              Under 10% the unsold risk dominates — community consensus, not a
              game rule.
            </p>
          )}
          <p>One selling slot per pack, whatever its size.</p>
          <p>Best case — the fee is paid per listing and never refunded.</p>
        </div>
      </div>
    </ScrollPanel>
  )
}
