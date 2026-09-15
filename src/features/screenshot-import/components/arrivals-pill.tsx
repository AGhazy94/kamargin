import { LoaderCircleIcon, ScanTextIcon, XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function ArrivalsPill({
  total,
  reading,
  needsReview,
  skipped,
  onReview,
  onDismiss,
}: {
  total: number
  reading: number
  needsReview: number
  skipped: number
  onReview: () => void
  onDismiss: () => void
}) {
  if (total === 0) return null

  const plural = total === 1 ? 'screenshot' : 'screenshots'
  const detail =
    reading > 0
      ? `${total - reading} of ${total} read`
      : needsReview > 0
        ? `${total - needsReview} ready · ${needsReview} need you`
        : 'ready to confirm'

  return (
    // Below the drop overlay, above everything else: a drop still wins while this sits there.
    <div className="fade-in slide-in-from-bottom-4 fixed right-4 bottom-4 z-50 w-[min(22rem,calc(100vw-2rem))] animate-in rounded-xl border bg-card p-3 text-card-foreground shadow-lg duration-200">
      <div className="flex items-start gap-3">
        {reading > 0 ? (
          <LoaderCircleIcon
            aria-hidden
            className="mt-0.5 size-5 shrink-0 animate-spin text-primary"
          />
        ) : (
          <ScanTextIcon
            aria-hidden
            strokeWidth={1.7}
            className="mt-0.5 size-5 shrink-0 text-primary"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm" role="status">
            {total} {plural} read
          </p>
          <p className="text-muted-foreground text-xs">{detail}</p>
          {skipped > 0 && (
            <p className="mt-1 text-muted-foreground text-xs">
              {skipped} older {skipped === 1 ? 'file was' : 'files were'}{' '}
              skipped.
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Dismiss without importing"
          className="-mt-1 -mr-1 size-7 shrink-0"
          onClick={onDismiss}
        >
          <XIcon />
        </Button>
      </div>
      <Button size="sm" className="mt-3 w-full" onClick={onReview}>
        Review prices
      </Button>
    </div>
  )
}
