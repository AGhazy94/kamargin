import { AppProvider } from '@/app/provider'
import { HomeRoute } from '@/app/routes/home'

export function App() {
  return (
    <AppProvider>
      <HomeRoute />
    </AppProvider>
  )
}
