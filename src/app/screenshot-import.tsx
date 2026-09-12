import { ImagePlusIcon } from 'lucide-react'
import {
  createContext,
  lazy,
  type ReactNode,
  Suspense,
  use,
  useCallback,
  useRef,
  useState,
} from 'react'
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
import {
  DropSurface,
  PASTE_SHORTCUT,
} from '@/features/screenshot-import/components/drop-surface'
import type { ImportRequest } from '@/features/screenshot-import/types'

const ReviewSheet = lazy(() =>
  import('@/features/screenshot-import/components/review-sheet').then(
    (module) => ({ default: module.ReviewSheet }),
  ),
)

type AddImports = (requests: readonly ImportRequest[]) => void

const ImportContext = createContext<AddImports | null>(null)

/** Lets a route hand the importer a file already bound to the item it was dropped on. */
export function useScreenshotImport() {
  return use(ImportContext)
}

export function ScreenshotImportProvider({
  serverId,
  children,
}: {
  serverId: number
  children: ReactNode
}) {
  const [session, setSession] = useState<{
    serverId: number
    imports: ImportRequest[]
  } | null>(null)

  const addImports = useCallback<AddImports>(
    (requests) => {
      if (!requests.length) return
      setSession((current) =>
        // An open batch keeps the server it opened with; only its file list grows.
        current
          ? { ...current, imports: [...current.imports, ...requests] }
          : { serverId, imports: [...requests] },
      )
    },
    [serverId],
  )

  const close = useCallback(() => setSession(null), [])

  return (
    <ImportContext value={addImports}>
      {children}
      <DropSurface
        onFiles={(files) => addImports(files.map((file) => ({ file })))}
      />
      {session && (
        <ErrorBoundary
          fallbackRender={() => (
            <Dialog
              open
              onOpenChange={(open) => {
                if (!open) close()
              }}
            >
              <DialogContent>
                <DialogTitle>Import unavailable</DialogTitle>
                <DialogDescription>
                  The review sheet could not load. Your existing prices are
                  unchanged.
                </DialogDescription>
                <Button onClick={close}>Close</Button>
              </DialogContent>
            </Dialog>
          )}
        >
          <Suspense
            fallback={
              <Dialog
                open
                onOpenChange={(open) => {
                  if (!open) close()
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
              initialImports={session.imports}
              onClose={close}
            />
          </Suspense>
        </ErrorBoundary>
      )}
    </ImportContext>
  )
}

export function ScreenshotImportButton() {
  const addImports = useScreenshotImport()
  const input = useRef<HTMLInputElement>(null)

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
          Import screenshots — or drop them anywhere, or paste with{' '}
          {PASTE_SHORTCUT}. OCR engine:{' '}
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
          addImports?.(
            Array.from(event.target.files ?? []).map((file) => ({ file })),
          )
          event.target.value = ''
        }}
      />
    </>
  )
}
