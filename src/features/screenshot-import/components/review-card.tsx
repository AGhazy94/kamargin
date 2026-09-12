import { cn } from 'cn'
import {
  CheckIcon,
  ImageIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
  ScanSearchIcon,
  Trash2Icon,
  TriangleAlertIcon,
  Undo2Icon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { PriceInput } from '@/components/price-input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getItem } from '@/lib/game-data'
import { formatCompactKamas, formatKamas, formatTier } from '@/utils/format'
import { cheapestTier, PACK_TIERS, pricedTierCount } from '@/utils/pack-tiers'

import {
  OCR_CONFIDENCE_THRESHOLD,
  type OcrJob,
  type ReviewDraft,
} from '../types'
import {
  canConfirm,
  flaggedTiers,
  type ImportReceipt,
  needsItemReview,
} from '../utils/review-import'
import { ItemCombobox } from './item-combobox'

export function ReviewCard({
  job,
  draft,
  receipt,
  error,
  focus,
  onChange,
  onConfirm,
  onUndo,
  onRemove,
  onCancel,
  onRetry,
}: {
  job: OcrJob
  draft: ReviewDraft
  receipt?: ImportReceipt
  error?: string
  focus: boolean
  onChange: (draft: ReviewDraft) => void
  onConfirm: () => void
  onUndo: () => void
  onRemove: () => void
  onCancel: () => void
  onRetry: () => void
}) {
  const [enlarged, setEnlarged] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const [previewFailed, setPreviewFailed] = useState(false)
  const root = useRef<HTMLElement>(null)
  const focused = useRef(false)
  const busy = job.status === 'queued' || job.status === 'reading'
  const item = draft.itemId === undefined ? undefined : getItem(draft.itemId)
  const parsed = job.reading?.parsed
  const flags = flaggedTiers(job, draft)
  const itemNeedsReview = needsItemReview(job, draft)
  const average = parsed?.averagePrice
  const averageFlagged =
    average !== undefined && average.confidence < OCR_CONFIDENCE_THRESHOLD
  const winner = cheapestTier(draft.prices)
  const needsAttention =
    itemNeedsReview ||
    flags.length > 0 ||
    averageFlagged ||
    job.reading?.location.confident !== true

  useEffect(() => {
    if (!focus || busy || focused.current || receipt) return
    const target = !item
      ? root.current?.querySelector<HTMLElement>('[role="combobox"]')
      : (root.current?.querySelector<HTMLElement>(
          'input[aria-invalid="true"]',
        ) ??
        (itemNeedsReview
          ? root.current?.querySelector<HTMLElement>('[role="combobox"]')
          : null))
    target?.focus({ preventScroll: true })
    focused.current = true
  }, [focus, busy, item, itemNeedsReview, receipt])

  if (receipt) {
    return (
      <article
        aria-label={`${item?.name ?? 'Item'} import receipt`}
        className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3"
      >
        <CheckIcon className="size-4 shrink-0 text-gain" aria-hidden />
        <div className="min-w-0 flex-1">
          <span className="wrap-break-word mr-3 font-medium">{item?.name}</span>
          <span className="text-muted-foreground text-xs">
            {Object.keys(receipt.applied.tiers).length} pack prices saved
            {PACK_TIERS.map((tier) => {
              const price = receipt.applied.tiers[tier]
              return price ? (
                <span key={tier}>
                  {' '}
                  &middot; {formatTier(tier)} {formatKamas(price.packPrice)}
                </span>
              ) : null
            })}
          </span>
          {error && (
            <p role="alert" className="mt-1 text-loss text-xs">
              {error}
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onUndo}>
          <Undo2Icon />
          Undo
        </Button>
      </article>
    )
  }

  return (
    <article
      ref={root}
      aria-label={`${job.file.name} review`}
      className="min-w-0 rounded-lg border bg-card p-4 sm:p-6"
    >
      <div className="grid min-w-0 gap-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => setEnlarged(true)}
            aria-label={`Enlarge ${job.file.name}`}
            className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-md border bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring sm:aspect-4/3"
          >
            {previewFailed ? (
              <ImageIcon className="size-8 text-muted-foreground" />
            ) : (
              <img
                src={job.sourceUrl}
                alt="Original market screenshot"
                className="size-full object-contain"
                onError={() => setPreviewFailed(true)}
              />
            )}
          </button>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span
              className="truncate text-muted-foreground text-xs"
              title={job.file.name}
            >
              {job.file.name}
            </span>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Enlarge screenshot"
                    onClick={() => setEnlarged(true)}
                  >
                    <ZoomInIcon />
                  </Button>
                }
              />
              <TooltipContent>Enlarge screenshot</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {busy ? (
          <div
            className="flex min-h-36 min-w-0 flex-col justify-center gap-4"
            aria-busy="true"
          >
            <div
              className="flex items-center gap-2 text-muted-foreground"
              role="status"
            >
              <LoaderCircleIcon className="size-4 animate-spin" />
              {job.status === 'queued' ? 'Queued' : 'Reading...'}
            </div>
            <progress
              aria-label={`${job.file.name} OCR progress`}
              max={1}
              value={job.progress}
              className="h-1.5 w-full accent-primary"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground text-xs">{job.phase}</span>
              <Button variant="ghost" size="sm" onClick={onCancel}>
                <XIcon />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="min-w-0">
            <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row">
              <div className="w-full min-w-0 flex-1 sm:w-auto">
                {!item && parsed?.title && (
                  <p className="wrap-break-word mb-1 text-muted-foreground text-xs">
                    Read as{' '}
                    <span className="text-foreground">
                      {parsed.title.value}
                    </span>
                  </p>
                )}
                <ItemCombobox
                  id={`${job.id}-item`}
                  value={draft.itemId}
                  candidates={
                    job.match?.candidates.map((candidate) => candidate.item) ??
                    []
                  }
                  onChange={(selected) =>
                    onChange({
                      ...draft,
                      itemId: selected.id,
                      itemReviewed: true,
                    })
                  }
                />
                {item && (
                  <p className="mt-1 text-muted-foreground text-xs">
                    Lvl. {item.level} &middot; {item.type}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {average && (
                  <span
                    className={cn(
                      'text-muted-foreground tabular-nums',
                      averageFlagged && 'text-loss',
                    )}
                  >
                    avg {formatKamas(average.value)}/u
                    {averageFlagged && ' (check)'}
                  </span>
                )}
                <Badge
                  variant="outline"
                  className={needsAttention ? 'text-loss' : 'text-gain'}
                >
                  {needsAttention ? <TriangleAlertIcon /> : <CheckIcon />}
                  {!item
                    ? 'Choose item'
                    : flags.length
                      ? `Check ${flags.map(formatTier).join(', ')}`
                      : itemNeedsReview
                        ? 'Check item details'
                        : needsAttention
                          ? 'Needs review'
                          : 'Matched'}
                </Badge>
              </div>
            </div>
            {(job.status === 'error' || job.status === 'cancelled') && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <p role="alert" className="text-loss">
                  {job.error ?? 'Reading cancelled.'}
                </p>
                <Button variant="outline" size="sm" onClick={onRetry}>
                  <RotateCcwIcon />
                  Retry
                </Button>
              </div>
            )}
            {job.status === 'ready' && !parsed?.isMarketDialog && (
              <p className="mb-4 text-muted-foreground text-xs">
                Not a market dialog. Choose an item and enter its pack prices.
              </p>
            )}
            {parsed?.isMarketDialog && !job.reading?.location.confident && (
              <p className="mb-4 flex items-center gap-2 text-loss text-xs">
                <ScanSearchIcon className="size-4 shrink-0" />
                Uncertain dialog region. Check every price against the
                screenshot.
              </p>
            )}
            <div className="space-y-2">
              {PACK_TIERS.map((tier) => {
                const price = draft.prices[tier]
                const flagged = flags.includes(tier)
                const invalid =
                  price !== undefined &&
                  (!Number.isSafeInteger(price) || price <= 0)
                const noteId = `${job.id}-${tier}-note`
                return (
                  <div
                    key={tier}
                    className="grid grid-cols-[3rem_minmax(0,1fr)_4.5rem] items-center gap-x-2 gap-y-1 sm:grid-cols-[3.5rem_minmax(8rem,12rem)_5rem_minmax(0,1fr)] sm:gap-x-3"
                  >
                    <label
                      htmlFor={`${job.id}-${tier}`}
                      className="text-muted-foreground text-xs tabular-nums"
                    >
                      {formatTier(tier)}
                    </label>
                    <PriceInput
                      id={`${job.id}-${tier}`}
                      label={`${item?.name ?? 'Unmatched item'} pack ${tier} price`}
                      value={price}
                      placeholder="Not read"
                      invalid={flagged || invalid}
                      describedBy={flagged || invalid ? noteId : undefined}
                      reference={
                        tier === 1 && average ? (
                          <span
                            title={`Average: ${formatKamas(average.value)} per unit`}
                          >
                            {formatCompactKamas(average.value)}
                          </span>
                        ) : null
                      }
                      onChange={(value) =>
                        onChange({
                          ...draft,
                          prices: { ...draft.prices, [tier]: value },
                          reviewedTiers: [
                            ...new Set([...draft.reviewedTiers, tier]),
                          ],
                        })
                      }
                      onSubmit={() => {
                        if (canConfirm(draft)) onConfirm()
                      }}
                    />
                    <span className="flex min-w-0 items-center justify-end gap-1 text-right text-muted-foreground text-xs tabular-nums">
                      {price === undefined
                        ? '-'
                        : `${formatCompactKamas(price / tier)}/u`}
                      {winner?.tier === tier && (
                        <CheckIcon
                          className="size-3 shrink-0 text-gain"
                          aria-label="Cheapest per unit"
                        />
                      )}
                    </span>
                    <span
                      id={noteId}
                      className={cn(
                        'col-span-2 col-start-2 text-xs sm:col-span-1 sm:col-start-auto',
                        flagged || invalid
                          ? 'text-loss'
                          : 'text-muted-foreground',
                      )}
                    >
                      {invalid ? (
                        'Enter a positive whole price.'
                      ) : flagged ? (
                        price === undefined ? (
                          'Price unread. Compare with the shot.'
                        ) : (
                          'Low confidence. Compare with the shot.'
                        )
                      ) : winner?.tier === tier ? (
                        <span className="hidden sm:inline">
                          Cheapest per unit
                        </span>
                      ) : null}
                    </span>
                  </div>
                )
              })}
            </div>
            {error && (
              <p role="alert" className="mt-3 text-loss text-xs">
                {error}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              <span className="mr-auto text-muted-foreground text-xs">
                {pricedTierCount(draft.prices)} pack prices
              </span>
              <Button variant="ghost" size="sm" onClick={onRemove}>
                <Trash2Icon />
                Discard
              </Button>
              <Button
                size="sm"
                disabled={!canConfirm(draft)}
                onClick={onConfirm}
              >
                <CheckIcon />
                Confirm
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={enlarged} onOpenChange={setEnlarged}>
        <DialogContent className="flex h-[90dvh] max-w-[calc(100%-2rem)] flex-col sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Source screenshot</DialogTitle>
            <DialogDescription className="break-all">
              {job.file.name}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto rounded-md bg-muted">
            <img
              src={job.sourceUrl}
              alt="Full original screenshot"
              className={zoomed ? 'max-w-none' : 'size-full object-contain'}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="self-end"
            onClick={() => setZoomed(!zoomed)}
          >
            {zoomed ? <ZoomOutIcon /> : <ZoomInIcon />}
            {zoomed ? 'Fit image' : 'Original size'}
          </Button>
        </DialogContent>
      </Dialog>
    </article>
  )
}
