import { HashRouter } from 'react-router'

import { AppProvider } from '@/app/provider'
import { AppRouter } from '@/app/router'

export function App() {
  return (
    <AppProvider>
      <HashRouter>
        <AppRouter />
      </HashRouter>
    </AppProvider>
  )
}
