import { useEffect } from 'react'
import { formatTime } from '../focus/format'
import { catchUpExpiredSteps } from './actions'
import { stepRemainingSec } from './player'
import { useRoutinePlayerStore } from './routinePlayerStore'

const DEFAULT_TITLE = document.title

/** true mientras una rutina corre: el motor de foco no debe devolver el título por defecto encima. */
export function isRoutineRunning(): boolean {
  const s = useRoutinePlayerStore.getState()
  return s.routineId != null && !s.finished && s.running
}

/** Motor del reproductor de rutinas, montado una vez en AppShell (igual que `useFocusTimerEngine`):
 * sigue pasando de paso aunque la pantalla completa esté minimizada o la pestaña en segundo plano. */
export function useRoutinePlayerEngine(): void {
  useEffect(() => {
    let wroteTitle = false
    const id = setInterval(() => {
      const s = useRoutinePlayerStore.getState()
      if (!isRoutineRunning()) {
        // Solo deshace su propio título; si hay un foco en marcha, su motor lo reescribe en su tick.
        if (wroteTitle) document.title = DEFAULT_TITLE
        wroteTitle = false
        return
      }
      const now = Date.now()
      const remaining = stepRemainingSec(s, now)
      document.title = `${formatTime(remaining)} · ${s.steps[s.index]?.title ?? s.name} — Nextuss`
      wroteTitle = true
      if (remaining <= 0) void catchUpExpiredSteps(now)
    }, 1000)
    return () => {
      clearInterval(id)
      if (wroteTitle) document.title = DEFAULT_TITLE
    }
  }, [])
}
