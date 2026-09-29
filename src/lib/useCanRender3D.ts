import { useMemo } from 'react'
import { useReducedMotion } from './useReducedMotion'

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

/** WebGL real y sin `prefers-reduced-motion` — condición para montar una escena three.js/R3F decorativa
 * (no crítica para usar la app) en vez de caer a una alternativa sin 3D. Usado por `ConstellationMap3D`
 * para caer a `ConstellationMap2D`. */
export function useCanRender3D(): boolean {
  const reducedMotion = useReducedMotion()
  const supported = useMemo(() => hasWebGL(), [])
  return supported && !reducedMotion
}
