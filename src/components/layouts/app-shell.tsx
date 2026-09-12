import type { ReactNode, Ref } from 'react'

import { ModeToggle } from '@/components/mode-toggle'
import { ServerSelect } from '@/components/server-select'
import { cn } from '@/lib/utils'

export function AppShell({
  nav = null,
  brand = 'Dofus Market',
  serverControl = <ServerSelect />,
  scroll = 'panel-lg',
  mainRef,
  title = 'Calculator',
  children,
}: {
  nav?: ReactNode
  brand?: ReactNode
  serverControl?: ReactNode
  /** Who owns the scrollbar: the page, a panel inside it, or a panel from `lg` up. */
  scroll?: 'page' | 'panel' | 'panel-lg'
  mainRef?: Ref<HTMLElement>
  title?: string
  children: ReactNode
}) {
  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="z-40 shrink-0 border-border border-b bg-background">
        <div className="mx-auto flex min-h-20 max-w-5xl flex-wrap items-center gap-x-4 gap-y-4 px-4 py-4 sm:gap-x-6 sm:px-8 lg:flex-nowrap lg:gap-x-8">
          <div className="mr-auto shrink-0 font-heading font-semibold lg:mr-0">
            {brand}
          </div>
          <nav
            aria-label="Main navigation"
            className="order-3 flex w-full items-center gap-2 border-t pt-3 lg:order-0 lg:w-auto lg:flex-1 lg:justify-center lg:border-0 lg:pt-0"
          >
            {nav}
          </nav>
          <div className="flex items-center gap-3">
            {serverControl}
            <ModeToggle />
          </div>
        </div>
      </header>
      <main
        ref={mainRef}
        tabIndex={-1}
        aria-label={title}
        className={cn(
          'mx-auto min-h-0 w-full max-w-5xl flex-1 overflow-y-auto px-4 py-8 outline-none sm:px-8',
          scroll === 'panel' && 'overflow-hidden',
          scroll === 'panel-lg' && 'lg:overflow-hidden',
        )}
      >
        {children}
      </main>
    </div>
  )
}
