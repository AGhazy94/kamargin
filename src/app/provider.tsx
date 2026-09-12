import type { ReactNode } from 'react'
import { Suspense } from 'react'

import { ErrorBoundary } from 'react-error-boundary'

import { MainErrorFallback } from '@/components/errors/main'
import { TooltipProvider } from '@/components/ui/tooltip'

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <ErrorBoundary FallbackComponent={MainErrorFallback}>
        <TooltipProvider>{children}</TooltipProvider>
      </ErrorBoundary>
    </Suspense>
  )
}
