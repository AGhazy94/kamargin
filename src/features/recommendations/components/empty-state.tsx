import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import type { Blocker } from '../types'

/** What to price next is decided by what it would unlock, so a cold list says so. */
export function BlockerHint({ blockers }: { blockers: readonly Blocker[] }) {
  if (blockers.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-heading font-medium text-sm">Price these first</h2>
      <ul className="flex flex-col gap-1 text-sm">
        {blockers.map((blocker) => (
          <li key={blocker.itemId} className="text-muted-foreground">
            <span className="text-foreground">{blocker.name}</span> — unlocks{' '}
            <span className="tabular-nums">{blocker.recipeCount}</span>{' '}
            {blocker.recipeCount === 1 ? 'craft' : 'crafts'}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function EmptyState({
  hasPrices,
  blockers,
  calculatorHref,
  onReset,
}: {
  hasPrices: boolean
  blockers: readonly Blocker[]
  calculatorHref: string
  onReset: () => void
}) {
  return (
    <div className="flex flex-col items-start gap-4 py-10">
      <p className="text-muted-foreground">
        {hasPrices
          ? 'Nothing ranks yet — every craft here is still missing an ingredient price.'
          : 'Price a few resources and your crafts will rank here.'}
      </p>

      <BlockerHint blockers={blockers} />

      <div className="flex flex-wrap items-center gap-3">
        <Link
          to={calculatorHref}
          className="text-primary underline underline-offset-4"
        >
          Open calculator
        </Link>
        <Button variant="outline" size="sm" onClick={onReset}>
          Reset filters
        </Button>
      </div>
    </div>
  )
}

export function NoMatches({
  description,
  onReset,
}: {
  description: string
  onReset: () => void
}) {
  return (
    <div className="flex flex-col items-start gap-4 py-10">
      <p className="text-muted-foreground">{description}</p>
      <Button variant="outline" size="sm" onClick={onReset}>
        Reset filters
      </Button>
    </div>
  )
}
