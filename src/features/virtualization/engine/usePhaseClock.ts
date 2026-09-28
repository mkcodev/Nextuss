// Reloj de la fase actual, para usar DENTRO del Canvas de R3F: un ref que se acumula en cada frame
// (patrón imperativo estándar de R3F, sin re-renders de React) y se reinicia al cambiar de fase. Los
// 3 temas lo usan para alimentar `getBreathState`/`getScanRadius` sin duplicar reloj cada uno.
import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { PhaseId } from './phases'

export function usePhaseClock(phase: PhaseId) {
  const elapsedRef = useRef(0)
  useEffect(() => {
    elapsedRef.current = 0
  }, [phase])
  useFrame((_state, delta) => {
    elapsedRef.current += delta
  })
  return elapsedRef
}
