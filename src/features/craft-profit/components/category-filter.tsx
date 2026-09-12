import { ChevronDownIcon, XIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { getItemTypes } from '@/lib/game-data'
import { cn } from '@/lib/utils'

export function CategoryFilter({
  value,
  onChange,
}: {
  value: string | null
  onChange: (type: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const types = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return needle
      ? getItemTypes().filter((type) => type.toLowerCase().includes(needle))
      : getItemTypes()
  }, [query])

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className={cn(
                'h-12 justify-between gap-2 sm:w-56',
                !value && 'text-muted-foreground',
              )}
            >
              <span className="truncate">{value ?? 'All categories'}</span>
              <ChevronDownIcon className="size-4 shrink-0 opacity-60" />
            </Button>
          }
        />
        <PopoverContent align="start" className="w-64 p-0">
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Filter categories…"
            />
            <CommandList>
              {types.length === 0 && <CommandEmpty>No category.</CommandEmpty>}
              {types.map((type) => (
                <CommandItem
                  key={type}
                  value={type}
                  data-checked={type === value}
                  onSelect={() => {
                    onChange(type === value ? null : type)
                    setOpen(false)
                    setQuery('')
                  }}
                >
                  {type}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Clear category filter"
          onClick={() => onChange(null)}
        >
          <XIcon className="size-4" />
        </Button>
      )}
    </div>
  )
}
