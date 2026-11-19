import { useCallback, useRef, useState } from 'react'
import { useCelebrationEnabled } from '../../lib/useCelebrationEnabled'
import { markToday, unmarkToday } from './challengeActions'
import type { ChallengeItem } from './challengesData'

/** Alterna hoy (hecho ↔ no hecho) en un reto propio y lanza la microcelebración. Hermano de
 *  `useCelebratedToggle` (tareas): solo celebra la transición de «no hecho» a «hecho» que pide la
 *  persona con este `toggleToday` (clic o `x`). Deshacer desde el aviso o con Ctrl+Z, las misiones y
 *  cualquier cambio externo no pasan por aquí y no celebran. Con el ajuste `celebrationEnabled`
 *  apagado (o aún cargando) tampoco.
 *
 *  `playing` dice qué reto celebra ahora; cada fila pasa a `<Celebration play=…>` solo lo suyo. */
export function useCelebratedChallengeMark(today: string) {
  const enabled = useCelebrationEnabled()
  const [playing, setPlaying] = useState<{ id: number; n: number } | null>(null)
  const counter = useRef(0)

  const toggleToday = useCallback(
    async (item: Pick<ChallengeItem, 'challenge' | 'summary'>): Promise<void> => {
      const { id, title } = item.challenge
      if (item.summary.todayState === 'done') {
        await unmarkToday(id, title, today)
        return
      }
      const marked = await markToday(id, title, today)
      if (marked && enabled) setPlaying({ id, n: ++counter.current })
    },
    [enabled, today],
  )

  return { playing, toggleToday }
}

/** El valor de `play` de la fila `id`: cambia con cada celebración suya y es `null` para las demás. */
export const playFor = (playing: { id: number; n: number } | null, id: number): number | null => (playing?.id === id ? playing.n : null)
