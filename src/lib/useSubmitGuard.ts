import { useCallback, useEffect, useRef, useState } from 'react'
import { useToastStore } from './toastStore'

/** Envuelve una acción asíncrona (guardar, crear en línea, archivar…) para que no se ejecute dos veces a
 *  la vez (doble Enter o doble clic creaban dos tareas) y para que un fallo se avise en vez de perderse.
 *  Devuelve `pending` para mostrar el botón en estado "guardando". */
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
    } catch (err) {
      // Antes un fallo de IndexedDB se tragaba en silencio y el diálogo se quedaba igual.
      console.error(err)
      useToastStore.getState().push({
        title: 'No se pudo guardar',
        description: 'Tus cambios siguen en el formulario. Inténtalo de nuevo.',
        variant: 'error',
      })
    } finally {
      running.current = false
      setPending(false)
    }
  }, [])

  return [pending, guarded] as const
}
