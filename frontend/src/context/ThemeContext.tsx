import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type Theme = 'dark' | 'light'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('netra-theme')
      if (saved === 'light' || saved === 'dark') return saved
    } catch {
      // fallback
    }
    return 'dark'
  })

  useEffect(() => {
    try {
      localStorage.setItem('netra-theme', theme)
    } catch {
      // ignore
    }

    const root = document.documentElement
    const body = document.body

    if (theme === 'light') {
      root.classList.remove('dark')
      root.classList.add('light')
      body.classList.remove('dark')
      body.classList.add('light')
      root.style.colorScheme = 'light'
    } else {
      root.classList.remove('light')
      root.classList.add('dark')
      body.classList.remove('light')
      body.classList.add('dark')
      root.style.colorScheme = 'dark'
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
