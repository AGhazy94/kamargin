import { TableCell, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

function Bar({ className }: { className?: string }) {
  return (
    <div
      className={cn('h-3.5 animate-pulse rounded bg-muted', className)}
      aria-hidden
    />
  )
}

/** The next page is a row's worth of scrolling away: these hold its shape until it lands. */
export function SkeletonRows({
  sentinelRef,
}: {
  sentinelRef: (node: HTMLElement | null) => void
}) {
  return (
    <>
      {[0, 1, 2].map((index) => (
        <TableRow key={index} aria-hidden className="hover:bg-transparent">
          <TableCell ref={index === 0 ? sentinelRef : undefined}>
            <div className="flex min-h-11 items-center gap-3">
              <div className="size-8 shrink-0 animate-pulse rounded-md bg-muted" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Bar className="w-40 max-w-full" />
                <Bar className="h-2.5 w-24 max-w-full" />
              </div>
            </div>
          </TableCell>
          <TableCell className="hidden sm:table-cell">
            <Bar className="ml-auto w-16" />
          </TableCell>
          <TableCell className="hidden sm:table-cell">
            <Bar className="ml-auto w-16" />
          </TableCell>
          <TableCell>
            <Bar className="ml-auto w-14" />
          </TableCell>
          <TableCell />
        </TableRow>
      ))}
    </>
  )
}
