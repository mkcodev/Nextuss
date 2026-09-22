import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getOrCreateSettings } from '../../db/repositories/settings'
import { sendNotification } from '../notifications/notify'
import { pomodoroEndNotification } from '../notifications/rules'
import { nextFocusMode, type FocusMode } from './cycle'
import { durationsFromSettings } from './durations'
import { elapsedSeconds, useFocusTimerStore } from './focusTimerStore'
import { formatTime } from './format'
import { playChime } from './chime'
import { logWorkSegmentIfSignificant } from './logSegment'

const MODE_LABEL: Record<FocusMode, string> = { work: 'Foco', break: 'Descanso', longBreak: 'Descanso largo' }
const DEFAULT_TITLE = document.title

async function finishSegment(durations: Record<FocusMode, number>): Promise<void> {
  const s = useFocusTimerStore.getState()
  if (s.mode === 'work') {
    await logWorkSegmentIfSignificant(s.plannedSec, s.taskId, s.interruptions)
  }

  const settings = await getOrCreateSettings()
  const pending = pomodoroEndNotification({ now: new Date(), settings, mode: s.mode === 'work' ? 'work' : 'break' })
  if (pending) void sendNotification(pending, settings)
  if (settings.pomodoroSoundEnabled) playChime()

  const next = nextFocusMode({ mode: s.mode, cyclesCompleted: s.cyclesCompleted })
  useFocusTimerStore.getState().goToMode(next.mode, durations[next.mode], next.cyclesCompleted)
}

/** Motor único del pomodoro, montado una vez en AppShell — vive fuera de `FocusPanel` para que el
 * ciclo siga avanzando (y el título de la pestaña se actualice) aunque el usuario esté en otra
 * pestaña del dock. Un solo `setInterval` de 1s que recalcula tiempo real, nunca cuenta ticks. */
export function useFocusTimerEngine(): void {
  const settings = useLiveQuery(() => getOrCreateSettings(), [])
  const durations = durationsFromSettings(settings)

  useEffect(() => {
    const id = setInterval(() => {
      const s = useFocusTimerStore.getState()
      if (s.running) {
        document.title = `${formatTime(Math.max(0, s.plannedSec - elapsedSeconds(s)))} · ${MODE_LABEL[s.mode]} — Nexus`
        if (elapsedSeconds(s) >= s.plannedSec) void finishSegment(durations)
      } else if (document.title !== DEFAULT_TITLE) {
        document.title = DEFAULT_TITLE
      }
    }, 1000)
    return () => {
      clearInterval(id)
      document.title = DEFAULT_TITLE
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durations.work, durations.break, durations.longBreak])
}
