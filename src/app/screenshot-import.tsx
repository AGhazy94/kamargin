import { ImagePlusIcon } from 'lucide-react'
import { lazy, Suspense, useRef, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import engine from '@/features/screenshot-import/assets/engine.json'

const ReviewSheet = lazy(() =>
  import('@/features/screenshot-import/components/review-sheet').then(
    (module) => ({ default: module.ReviewSheet }),
  ),
)

export function ScreenshotImport({ serverId }: { serverId: number }) {
  const input = useRef<HTMLInputElement>(null)
  const [session, setSession] = useState<{
    serverId: number
    files: File[]
  } | null>(null)
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              aria-label="Import screenshots"
              onClick={() => input.current?.click()}
            >
              <ImagePlusIcon />
            </Button>
          }
        />
        <TooltipContent>
          Import screenshots. OCR engine:{' '}
          {(engine.downloadBytes / 1_000_000).toFixed(2)} MB on first use, saved
          in this browser.
        </TooltipContent>
      </Tooltip>
      <input
        ref={input}
        type="file"
        multiple
        accept="image/*"
        className="sr-only"
        aria-label="Choose screenshot files"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          if (files.length) setSession({ serverId, files })
          event.target.value = ''
        }}
      />
      {session && (
        <ErrorBoundary
          fallbackRender={() => (
            <Dialog
              open
              onOpenChange={(open) => {
                if (!open) setSession(null)
              }}
            >
              <DialogContent>
                <DialogTitle>Import unavailable</DialogTitle>
                <DialogDescription>
                  The review sheet could not load. Your existing prices are
                  unchanged.
                </DialogDescription>
                <Button onClick={() => setSession(null)}>Close</Button>
              </DialogContent>
            </Dialog>
          )}
        >
          <Suspense
            fallback={
              <Dialog
                open
                onOpenChange={(open) => {
                  if (!open) setSession(null)
                }}
              >
                <DialogContent>
                  <DialogTitle>Review imported prices</DialogTitle>
                  <DialogDescription role="status">
                    Opening review...
                  </DialogDescription>
                </DialogContent>
              </Dialog>
            }
          >
            <ReviewSheet
              serverId={session.serverId}
              initialFiles={session.files}
              onClose={() => setSession(null)}
            />
          </Suspense>
        </ErrorBoundary>
      )}
    </>
  )
}
