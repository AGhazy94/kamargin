import { useState } from 'react'

import { PriceInput } from '@/components/price-input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getItem } from '@/lib/game-data'
import type { Recommendation } from '../types'

export function FillPricesDialog({
  row,
  onClose,
  onSave,
}: {
  row: Recommendation | null
  onClose: () => void
  onSave: (prices: Record<number, number>) => void
}) {
  const [entered, setEntered] = useState<Record<number, number | undefined>>({})

  const priced = Object.entries(entered).filter(
    ([, packPrice]) => packPrice !== undefined && packPrice > 0,
  )

  const close = () => {
    setEntered({})
    onClose()
  }

  // Enter saves here as it does in the blocker panel, and nothing is an empty save.
  const submit = () => {
    if (priced.length === 0) return
    onSave(Object.fromEntries(priced) as Record<number, number>)
    close()
  }

  return (
    <Dialog
      open={row !== null}
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Price the missing inputs</DialogTitle>
          <DialogDescription>
            {row?.item.name} — a pack of 1 each. The calculator is where the
            other tiers go.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {row?.missing.map(({ itemId, quantity }) => {
            const name = getItem(itemId)?.name ?? `Item ${itemId}`

            return (
              <div key={itemId} className="flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="wrap-anywhere block text-sm">{name}</span>
                  <span className="block text-muted-foreground text-xs tabular-nums">
                    ×{quantity}
                  </span>
                </span>
                <PriceInput
                  label={`${name} — pack of 1`}
                  placeholder="×1 price"
                  value={entered[itemId]}
                  onChange={(packPrice) =>
                    setEntered((current) => ({
                      ...current,
                      [itemId]: packPrice,
                    }))
                  }
                  onSubmit={submit}
                  className="w-32 shrink-0"
                />
              </div>
            )
          })}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={priced.length === 0}>
            Save prices
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
