import { EyeIcon, EyeOffIcon } from 'lucide-react'

import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

import type { WatchControls } from '../hooks/use-watched-folder'

function summarise(watch: WatchControls) {
  if (watch.status === 'loading') return 'Checking for a watched folder...'
  if (watch.status === 'watching')
    return watch.read > 0
      ? `${watch.folderName} · ${watch.read} read`
      : (watch.folderName ?? 'Watching')
  if (watch.status === 'paused') return `${watch.folderName} · access lapsed`
  return 'Screenshots import themselves'
}

export function WatchFolderMenu({
  watch,
  onManage,
}: {
  watch: WatchControls
  onManage: () => void
}) {
  if (watch.status === 'unsupported') return null

  const live = watch.status === 'watching'

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem className="items-start" onClick={onManage}>
        {live ? (
          <EyeIcon className="mt-0.5 text-gain" />
        ) : (
          <EyeOffIcon className="mt-0.5" />
        )}
        <div className="flex min-w-0 flex-col gap-0.5">
          <span>{live ? 'Watched folder' : 'Watch a folder'}</span>
          <span className="truncate text-muted-foreground text-xs">
            {summarise(watch)}
          </span>
        </div>
      </DropdownMenuItem>
    </>
  )
}
