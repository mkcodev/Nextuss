// Acciones del reproductor con efectos: registrar la pasada, sonar y avisar al cambiar de paso. El
// estado vive en `routinePlayerStore`; aquí va todo lo que toca Dexie, audio o notificaciones.
import { getOrCreateSettings } from '../../db/repositories/settings'
import { readSetting } from '../../db/settingsDefaults'
import { logRoutineRun } from '../../db/repositories/routines'
import type { Routine } from '../../db/types'
import { dateKey } from '../../lib/dates'
import { playChime } from '../focus/chime'
import { sendNotification } from '../notifications/notify'
import { routineStepNotification } from '../notifications/rules'
import { stepPlannedSec, stepRemainingSec } from './player'
import { useRoutinePlayerStore } from './routinePlayerStore'
import { emit } from '../../lib/events/bus'

/** Guarda la pasada en curso: terminada siempre; abandonada, solo si se hizo al menos un paso
 * (salir al segundo 3 no es una pasada). */
async function saveRun(): Promise<void> {
  const s = useRoutinePlayerStore.getState()
  if (s.routineId == null || (!s.finished && s.completedSteps === 0)) return
  const date = dateKey(new Date(s.runStartedAt))
  await logRoutineRun({
    routineId: s.routineId,
    date,
    startedAt: s.runStartedAt,
    finishedAt: Date.now(),
    completedSteps: s.completedSteps,
    totalSteps: s.steps.length,
    finished: s.finished,
  })
  emit('routine.finished', { routineId: s.routineId, date, finished: s.finished })
}

/** Empieza `routine` a pantalla completa. Si ya iba otra, se guarda lo hecho de esa antes de cambiar;
 * si es la misma, solo se vuelve a mostrar. */
export async function startRoutine(routine: Routine): Promise<void> {
  const s = useRoutinePlayerStore.getState()
  if (s.routineId != null && s.routineId === routine.id && !s.finished) {
    s.setVisible(true)
    return
  }
  if (s.routineId != null && !s.finished) await saveRun()
  if (routine.steps.length === 0) return
  useRoutinePlayerStore.getState().begin(routine)
}

/** Tras pasar de paso: suena y, con la pestaña oculta, avisa (con la pantalla completa delante, el
 * sonido basta). Si era el último, guarda la pasada. */
async function afterAdvance(): Promise<void> {
  const s = useRoutinePlayerStore.getState()
  const settings = await getOrCreateSettings()
  if (readSetting(settings, 'routineSoundEnabled')) playChime()
  if (typeof document !== 'undefined' && document.hidden) {
    const next = s.finished ? null : s.steps[s.index]
    const pending = routineStepNotification({
      settings,
      runKey: s.runStartedAt,
      stepIndex: s.index,
      routineName: s.name,
      nextStep: next ? { title: next.title, durationMin: Math.round(next.durationSec / 60) } : null,
    })
    if (pending) void sendNotification(pending, settings)
  }
  if (s.finished) await saveRun()
}

/** "Hecho" (`completed`) o "Saltar" desde el reproductor. */
export async function advanceStep(completed: boolean): Promise<void> {
  const s = useRoutinePlayerStore.getState()
  if (s.routineId == null || s.finished) return
  s.advance(completed)
  await afterAdvance()
}

/** Pasa todos los pasos cuyo tiempo ya se agotó, cada uno en el instante exacto en que acabó. Tras
 * suspender el portátil 10 min no suena diez veces ni deja horas de inicio falsas: se pone al día de
 * golpe y avisa una vez. Lo llama el motor en cada tick.
 *
 * Un paso con tipo (#97 PR5: agradecimientos/intención/visualización/tarea del día) nunca se
 * auto-avanza aquí aunque su tiempo se agote — se queda "en negativo" esperando a que el usuario
 * pulse Hecho, para no perder lo que esté escribiendo o descartar el paso sin que responda. */
export async function catchUpExpiredSteps(now: number = Date.now()): Promise<void> {
  let advanced = false
  for (;;) {
    const s = useRoutinePlayerStore.getState()
    if (s.routineId == null || s.finished || !s.running || s.startedAt == null) break
    if (stepRemainingSec(s, now) > 0) break
    const kind = s.steps[s.index]?.kind
    if (kind && kind !== 'simple') break
    const endedAt = s.startedAt + (stepPlannedSec(s) - s.accumulatedSec) * 1000
    s.advance(true, Math.min(endedAt, now))
    advanced = true
  }
  if (advanced) await afterAdvance()
}

/** Sale del reproductor. Una rutina a medias guarda lo que se llegó a hacer; una terminada ya se guardó. */
export async function exitRoutine(): Promise<void> {
  const s = useRoutinePlayerStore.getState()
  if (s.routineId != null && !s.finished) await saveRun()
  useRoutinePlayerStore.getState().reset()
}
