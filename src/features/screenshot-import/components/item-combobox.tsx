import { ChevronsUpDownIcon, SearchIcon } from 'lucide-react'
import { useDeferredValue, useState } from 'react'

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
import { getItem, searchItems } from '@/lib/game-data'
import type { Item } from '@/types/game'

export function ItemCombobox({
  id,
  value,
  candidates,
  onChange,
}: {
  id: string
  value?: number
  candidates: readonly Item[]
  onChange: (item: Item) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const selected = value === undefined ? undefined : getItem(value)
  const results = deferredQuery.trim()
    ? searchItems(deferredQuery)
    : candidates.length
      ? candidates.slice(0, 8)
      : selected
        ? [selected]
        : []

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            aria-controls={`${id}-options`}
            aria-label={
              selected ? `Change item: ${selected.name}` : 'Choose item'
            }
            className="h-auto min-h-10 min-w-0 max-w-full justify-start gap-2 whitespace-normal px-2 py-1.5 text-left"
          >
            {selected ? (
              <ItemIcon
                item={selected}
                className="size-8 shrink-0 rounded-sm"
              />
            ) : (
              <SearchIcon className="size-4 shrink-0" />
            )}
            <span className="wrap-break-word min-w-0 flex-1 font-medium">
              {selected?.name ?? 'Choose item'}
            </span>
            <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        }
      />
      <PopoverContent
        align="start"
        className="w-96 max-w-[calc(100vw-2rem)] p-0"
        aria-label="Match screenshot to item"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            aria-label="Search screenshot item"
            placeholder="Search items..."
          />
          <CommandList id={`${id}-options`}>
            <CommandEmpty>
              {query ? 'No matching items.' : 'No suggested match.'}
            </CommandEmpty>
            {results.map((item) => (
              <CommandItem
                key={item.id}
                value={String(item.id)}
                showCheck={false}
                className="gap-3 py-2"
                onSelect={() => {
                  onChange(item)
                  setOpen(false)
                  setQuery('')
                }}
              >
                <ItemIcon item={item} className="size-9 shrink-0 rounded-sm" />
                <span className="min-w-0">
                  <span className="wrap-break-word block font-medium">
                    {item.name}
                  </span>
                  <span className="block text-muted-foreground text-xs">
                    Lvl. {item.level} &middot; {item.type}
                  </span>
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
