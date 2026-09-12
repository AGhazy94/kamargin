import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Item } from '@/types/game'
import type { NewSnapshot, SnapshotFigures } from '@/types/saved'
import type { PackPriceMap } from '../hooks/use-pack-prices'
import type { CraftProfit } from '../types'

const LABEL_INPUT_ID = 'snapshot-label'

export function toSnapshotFigures(profit: CraftProfit): SnapshotFigures {
  return {
    craftCost: profit.craftCost,
    breakEven: profit.breakEven,
    bestTier: profit.bestTier,
    tiers: profit.tiers.map(({ tier, packPrice, netProfit, perUnit }) => ({
      tier,
      packPrice,
      netProfit,
      perUnit,
    })),
  }
}

function defaultLabel(item: Item): string {
  const date = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
  return `${item.name} · ${date}`
}

export function SnapshotDialog({
  item,
  profit,
  prices,
  onTake,
}: {
  item: Item
  profit: CraftProfit
  prices: PackPriceMap
  onTake: (snapshot: NewSnapshot) => void
}) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')

  const take = () => {
    onTake({
      itemId: item.id,
      itemName: item.name,
      label: label.trim() || defaultLabel(item),
      prices,
      figures: toSnapshotFigures(profit),
    })
    setOpen(false)
    setLabel('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setLabel(defaultLabel(item))
          setOpen(true)
        }}
      >
        Snapshot
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Take a snapshot</DialogTitle>
          <DialogDescription>
            Freezes today's prices and figures for {item.name}. A snapshot never
            recalculates — that is what makes it a record.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor={LABEL_INPUT_ID}>Label</Label>
          <Input
            id={LABEL_INPUT_ID}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
        </div>
        <DialogFooter showCloseButton>
          <Button onClick={take}>Save snapshot</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
