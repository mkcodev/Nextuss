import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { db } from '../db/schema'
import { updateSettings } from '../db/repositories/settings'
import type { ThemePreference } from '../db/types'
import { circularReveal, type Origin } from '../lib/viewTransition'

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolveTheme(theme: ThemePreference): 'light' | 'dark' {
  return theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : theme
}

function applyResolved(resolved: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', resolved)
  try {
    localStorage.setItem('nx-theme', resolved)
  } catch {
    // best-effort cache for the pre-paint inline script only
  }
}

/** Cambia el tema guardado. Si el tema visible cambia, se revela con un círculo desde `origin`
 *  (View Transition, con corte directo como respaldo). */
export function setThemePreference(next: ThemePreference, origin?: Origin) {
  const resolved = resolveTheme(next)
  if (document.documentElement.getAttribute('data-theme') !== resolved) {
    circularReveal(() => applyResolved(resolved), origin)
  }
  return updateSettings({ theme: next })
}

export function useTheme() {
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const theme: ThemePreference = settings?.theme ?? 'system'

  useEffect(() => {
    const apply = () => applyResolved(resolveTheme(theme))
    apply()
    if (theme !== 'system') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    mql.addEventListener('change', apply)
    return () => mql.removeEventListener('change', apply)
  }, [theme])

  const setTheme = (next: ThemePreference, origin?: Origin) => setThemePreference(next, origin)

  return { theme, setTheme }
}
