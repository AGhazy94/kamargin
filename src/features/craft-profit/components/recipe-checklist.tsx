import { CheckIcon, ClipboardIcon, ScanTextIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { getItem } from '@/lib/game-data'
import { cn } from '@/lib/utils'
import type { CraftProfit } from '@/types/profit'

export function RecipeChecklist({ profit }: { profit: CraftProfit }) {
  const [copied, setCopied] = useState(false)
  const total = profit.lines.length
  const priced = profit.lines.filter(
    (line) => line.unitPrice !== undefined,
  ).length
  const missing = profit.lines
    .filter((line) => line.unitPrice === undefined)
    .map((line) => getItem(line.itemId)?.name ?? `Item ${line.itemId}`)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  if (!total || !missing.length) return null

  async function copyNames() {
    try {
      await navigator.clipboard.writeText(missing.join('\n'))
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border bg-card px-4 py-3">
      <ScanTextIcon
        aria-hidden
        strokeWidth={1.8}
        className="size-5 shrink-0 text-primary"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="font-medium text-sm tabular-nums">
            {priced} of {total} ingredients priced
          </span>
          <span aria-hidden className="flex gap-0.5">
            {profit.lines.map((line) => (
              <span
                key={line.itemId}
                className={cn(
                  'h-1.5 w-5 rounded-full',
                  line.unitPrice === undefined ? 'bg-muted' : 'bg-primary',
                )}
              />
            ))}
          </span>
        </div>
        <p className="text-muted-foreground text-xs">
          Still to screenshot:{' '}
          <span className="text-foreground">{missing.join(', ')}</span>
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={copyNames}>
        {copied ? <CheckIcon /> : <ClipboardIcon />}
        {copied
          ? 'Copied'
          : `Copy ${missing.length === 1 ? 'name' : 'all names'}`}
      </Button>
    </div>
  )
}
