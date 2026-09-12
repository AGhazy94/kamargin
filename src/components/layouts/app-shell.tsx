import type { ReactNode } from 'react'

import { ServerSelect } from '@/components/server-select'

export function AppShell({
  nav = null,
  children,
}: {
  nav?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-40 border-border border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 sm:px-6">
          <span className="font-heading font-semibold text-base tracking-tight">
            Dofus Market
          </span>
          <nav className="flex flex-1 items-center gap-1">{nav}</nav>
          <ServerSelect />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  )
}
