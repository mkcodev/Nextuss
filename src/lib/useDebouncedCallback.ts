import { useEffect, useMemo, useRef } from 'react'

/** Devuelve una versión de `fn` que solo se dispara `delayMs` después de la última llamada — para no
 *  escribir en Dexie en cada pulsación (agradecimientos/intención del ritual, #97 PR5). `fn` siempre
 *  lee su versión más reciente, igual que `useSubmitGuard`. */
export function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, delayMs: number) {
  const fnRef = useRef(fn)
  useEffect(() => {
    fnRef.current = fn
  })
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  return useMemo(
    () =>
      (...args: A) => {
        clearTimeout(timer.current)
        timer.current = setTimeout(() => fnRef.current(...args), delayMs)
      },
    [delayMs],
  )
}
