import { useCallback, useEffect, useRef, useState } from 'react'
import { useCelebrationEnabled } from '../../lib/useCelebrationEnabled'
import { markToday, unmarkToday } from './challengeActions'
import type { ChallengeItem } from './challengesData'

/** Lo que dura la celebración (700 ms) más un margen: pasado ese tiempo `playing` vuelve a `null`, así una
 *  fila que se monte después (cambiar de vista, por ejemplo) no la repite. */
const PLAYING_MS = 900

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
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const toggleToday = useCallback(
    async (item: Pick<ChallengeItem, 'challenge' | 'summary'>): Promise<void> => {
      const { id, title } = item.challenge
      if (item.summary.todayState === 'done') {
        await unmarkToday(id, title, today)
        return
      }
      const marked = await markToday(id, title, today)
      if (marked && enabled) {
        // Al marcar el último día el reto cambia de lista y su fila se vuelve a montar en «Terminados»
        // con la celebración en curso: por eso las filas usan `playOnMount`.
        setPlaying({ id, n: ++counter.current })
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setPlaying(null), PLAYING_MS)
      }
    },
    [enabled, today],
  )

  return { playing, toggleToday }
}

/** El valor de `play` de la fila `id`: cambia con cada celebración suya y es `null` para las demás. */
export const playFor = (playing: { id: number; n: number } | null, id: number): number | null => (playing?.id === id ? playing.n : null)
