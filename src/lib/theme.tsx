import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export interface ThemeDef {
  id: string
  name: string
  mode: 'light' | 'dark'
  swatch: string // primary colour preview
}

export const THEMES: ThemeDef[] = [
  { id: 'clinical-light', name: 'Clinical Light', mode: 'light', swatch: '#0d9488' },
  { id: 'clinical-dark', name: 'Clinical Dark', mode: 'dark', swatch: '#2dd4bf' },
  { id: 'ocean', name: 'Ocean', mode: 'light', swatch: '#0284c7' },
  { id: 'midnight', name: 'Midnight', mode: 'dark', swatch: '#818cf8' },
  { id: 'emerald', name: 'Emerald', mode: 'light', swatch: '#059669' },
  { id: 'contrast', name: 'High Contrast', mode: 'light', swatch: '#000000' },
]

const THEME_KEY = 'eqms.theme'

interface ThemeState {
  theme: string
  setTheme: (id: string) => void
  themes: ThemeDef[]
}

const ThemeCtx = createContext<ThemeState>(null as any)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<string>(
    () => localStorage.getItem(THEME_KEY) || 'clinical-light',
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  return (
    <ThemeCtx.Provider value={{ theme, setTheme: setThemeState, themes: THEMES }}>
      {children}
    </ThemeCtx.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeCtx)
}
