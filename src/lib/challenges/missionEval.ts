// Misiones diarias (#191): cuánto llevas de una misión. Puro: el repositorio le pasa lo que haya en
// la base y esta función solo cuenta lo que cae en `date`, así que el límite de medianoche se
// decide aquí y se puede probar sin Dexie.
import { dateKey } from '../dates'
import { summarizeFocus } from '../../features/today/todayNumbersData'
import type { CheckIn, FocusSession, HabitLog, Task } from '../../db/types'
import type { MissionParams } from './missionCatalog'

export interface MissionSnapshot {
  /** Día (`YYYY-MM-DD`) al que se refiere el recuento. */
  date: string
  /** Tareas con `completedAt` cerca de `date`; esta función se queda con las de ese día local. */
  tasksCompleted: Pick<Task, 'status' | 'parentId' | 'priority' | 'completedAt'>[]
  focusSessions: Pick<FocusSession, 'start' | 'durationMin'>[]
  checkIn: Pick<CheckIn, 'energy' | 'mood' | 'focus'> | null
  habitLogs: Pick<HabitLog, 'habitId' | 'completed'>[]
}

/** Tareas raíz hechas el día `date`, como `countTasks` de «Tu día en números»: las subtareas no cuentan. */
function rootTasksDone(snapshot: MissionSnapshot) {
  return snapshot.tasksCompleted.filter(
    (t) => !t.parentId && t.status === 'done' && t.completedAt !== undefined && dateKey(new Date(t.completedAt)) === snapshot.date,
  )
}

/** Progreso de la misión, en la misma unidad que su `target`. */
export function evaluateMission(params: Pick<MissionParams, 'template' | 'refs'>, snapshot: MissionSnapshot): number {
  switch (params.template) {
    case 'tasks.complete-n':
      return rootTasksDone(snapshot).length
    case 'tasks.high-priority':
      // P1 es la prioridad más alta (`src/lib/priority.ts`).
      return rootTasksDone(snapshot).filter((t) => t.priority === 1).length
    case 'focus.minutes':
      // Una sesión cuenta en el día en que EMPIEZA, igual que las estadísticas.
      return summarizeFocus(snapshot.focusSessions as FocusSession[], snapshot.date).todayMin
    case 'checkin.answer': {
      const c = snapshot.checkIn
      return c && c.energy != null && c.mood != null && c.focus != null ? 1 : 0
    }
    case 'habits.all-today': {
      const done = new Set(snapshot.habitLogs.filter((l) => l.completed).map((l) => l.habitId))
      return (params.refs?.habitIds ?? []).filter((id) => done.has(id)).length
    }
  }
}
