import type { ReactNode } from 'react'

import { ModeToggle } from '@/components/mode-toggle'
import { ServerSelect } from '@/components/server-select'

export function AppShell({
  nav = null,
  children,
}: {
  nav?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="z-40 shrink-0 border-border border-b bg-background">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:gap-6 sm:px-8">
          <span className="shrink-0 whitespace-nowrap font-heading font-semibold text-lg tracking-tight">
            Dofus Market
          </span>
          <nav className="flex flex-1 items-center gap-1">{nav}</nav>
          <ServerSelect />
          <ModeToggle />
        </div>
      </header>
      {/* Panels own their scrolling from lg up; below it the page scrolls as one. */}
      <main className="mx-auto min-h-0 w-full max-w-5xl flex-1 overflow-y-auto px-4 py-10 sm:px-8 lg:overflow-hidden">
        {children}
      </main>
    </div>
  )
}
