import type { ComponentType } from 'react'
import type { VirtualizationTheme } from '../../../db/types'
import { ThemeA } from './ThemeA'
import { ThemeB } from './ThemeB'
import { ThemeC } from './ThemeC'
import type { ThemeProps } from './types'

export type { ThemeProps }

export interface ThemePalette {
  bg: string
  fg: string
  dim: string
  accent: string
  line: string
}

export interface ThemeBloom {
  intensity: number
  radius: number
  luminanceThreshold: number
}

export interface ThemeDef {
  Scene: ComponentType<ThemeProps>
  palette: ThemePalette
  bloom: ThemeBloom
}

// Paleta y bloom vistos por el orquestador (Virtualization.tsx); los colores de cada mesh dentro del
// propio Theme*.tsx son constantes locales — evita reexportar constantes junto al componente, que
// rompe el fast refresh (`react/only-export-components`).
export const THEMES: Record<VirtualizationTheme, ThemeDef> = {
  a: {
    Scene: ThemeA,
    palette: { bg: '#05080b', fg: '#eaf6ff', dim: '#5c7386', accent: '#4fd1ff', line: '#1c2b36' },
    bloom: { intensity: 0.7, radius: 0.5, luminanceThreshold: 0.25 },
  },
  b: {
    Scene: ThemeB,
    palette: { bg: '#0a0705', fg: '#fff1e6', dim: '#a68a72', accent: '#ffb37b', line: '#2a1f18' },
    bloom: { intensity: 1.15, radius: 0.8, luminanceThreshold: 0.1 },
  },
  c: {
    Scene: ThemeC,
    palette: { bg: '#040606', fg: '#d6ffe0', dim: '#4f8a63', accent: '#39ff8f', line: '#123322' },
    bloom: { intensity: 0.85, radius: 0.4, luminanceThreshold: 0.2 },
  },
}
