// Recharts necesita colores como strings, pero el tema de la app vive en CSS vars (`--nx-accent`,
// etc.) y puede cambiar sin recargar (toggle de tema, `prefers-color-scheme`). Ningún gráfico debe
// llevar un hex a pelo — rompería el modo oscuro.
import { useEffect, useState } from 'react'

export interface ChartTheme {
  accent: string
  accentStrong: string
  success: string
  warning: string
  danger: string
  grid: string
  text: string
  textFaint: string
  surface: string
}

const VARS: Record<keyof ChartTheme, string> = {
  accent: '--nx-accent',
  accentStrong: '--nx-accent-strong',
  success: '--nx-success',
  warning: '--nx-warning',
  danger: '--nx-danger',
  grid: '--nx-border',
  text: '--nx-text',
  textFaint: '--nx-text-faint',
  surface: '--nx-surface',
}

const FALLBACK: ChartTheme = {
  accent: '#7c84e8',
  accentStrong: '#9097ee',
  success: '#4cc38a',
  warning: '#f0a25e',
  danger: '#f07470',
  grid: '#26262c',
  text: '#e7e7eb',
  textFaint: '#8b8b96',
  surface: '#131316',
}

function readTheme(): ChartTheme {
  if (typeof document === 'undefined') return FALLBACK
  const styles = getComputedStyle(document.documentElement)
  const theme = { ...FALLBACK }
  for (const key of Object.keys(VARS) as (keyof ChartTheme)[]) {
    const value = styles.getPropertyValue(VARS[key]).trim()
    if (value) theme[key] = value
  }
  return theme
}

export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(readTheme)

  useEffect(() => {
    const update = () => setTheme(readTheme())
    update()

    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', update)

    return () => {
      observer.disconnect()
      media.removeEventListener('change', update)
    }
  }, [])

  return theme
}
