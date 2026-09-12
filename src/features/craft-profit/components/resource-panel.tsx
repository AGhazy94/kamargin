import { ItemIcon } from '@/components/item-icon'
import { Separator } from '@/components/ui/separator'
import { getJobName, getRecipesUsing } from '@/lib/game-data'
import type { PriceEntry } from '@/stores/price-book'
import type { Item, PackTier } from '@/types/game'
import { formatKamas } from '@/utils/format'
import type { PackPrices } from '@/utils/pack-tiers'
import { TierPriceRows } from './tier-price-rows'

const SHOWN = 40

/** A resource is not a dead end: it is priced here, and it says what it is for. */
export function ResourcePanel({
  item,
  packPrices,
  entry,
  onPriceChange,
  onOpenItem,
}: {
  item: Item
  packPrices: PackPrices
  entry?: PriceEntry
  onPriceChange: (tier: PackTier, packPrice?: number) => void
  onOpenItem: (item: Item) => void
}) {
  const users = getRecipesUsing(item.id)

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="resource-price" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="resource-price" className="font-heading font-medium text-sm">
            Market price
          </h2>
          <p className="text-muted-foreground text-xs">
            This item can't be crafted — priced here, it costs out every craft
            below.
          </p>
        </div>
        <TierPriceRows
          name={item.name}
          packPrices={packPrices}
          entry={entry}
          onPriceChange={onPriceChange}
        />
      </section>

      <Separator />

      <section aria-labelledby="resource-uses" className="flex flex-col gap-2">
        <h2 id="resource-uses" className="font-heading font-medium text-sm">
          Used in <span className="tabular-nums">{users.length}</span>{' '}
          {users.length === 1 ? 'craft' : 'crafts'}
        </h2>

        {users.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No bundled recipe calls for it.
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {users.slice(0, SHOWN).map((user) => {
              const quantity = user.recipe?.find(
                (ingredient) => ingredient.itemId === item.id,
              )?.quantity

              return (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => onOpenItem(user)}
                    className="flex min-h-11 w-full items-center gap-3 rounded-md px-1 py-2 text-left outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <ItemIcon item={user} className="size-8" />
                    <span className="min-w-0 flex-1">
                      <span className="wrap-anywhere block text-sm">
                        {user.name}
                      </span>
                      <span className="block text-muted-foreground text-xs">
                        Lv {user.craftLevel} · {getJobName(user.job)}
                      </span>
                    </span>
                    {quantity !== undefined && (
                      <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                        ×{formatKamas(quantity)}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {users.length > SHOWN && (
          <p className="text-muted-foreground text-xs tabular-nums">
            {users.length - SHOWN} more not shown.
          </p>
        )}
      </section>
    </div>
  )
}
