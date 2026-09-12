import type { ReactNode } from 'react'
import { Suspense } from 'react'

import { ErrorBoundary } from 'react-error-boundary'

import { MainErrorFallback } from '@/components/errors/main'

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <ErrorBoundary FallbackComponent={MainErrorFallback}>
        {children}
      </ErrorBoundary>
    </Suspense>
  )
}
