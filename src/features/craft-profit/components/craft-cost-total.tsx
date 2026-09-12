import { Separator } from '@/components/ui/separator'
import { formatKamas } from '@/utils/format'

export function CraftCostTotal({ craftCost }: { craftCost?: number }) {
  return (
    <div className="flex flex-col gap-6">
      <Separator />
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-medium">Craft cost</span>
        <span className="font-semibold text-base tabular-nums">
          {craftCost === undefined ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            formatKamas(craftCost)
          )}
        </span>
      </div>
    </div>
  )
}
