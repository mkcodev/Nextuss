import { useCallback, useEffect, useRef, useState } from 'react'

/** Envuelve un `onSubmit` asíncrono para que no se ejecute dos veces a la vez (doble Enter o doble clic
 *  creaban dos tareas). Devuelve `pending` para mostrar el botón en estado "guardando". */
export function useSubmitGuard<A extends unknown[]>(fn: (...args: A) => unknown) {
  const [pending, setPending] = useState(false)
  const running = useRef(false)
  const fnRef = useRef(fn)
  useEffect(() => {
    fnRef.current = fn
  })

  const guarded = useCallback(async (...args: A) => {
    const first = args[0] as { preventDefault?: () => void } | undefined
    if (running.current) {
      first?.preventDefault?.()
      return
    }
    running.current = true
    setPending(true)
    try {
      await fnRef.current(...args)
    } finally {
      running.current = false
      setPending(false)
    }
  }, [])

  return [pending, guarded] as const
}
