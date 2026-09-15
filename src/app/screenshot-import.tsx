import { FolderOpenIcon, ImagePlusIcon } from 'lucide-react'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { WatchFolderDialog } from '@/features/screenshot-import/components/watch-folder-dialog'
import { WatchFolderMenu } from '@/features/screenshot-import/components/watch-folder-menu'
import {
  useWatchedFolder,
  type WatchControls,
} from '@/features/screenshot-import/hooks/use-watched-folder'
import type { ImportRequest } from '@/features/screenshot-import/types'
import type { Item } from '@/types/game'

const ReviewSheet = lazy(() =>
  import('@/features/screenshot-import/components/review-sheet').then(
    (module) => ({ default: module.ReviewSheet }),
  ),
)

type AddImports = (requests: readonly ImportRequest[]) => void

const ImportContext = createContext<AddImports | null>(null)
const WatchContext = createContext<WatchControls | null>(null)

/** Lets a route hand the importer a file already bound to the item it was dropped on. */
export function useScreenshotImport() {
  return use(ImportContext)
}

export function ScreenshotImportProvider({
  serverId,
  onOpenItem,
  children,
}: {
  serverId: number
  onOpenItem: (item: Item) => void
  children: ReactNode
}) {
  const [session, setSession] = useState<{
    serverId: number
    imports: ImportRequest[]
    deferred: boolean
  } | null>(null)

  const open = useCallback(
    (requests: readonly ImportRequest[], deferred: boolean) => {
      if (!requests.length) return
      setSession((current) =>
        // An open batch keeps the server it opened with; only its file list grows.
        current
          ? {
              ...current,
              imports: [...current.imports, ...requests],
              // An arrival never hides a sheet the player already has open.
              deferred: current.deferred && deferred,
            }
          : { serverId, imports: [...requests], deferred },
      )
    },
    [serverId],
  )

  const addImports = useCallback<AddImports>(
    (requests) => open(requests, false),
    [open],
  )

  const addArrivals = useCallback(
    (files: File[]) =>
      open(
        files.map((file) => ({ file })),
        true,
      ),
    [open],
  )

  const watch = useWatchedFolder(addArrivals)
  const close = useCallback(() => setSession(null), [])
  const review = useCallback(
    () => setSession((current) => current && { ...current, deferred: false }),
    [],
  )

  return (
    <ImportContext value={addImports}>
      <WatchContext value={watch}>{children}</WatchContext>
      <DropSurface
        onFiles={(files) => addImports(files.map((file) => ({ file })))}
      />
      {session && (
        <ErrorBoundary
          fallbackRender={() => (
            <Dialog
              open={!session.deferred}
              onOpenChange={(isOpen) => {
                if (!isOpen) close()
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
                open={!session.deferred}
                onOpenChange={(isOpen) => {
                  if (!isOpen) close()
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
              open={!session.deferred}
              skipped={watch.skipped}
              onReview={review}
              onClose={close}
              onOpenItem={(item) => {
                close()
                onOpenItem(item)
              }}
            />
          </Suspense>
        </ErrorBoundary>
      )}
    </ImportContext>
  )
}

export function ScreenshotImportButton() {
  const addImports = useScreenshotImport()
  const watch = use(WatchContext)
  const input = useRef<HTMLInputElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [managing, setManaging] = useState(false)
  const live = watch?.status === 'watching'

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    className="relative"
                    aria-label={
                      live
                        ? 'Import screenshots (watching)'
                        : 'Import screenshots'
                    }
                  >
                    <ImagePlusIcon />
                    {live && (
                      <span
                        aria-hidden
                        className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-gain ring-2 ring-background"
                      />
                    )}
                  </Button>
                }
              />
            }
          />
          {/* An open menu already says everything the tooltip would, and would sit on top of it. */}
          {!menuOpen && (
            <TooltipContent>
              {live ? 'Watching for screenshots' : 'Import screenshots'}
            </TooltipContent>
          )}
        </Tooltip>
        <DropdownMenuContent
          align="end"
          className="w-80 max-w-[calc(100vw-2rem)]"
        >
          <DropdownMenuItem
            className="items-start"
            onClick={() => input.current?.click()}
          >
            <FolderOpenIcon className="mt-0.5" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span>Choose screenshots</span>
              <span className="text-muted-foreground text-xs">
                Or drop them anywhere, or paste with {PASTE_SHORTCUT}
              </span>
            </div>
          </DropdownMenuItem>
          {watch && (
            <WatchFolderMenu watch={watch} onManage={() => setManaging(true)} />
          )}
          <DropdownMenuSeparator />
          {/* A plain div, not DropdownMenuLabel: that one requires a Menu.Group around it. */}
          <div className="px-2 py-1.5 text-muted-foreground text-xs">
            Prices are read on this device. OCR engine{' '}
            {(engine.downloadBytes / 1_000_000).toFixed(2)} MB on first use,
            saved in this browser.
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      {watch && (
        <WatchFolderDialog
          open={managing}
          onOpenChange={setManaging}
          watch={watch}
        />
      )}
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
