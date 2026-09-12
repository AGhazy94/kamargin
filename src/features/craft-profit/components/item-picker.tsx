import { SearchIcon } from 'lucide-react'
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
import { searchItems } from '@/lib/game-data'
import type { Item } from '@/types/game'

export function ItemPicker({ onSelect }: { onSelect: (item: Item) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const results = useMemo(() => searchItems(query), [query])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className="h-10 w-full justify-start gap-2 text-muted-foreground"
          >
            <SearchIcon className="size-4" />
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
            value={query}
            onValueChange={setQuery}
            placeholder="Search for an item…"
          />
          <CommandList>
            {results.length === 0 && (
              <CommandEmpty>
                {query.trim() ? 'No item matches.' : 'Type to search.'}
              </CommandEmpty>
            )}
            {results.map((item) => (
              <CommandItem
                key={item.id}
                value={String(item.id)}
                onSelect={() => {
                  onSelect(item)
                  setOpen(false)
                  setQuery('')
                }}
              >
                <img
                  src={item.iconUrl}
                  alt=""
                  className="size-6 shrink-0 rounded-sm"
                />
                <span className="flex-1 truncate">{item.name}</span>
                <span className="text-muted-foreground text-xs">
                  {item.type} · lvl {item.level}
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
