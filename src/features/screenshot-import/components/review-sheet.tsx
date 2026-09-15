import { CheckIcon, FolderOpenIcon, LoaderCircleIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SERVERS } from '@/config/servers'
import { getItems } from '@/lib/game-data'
import type { Item } from '@/types/game'

import engine from '../assets/engine.json'
import { useOcrQueue } from '../hooks/use-ocr-queue'
import type { ImportRequest, OcrJob, ReviewDraft } from '../types'
import {
  canConfirm,
  canConfirmTogether,
  confirmImport,
  createReviewDraft,
  type ImportReceipt,
  undoImport,
} from '../utils/review-import'
import { ArrivalsPill } from './arrivals-pill'
import { ReviewCard } from './review-card'

export function ReviewSheet({
  serverId,
  initialImports,
  open = true,
  skipped = 0,
  onReview,
  onClose,
  onOpenItem,
}: {
  serverId: number
  initialImports: readonly ImportRequest[]
  /** False while screenshots arrived on their own: they are read, but nothing is interrupted. */
  open?: boolean
  skipped?: number
  onReview?: () => void
  onClose: () => void
  onOpenItem: (item: Item) => void
}) {
  const [items] = useState(getItems)
  const queue = useOcrQueue(items)
  const enqueueInitial = useRef(queue.enqueue)
  const enqueued = useRef(0)
  const browse = useRef<HTMLInputElement>(null)
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({})
  const [receipts, setReceipts] = useState<Record<string, ImportReceipt>>({})
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const serverName =
    SERVERS.find((server) => server.id === serverId)?.name ?? String(serverId)

  useEffect(() => {
    // Counted inside the timer so StrictMode's cancelled first pass keeps its files.
    const timer = setTimeout(() => {
      const pending = initialImports.slice(enqueued.current)
      if (!pending.length) return
      enqueued.current = initialImports.length
      enqueueInitial.current(pending)
    }, 0)
    return () => clearTimeout(timer)
  }, [initialImports])

  function draftFor(job: OcrJob) {
    return drafts[job.id] ?? createReviewDraft(job)
  }

  const remaining = queue.jobs.filter((job) => !receipts[job.id])
  const eligible = remaining.filter((job) =>
    canConfirmTogether(job, draftFor(job)),
  )
  const matched = queue.jobs.filter(
    (job) => draftFor(job).itemId !== undefined,
  ).length
  const needsReview = remaining.filter(
    (job) =>
      !['queued', 'reading'].includes(job.status) &&
      !canConfirmTogether(job, draftFor(job)),
  )
  const firstNeedsReview = needsReview[0]?.id
  const reading = queue.jobs.filter(
    (job) => job.status === 'reading' || job.status === 'queued',
  ).length

  function confirm(job: OcrJob) {
    const draft = draftFor(job)
    if (!canConfirm(draft) || draft.itemId === undefined || receipts[job.id])
      return
    try {
      const receipt = confirmImport(serverId, draft.itemId, draft.prices)
      setReceipts((current) => ({ ...current, [job.id]: receipt }))
      setErrors((current) => ({ ...current, [job.id]: undefined }))
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [job.id]:
          error instanceof Error ? error.message : 'Prices could not be saved.',
      }))
    }
  }

  function undo(id: string) {
    const receipt = receipts[id]
    if (!receipt) return
    if (!undoImport(receipt)) {
      setErrors((current) => ({
        ...current,
        [id]: 'This item changed after import. Undo the newer import first; newer edits are kept.',
      }))
      return
    }
    setReceipts((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
    setErrors((current) => ({ ...current, [id]: undefined }))
  }

  if (!open)
    return (
      <ArrivalsPill
        total={queue.jobs.length}
        reading={reading}
        needsReview={needsReview.length}
        skipped={skipped}
        onReview={() => onReview?.()}
        onDismiss={onClose}
      />
    )

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent className="flex h-[90dvh] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
        <DialogHeader className="shrink-0 gap-3 border-b px-4 py-5 pr-14 sm:px-6 sm:pr-14">
          <div className="flex flex-wrap items-center gap-3">
            <DialogTitle className="text-lg">
              Review imported prices
            </DialogTitle>
            <Badge variant="outline">{serverName}</Badge>
          </div>
          <DialogDescription>
            Nothing leaves your browser. Prices are written only when you
            confirm.
          </DialogDescription>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-muted-foreground text-xs" role="status">
              {queue.jobs.length} screenshots &middot; {matched} matched
              &middot; {needsReview.length} need review
              {reading > 0 && <>&nbsp;&middot; {reading} reading</>}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => browse.current?.click()}
              >
                <FolderOpenIcon />
                Browse
              </Button>
              <Button
                size="sm"
                disabled={eligible.length === 0}
                onClick={() => {
                  for (const job of eligible) confirm(job)
                }}
              >
                <CheckIcon />
                Confirm all {eligible.length}
              </Button>
            </div>
          </div>
          <input
            ref={browse}
            type="file"
            multiple
            accept="image/*"
            className="sr-only"
            aria-label="Add screenshot files"
            onChange={(event) => {
              queue.enqueue(
                Array.from(event.target.files ?? []).map((file) => ({ file })),
              )
              event.target.value = ''
            }}
          />
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1 bg-background">
          <div className="space-y-4 px-3 py-4 sm:px-6 sm:py-6">
            {queue.jobs.some(
              (job) =>
                job.status === 'reading' && job.phase === 'Loading engine',
            ) && (
              <p
                className="flex items-center gap-2 text-muted-foreground text-xs"
                role="status"
              >
                <LoaderCircleIcon className="size-4 animate-spin" />
                Loading OCR engine (
                {(engine.downloadBytes / 1_000_000).toFixed(2)} MB), stored in
                this browser after first use.
              </p>
            )}
            {queue.jobs.map((job) => (
              <ReviewCard
                key={job.id}
                job={job}
                draft={draftFor(job)}
                receipt={receipts[job.id]}
                error={errors[job.id]}
                focus={job.id === firstNeedsReview}
                onChange={(draft) =>
                  setDrafts((current) => ({ ...current, [job.id]: draft }))
                }
                onConfirm={() => confirm(job)}
                onUndo={() => undo(job.id)}
                onRemove={() => queue.remove(job.id)}
                onCancel={() => queue.cancel(job.id)}
                onRetry={() => queue.retry(job.id)}
                onOpenItem={onOpenItem}
              />
            ))}
            {queue.jobs.length === 0 && (
              <p className="py-12 text-center text-muted-foreground text-sm">
                No screenshots in this batch.
              </p>
            )}
          </div>
        </ScrollArea>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t px-4 py-3 sm:px-6">
          <span className="text-muted-foreground text-xs">
            {Object.keys(receipts).length} saved &middot; {serverName}
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
