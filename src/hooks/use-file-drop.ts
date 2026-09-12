import { type DragEvent, useState } from 'react'

function carriesFiles(event: DragEvent) {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files')
}

/**
 * Makes one element claim a file drop for itself. Stopping propagation is what
 * hands a page-wide drop surface its own dragleave, so its overlay gets out of
 * the way while the pointer is over this element.
 */
export function useFileDrop(
  onFiles: ((files: File[]) => void) | undefined,
  accept = 'image/',
) {
  const [over, setOver] = useState(false)

  if (!onFiles) return { over: false, handlers: {} }

  return {
    over,
    handlers: {
      onDragEnter(event: DragEvent) {
        if (!carriesFiles(event)) return
        event.preventDefault()
        event.stopPropagation()
        setOver(true)
      },
      onDragOver(event: DragEvent) {
        if (!carriesFiles(event)) return
        event.preventDefault()
        event.stopPropagation()
      },
      onDragLeave(event: DragEvent) {
        if (!carriesFiles(event)) return
        event.stopPropagation()
        if (event.currentTarget.contains(event.relatedTarget as Node | null))
          return
        setOver(false)
      },
      onDrop(event: DragEvent) {
        if (!carriesFiles(event)) return
        event.preventDefault()
        event.stopPropagation()
        setOver(false)
        const files = Array.from(event.dataTransfer?.files ?? []).filter(
          (file) => file.type.startsWith(accept),
        )
        if (files.length) onFiles(files)
      },
    },
  }
}
