import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
} from 'react'

import { useLocalStorage } from '@/hooks/use-local-storage'

export type Theme = 'dark' | 'light' | 'system'

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined,
)

const DARK_QUERY = '(prefers-color-scheme: dark)'

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'theme',
}: {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}) {
  const [theme, setTheme] = useLocalStorage<Theme>(storageKey, defaultTheme)

  useEffect(() => {
    const root = document.documentElement

    const apply = () => {
      const resolved =
        theme === 'system'
          ? window.matchMedia(DARK_QUERY).matches
            ? 'dark'
            : 'light'
          : theme
      root.classList.remove('light', 'dark')
      root.classList.add(resolved)
    }

    apply()
    if (theme !== 'system') return

    // Following the OS means following it while the app is open, not only at mount.
    const media = window.matchMedia(DARK_QUERY)
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme])

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider')

  return context
}
