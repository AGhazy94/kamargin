import { AppShell } from '@/components/layouts/app-shell'
import { CraftProfitCalculator } from '@/features/craft-profit/craft-profit-calculator'

export function HomeRoute() {
  return (
    <AppShell>
      <CraftProfitCalculator />
    </AppShell>
  )
}
