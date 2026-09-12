import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { formatKamas, formatMargin } from '@/utils/format'
import type { CraftProfit } from '../types'
import { isThinMargin } from '../utils/profit'
import { PriceInput } from './price-input'

const SALE_PRICE_INPUT_ID = 'sale-price'

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
  salePrice,
  onSalePriceChange,
}: {
  profit: CraftProfit
  salePrice?: number
  onSalePriceChange: (salePrice: number | undefined) => void
}) {
  const { craftCost, fee, netProfit, margin, breakEven } = profit
  const thin = isThinMargin(profit)

  return (
    <Card className="lg:sticky lg:top-20">
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor={SALE_PRICE_INPUT_ID}>Sale price</Label>
            <span className="text-muted-foreground text-xs">per unit</span>
          </div>
          <PriceInput
            id={SALE_PRICE_INPUT_ID}
            label="Sale price per unit"
            value={salePrice}
            onChange={onSalePriceChange}
          />
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <Figure label="Craft cost">
            {craftCost === undefined ? (
              <Blank />
            ) : (
              <span className="text-kama">{formatKamas(craftCost)}</span>
            )}
          </Figure>
          <Figure label="Fee (2%)">
            {fee === undefined ? <Blank /> : formatKamas(fee)}
          </Figure>
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-muted-foreground text-sm">Net profit</span>
            <span
              className={cn(
                'font-semibold text-lg tabular-nums',
                netProfit !== undefined && netProfit > 0 && 'text-gain',
                netProfit !== undefined && netProfit < 0 && 'text-loss',
              )}
            >
              {netProfit === undefined ? <Blank /> : formatKamas(netProfit)}
            </span>
          </div>
          <Figure label="Margin">
            {margin === undefined ? (
              <Blank />
            ) : (
              <span className="inline-flex items-center gap-2">
                {formatMargin(margin)}
                {thin && (
                  <Tooltip>
                    <TooltipTrigger
                      render={<Badge variant="outline">thin</Badge>}
                    />
                    <TooltipContent>
                      Under 10% net margin the unsold risk dominates. Community
                      consensus, not a game rule.
                    </TooltipContent>
                  </Tooltip>
                )}
              </span>
            )}
          </Figure>
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <Figure label="Break-even">
            {breakEven === undefined ? (
              <Blank />
            ) : (
              `${formatKamas(breakEven)}/u`
            )}
          </Figure>
          <p className="text-muted-foreground text-xs">
            Best case — the fee is paid per listing and never refunded.
          </p>
        </div>

        {profit.missingPriceCount > 0 && (
          <p className="text-muted-foreground text-xs">
            Enter a price for every ingredient.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
