import { useCallback, useState } from 'react'
import type { Task } from '../../db/types'
import { useCelebrationEnabled } from '../../lib/useCelebrationEnabled'
import { toggleTaskDoneWithFeedback } from './actions'

/** Completar una tarea desde la UI y, si toca, lanzar la microcelebración (`<Celebration play={play}>`).
 *  Solo celebra la transición de «no hecha» a «hecha» que pide la persona con este `toggle`: deshacer
 *  (desde el aviso o volviendo a pulsar), importar, cargar o sincronizar no pasan por aquí y no
 *  celebran. Si el ajuste `celebrationEnabled` está apagado (o aún cargando), tampoco. */
export function useCelebratedToggle() {
  const enabled = useCelebrationEnabled()
  const [play, setPlay] = useState<number | null>(null)

  const toggle = useCallback(
    async (task: Pick<Task, 'id' | 'title' | 'status'>) => {
      const wasDone = task.status === 'done'
      const result = await toggleTaskDoneWithFeedback(task.id!, task.title)
      if (!wasDone && result.done && enabled) setPlay((n) => (n ?? 0) + 1)
      return result
    },
    [enabled],
  )

  return { play, toggle }
}
