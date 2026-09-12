import { type ReactNode, useEffect, useRef } from 'react'

import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useMediaQuery } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'

const LG = '(min-width: 64rem)'

export function ScrollPanel({
  header = null,
  footer = null,
  children,
  className,
  scroll = 'always',
  scrollResetKey,
}: {
  header?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
  /** `lg` hands the scrollbar back to the page on narrow screens, where a panel of its own traps the content. */
  scroll?: 'always' | 'lg'
  /** A new value is a new list: the reader is put back at its first row. */
  scrollResetKey?: string | number
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const wide = useMediaQuery(LG)
  const scrolls = scroll === 'always' || wide

  useEffect(() => {
    if (scrollResetKey !== undefined && viewportRef.current)
      viewportRef.current.scrollTop = 0
  }, [scrollResetKey])

  // Unpadded so the scrollbar sits against the border; the padding rides inside.
  const body = <div className="px-(--card-spacing)">{children}</div>

  return (
    <Card
      className={cn(
        'flex min-h-0 flex-col',
        scroll === 'always' ? 'max-h-full' : 'lg:max-h-full',
        className,
      )}
    >
      {header && <CardContent className="shrink-0">{header}</CardContent>}
      {scrolls ? (
        <ScrollArea className="min-h-0 flex-1" viewportRef={viewportRef}>
          {body}
        </ScrollArea>
      ) : (
        body
      )}
      {footer && <CardContent className="shrink-0">{footer}</CardContent>}
    </Card>
  )
}
