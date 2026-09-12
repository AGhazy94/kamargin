import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'

export function EmptyState({
  description,
  blockerPanel,
  calculatorHref,
  onReset,
}: {
  description: string
  blockerPanel: ReactNode
  calculatorHref: string
  onReset: () => void
}) {
  return (
    <div className="flex flex-col items-start gap-4 py-8">
      <p className="text-muted-foreground">{description}</p>

      {blockerPanel}

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
