import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { db } from '../db/schema'
import { updateSettings } from '../db/repositories/settings'
import type { ThemePreference } from '../db/types'

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function useTheme() {
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const theme: ThemePreference = settings?.theme ?? 'system'

  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const resolved = theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : theme
      root.setAttribute('data-theme', resolved)
      try {
        localStorage.setItem('nx-theme', resolved)
      } catch {
        // best-effort cache for the pre-paint inline script only
      }
    }
    apply()
    if (theme !== 'system') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    mql.addEventListener('change', apply)
    return () => mql.removeEventListener('change', apply)
  }, [theme])

  const setTheme = (next: ThemePreference) => updateSettings({ theme: next })

  return { theme, setTheme }
}
