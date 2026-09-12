import type { ReactNode } from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

function parse(raw: string): number | undefined {
  const digits = raw.replace(/[^\d]/g, '')
  return digits === '' ? undefined : Number(digits)
}

export function PriceInput({
  id,
  value,
  onChange,
  label,
  placeholder = '0',
  reference,
  className,
}: {
  id?: string
  value?: number
  onChange: (value: number | undefined) => void
  label: string
  placeholder?: string
  /** Passing the prop reserves the trailing slot, so filling it later shifts nothing. */
  reference?: ReactNode
  className?: string
}) {
  const hasSlot = reference !== undefined

  return (
    <div className={cn('relative', className)}>
      <Input
        id={id}
        aria-label={label}
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={value === undefined ? '' : String(value)}
        onChange={(event) => onChange(parse(event.target.value))}
        className={cn('text-right tabular-nums', hasSlot && 'pr-12')}
      />
      {hasSlot && (
        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex w-9 items-center justify-end text-muted-foreground text-xs">
          {reference}
        </span>
      )}
    </div>
  )
}
