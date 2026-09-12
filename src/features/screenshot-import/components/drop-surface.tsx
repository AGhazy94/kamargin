import { LockIcon, ScanTextIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export const PASTE_SHORTCUT = /Mac|iPhone|iPad|iPod/.test(
  typeof navigator === 'undefined' ? '' : navigator.userAgent,
)
  ? '⌘V'
  : 'Ctrl+V'

function imagesIn(list: FileList | null | undefined) {
  return Array.from(list ?? []).filter((file) => file.type.startsWith('image/'))
}

function carriesFiles(event: DragEvent) {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files')
}

export function DropSurface({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [active, setActive] = useState(false)
  const deliver = useRef(onFiles)
  deliver.current = onFiles

  useEffect(() => {
    // dragenter/dragleave fire per element crossed, so only the outermost pair may toggle.
    let depth = 0

    // Uncancelled, the browser navigates to the dropped file and the app is gone.
    const over = (event: DragEvent) => event.preventDefault()

    const enter = (event: DragEvent) => {
      event.preventDefault()
      if (!carriesFiles(event)) return
      depth += 1
      setActive(true)
    }

    const leave = (event: DragEvent) => {
      if (!carriesFiles(event)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setActive(false)
    }

    const drop = (event: DragEvent) => {
      event.preventDefault()
      depth = 0
      setActive(false)
      const files = imagesIn(event.dataTransfer?.files)
      if (files.length) deliver.current(files)
    }

    const paste = (event: ClipboardEvent) => {
      const files = imagesIn(event.clipboardData?.files)
      if (!files.length) return
      event.preventDefault()
      deliver.current(files)
    }

    const reset = () => {
      depth = 0
      setActive(false)
    }

    window.addEventListener('dragenter', enter)
    window.addEventListener('dragover', over)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', drop)
    window.addEventListener('dragend', reset)
    window.addEventListener('blur', reset)
    window.addEventListener('paste', paste)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragover', over)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', drop)
      window.removeEventListener('dragend', reset)
      window.removeEventListener('blur', reset)
      window.removeEventListener('paste', paste)
    }
  }, [])

  if (!active) return null

  return (
    // Above the review sheet: a drop lands on the batch whether or not it is open.
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-background/85 p-4"
    >
      <div className="flex w-full max-w-2xl flex-col items-center gap-3.5 rounded-xl border-2 border-primary/45 border-dashed bg-primary/5 px-6 py-14 text-center">
        <ScanTextIcon
          aria-hidden
          strokeWidth={1.6}
          className="size-8 text-primary"
        />
        <div className="flex flex-col gap-1">
          <p className="font-medium text-lg">Drop screenshots here</p>
          <p className="text-muted-foreground text-sm">
            or paste with {PASTE_SHORTCUT} &middot; or browse
          </p>
        </div>
        {/* A wrapped pill reads as a blob; the review sheet repeats the reassurance anyway. */}
        <span className="hidden items-center gap-2 rounded-full bg-gain/15 px-3 py-1 text-gain text-xs sm:inline-flex">
          <LockIcon aria-hidden className="size-3.5 shrink-0" />
          Read on this device. No upload, no account, works offline.
        </span>
      </div>
    </div>
  )
}
