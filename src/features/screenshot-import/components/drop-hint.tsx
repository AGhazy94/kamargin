import { ImageDownIcon } from 'lucide-react'

import { PASTE_SHORTCUT } from './drop-surface'

export function DropHint() {
  return (
    <div className="mt-6 flex flex-col gap-2 rounded-xl border border-dashed p-4">
      <p className="flex items-center gap-2 font-medium text-sm">
        <ImageDownIcon
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
        />
        Drop market screenshots anywhere on this page
      </p>
      <p className="text-muted-foreground text-xs">
        Or paste one with {PASTE_SHORTCUT}. Each dialog names its own item, so
        an ingredient's row fills the moment you confirm its prices.
      </p>
    </div>
  )
}
