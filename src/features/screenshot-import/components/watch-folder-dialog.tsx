import {
  EyeOffIcon,
  FolderIcon,
  FolderSearchIcon,
  PlayIcon,
  TriangleAlertIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import type { WatchControls } from '../hooks/use-watched-folder'

const IS_MAC = /Mac|iPhone|iPad|iPod/.test(
  typeof navigator === 'undefined' ? '' : navigator.userAgent,
)

export function WatchFolderDialog({
  open,
  onOpenChange,
  watch,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  watch: WatchControls
}) {
  const picked = watch.status === 'watching' || watch.status === 'paused'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Watch for new screenshots</DialogTitle>
          <DialogDescription>
            Point Kamargin at the folder your screenshots land in and they
            import themselves. Nothing is uploaded, and prices still need your
            confirmation.
          </DialogDescription>
        </DialogHeader>

        {picked ? (
          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="flex items-center gap-3">
              <FolderIcon
                aria-hidden
                strokeWidth={1.7}
                className="size-5 shrink-0 text-muted-foreground"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-sm">
                  {watch.folderName}
                </p>
                <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  {watch.status === 'watching' ? (
                    <>
                      <span
                        aria-hidden
                        className="size-1.5 rounded-full bg-gain"
                      />
                      Watching
                      {watch.read > 0 && ` · ${watch.read} read this session`}
                    </>
                  ) : (
                    'Access lapsed — the browser drops it on restart.'
                  )}
                </p>
              </div>
              {watch.status === 'paused' ? (
                <Button size="sm" onClick={watch.resume}>
                  <PlayIcon />
                  Resume
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={watch.start}>
                    Change
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label="Stop watching"
                    onClick={watch.stop}
                  >
                    <EyeOffIcon />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              className="h-auto w-full flex-col gap-1.5 border-dashed py-6"
              onClick={watch.start}
            >
              <FolderSearchIcon className="size-6 text-primary" />
              <span className="font-medium">Choose a folder</span>
              <span className="font-normal text-muted-foreground text-xs">
                A folder of your own, not Desktop
              </span>
            </Button>
            <div className="flex gap-2.5 rounded-lg border bg-muted/40 p-3 text-xs">
              <TriangleAlertIcon
                aria-hidden
                strokeWidth={1.8}
                className="mt-px size-4 shrink-0 text-muted-foreground"
              />
              <div className="flex flex-col gap-1.5">
                <p className="font-medium">
                  Your browser blocks Desktop and other system folders.
                </p>
                <p className="text-muted-foreground">
                  Make a folder for this — say{' '}
                  <span className="font-mono">Pictures/dofus</span> — and choose
                  that instead.
                </p>
                {IS_MAC && (
                  <p className="text-muted-foreground">
                    Then point the screenshot key at it:{' '}
                    <span className="font-mono">⌘⇧5</span> → Options → Other
                    Location.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {watch.error && (
          <p className="text-loss text-sm" role="status">
            {watch.error}
          </p>
        )}

        <ul className="flex flex-col gap-1.5 text-muted-foreground text-xs">
          <li>
            Only files added after you choose are read — an existing pile is
            left alone.
          </li>
          <li>
            Reading stops when this tab closes. Nothing runs in the background.
          </li>
          {/* The API hands over a name, so offering a full path would be a lie. */}
          <li>Your browser reveals a folder's name, never its full path.</li>
        </ul>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
