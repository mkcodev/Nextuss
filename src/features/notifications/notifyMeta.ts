import type { Settings } from '../../db/types'

/** Única fuente de etiqueta/descripción de cada aviso `notify*` — la usan tanto `NotificationsSection`
 * (lista «Avisos por plugin») como la ficha de cada plugin (bloque «Avisos», vía su `settingsSpec`). */
export const NOTIFY_META: { key: keyof Settings; label: string; description: string }[] = [
  { key: 'notifyHabitReminders', label: 'Recordatorios de hábitos', description: 'A la hora configurada en cada hábito' },
  { key: 'notifyTaskStart', label: 'Inicio de bloques', description: 'Cuando empieza una tarea programada en el timeline' },
  { key: 'notifyTransitions', label: 'Transiciones', description: '5 min antes de un bloque y al acabarse su tiempo si sigue sin hacer' },
  { key: 'notifyMorningSummary', label: 'Resumen de la mañana', description: 'Tareas del día y objetivo North Star' },
  { key: 'notifyEveningSummary', label: 'Cierre del día', description: 'Cuántas tareas se completaron' },
  { key: 'notifyWeeklyReviewNudge', label: 'Revisión semanal', description: 'Empujón los lunes si no la has hecho' },
  { key: 'notifyZombieTasks', label: 'Tareas atascadas', description: 'Cuando se acumulan tareas sin mover' },
  { key: 'notifyPomodoroEnd', label: 'Fin de sesión de foco', description: 'Al terminar un pomodoro o un descanso' },
  { key: 'notifyRoutines', label: 'Rutinas', description: 'A la hora de cada rutina y al cambiar de paso con la pestaña en segundo plano' },
]
