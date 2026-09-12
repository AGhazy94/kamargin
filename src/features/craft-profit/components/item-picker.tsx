import { SearchIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ItemIcon } from '@/components/item-icon'
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
import { searchItems } from '@/lib/game-data'
import type { Item } from '@/types/game'
import { CategoryFilter } from './category-filter'

export function ItemPicker({ onSelect }: { onSelect: (item: Item) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [type, setType] = useState<string | null>(null)

  const results = useMemo(
    () => searchItems(query, type ?? undefined),
    [query, type],
  )

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <CategoryFilter value={type} onChange={setType} />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className="h-12 w-full shrink-0 justify-start gap-2.5 text-muted-foreground sm:flex-1"
            >
              <SearchIcon className="size-4.5" />
              Search for an item…
            </Button>
          }
        />
        <PopoverContent
          align="start"
          className="w-(--anchor-width) p-0"
          aria-label="Item search"
        >
          <Command shouldFilter={false}>
            <CommandInput
              aria-label="Item search query"
              value={query}
              onValueChange={setQuery}
              placeholder="Search for an item…"
            />
            <CommandList className="max-h-96">
              {results.length === 0 && (
                <CommandEmpty>
                  {query.trim() || type
                    ? 'No item matches.'
                    : 'Type to search, or pick a category.'}
                </CommandEmpty>
              )}
              {results.map((item) => (
                <CommandItem
                  key={item.id}
                  value={String(item.id)}
                  showCheck={false}
                  className="gap-3 py-2 text-base"
                  onSelect={() => {
                    onSelect(item)
                    setOpen(false)
                    setQuery('')
                  }}
                >
                  <ItemIcon item={item} className="size-10 rounded-sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {item.name}
                    </span>
                    <span className="block text-muted-foreground text-xs">
                      {item.type} · level {item.level}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
