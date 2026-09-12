import type { ReactNode } from 'react'

import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

export function ScrollPanel({
  header = null,
  footer = null,
  children,
  className,
}: {
  header?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={cn('flex max-h-full min-h-0 flex-col', className)}>
      {header && <CardContent className="shrink-0">{header}</CardContent>}
      {/* Unpadded so the scrollbar sits against the border; the padding rides inside. */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-(--card-spacing)">{children}</div>
      </ScrollArea>
      {footer && <CardContent className="shrink-0">{footer}</CardContent>}
    </Card>
  )
}
