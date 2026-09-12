import { SERVERS } from '@/config/servers'
import { Recommendations } from '@/features/recommendations/recommendations'
import type { Item } from '@/types/game'

export function RecommendationsRoute({
  serverId,
  onOpenItem,
  calculatorHref,
}: {
  serverId: number
  onOpenItem: (item: Item) => void
  calculatorHref: string
}) {
  return (
    <section
      className="flex h-full min-h-0 flex-col gap-6"
      aria-labelledby="recommendations-title"
    >
      <header className="flex shrink-0 items-baseline justify-between gap-4">
        <h1
          id="recommendations-title"
          className="font-heading font-semibold text-xl"
        >
          What to craft
        </h1>
        <span className="text-muted-foreground text-sm">
          {SERVERS.find((server) => server.id === serverId)?.name}
        </span>
      </header>
      <Recommendations
        serverId={serverId}
        onOpenItem={onOpenItem}
        calculatorHref={calculatorHref}
      />
    </section>
  )
}
