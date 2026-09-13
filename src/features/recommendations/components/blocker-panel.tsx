import { CheckIcon } from 'lucide-react'
import { useState } from 'react'

import { ItemIcon } from '@/components/item-icon'
import { PriceInput } from '@/components/price-input'
import { getItem } from '@/lib/game-data'
import { cn } from '@/lib/utils'
import type { Item } from '@/types/game'
import type { Blocker } from '../types'
import { mergeBlockers } from '../utils/blockers'

function BlockerRow({
  blocker,
  savedPrice,
  onOpen,
  onPrice,
}: {
  blocker: Blocker
  savedPrice?: number
  onOpen: (item: Item) => void
  onPrice: (itemId: number, packPrice: number) => void
}) {
  const [draft, setDraft] = useState<number | undefined>(savedPrice)
  const item = getItem(blocker.itemId)

  const commit = () => {
    if (draft !== undefined && draft > 0 && draft !== savedPrice)
      onPrice(blocker.itemId, draft)
  }

  return (
    <li className="flex flex-wrap items-center gap-3 py-2">
      <ItemIcon item={item} className="size-8" />
      <button
        type="button"
        disabled={!item}
        onClick={() => item && onOpen(item)}
        className="min-w-0 flex-1 rounded-md py-1 text-left outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
      >
        <span className="wrap-anywhere block text-sm">{blocker.name}</span>
        <span className="block text-muted-foreground text-xs">
          unlocks <span className="tabular-nums">{blocker.recipeCount}</span>{' '}
          {blocker.recipeCount === 1 ? 'craft' : 'crafts'}
        </span>
      </button>
      {/* Below sm the field takes its own line rather than squeezing the name. */}
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <PriceInput
          label={`${blocker.name} — pack of 1`}
          placeholder="×1 price"
          value={draft}
          onChange={setDraft}
          onBlur={commit}
          onSubmit={commit}
          className="flex-1 sm:w-32 sm:flex-none"
        />
        <CheckIcon
          aria-label={savedPrice === undefined ? undefined : 'Price saved'}
          className={cn(
            'size-4 shrink-0 text-gain',
            savedPrice === undefined && 'invisible',
          )}
        />
      </div>
    </li>
  )
}

/** What to price next is decided by what it would unlock — so it is priced right here. */
export function BlockerPanel({
  blockers,
  onOpen,
  onPrice,
}: {
  blockers: readonly Blocker[]
  onOpen: (item: Item) => void
  onPrice: (itemId: number, packPrice: number) => void
}) {
  const [priced, setPriced] = useState<Record<number, number>>({})
  const [source, setSource] = useState(blockers)
  const [shown, setShown] = useState(blockers)

  if (source !== blockers) {
    setSource(blockers)
    setShown((current) => mergeBlockers(current, blockers, priced))
  }

  if (shown.length === 0) return null

  return (
    <section
      aria-labelledby="blockers-title"
      className="w-full max-w-xl rounded-lg border bg-muted/20 p-4"
    >
      <h2 id="blockers-title" className="font-heading font-medium text-sm">
        Price these first
      </h2>
      <p className="mt-1 text-muted-foreground text-xs">
        The ingredients holding back the most crafts that could still turn a
        profit. One pack-of-1 price each — Enter saves it.
      </p>
      <ul className="mt-2 flex flex-col divide-y">
        {shown.map((blocker) => (
          <BlockerRow
            key={blocker.itemId}
            blocker={blocker}
            savedPrice={priced[blocker.itemId]}
            onOpen={onOpen}
            onPrice={(itemId, packPrice) => {
              setPriced((current) => ({ ...current, [itemId]: packPrice }))
              onPrice(itemId, packPrice)
            }}
          />
        ))}
      </ul>
    </section>
  )
}
