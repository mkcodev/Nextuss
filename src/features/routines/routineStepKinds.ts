// Constantes compartidas por tipo de paso (#97 PR5): formulario, reproductor y línea de tiempo leen
// de aquí para no repetir etiquetas/iconos/pregunta por defecto en cada sitio.
import type { RoutineStepKind } from '../../db/types'

export const ROUTINE_STEP_KIND_ORDER: RoutineStepKind[] = [
  'simple',
  'gratitude',
  'intention',
  'visualization',
  'focusTask',
]

export const ROUTINE_STEP_KIND_LABELS: Record<RoutineStepKind, string> = {
  simple: 'Simple',
  gratitude: 'Agradecimientos',
  intention: 'Intención del día',
  visualization: 'Visualización',
  focusTask: 'Tarea del día',
}

/** `undefined` = sin icono propio (paso 'simple', igual que antes de #97 PR5). */
export const ROUTINE_STEP_KIND_ICONS: Partial<Record<RoutineStepKind, string>> = {
  gratitude: 'heart',
  intention: 'compass',
  visualization: 'sparkles',
  focusTask: 'target',
}

export const DEFAULT_VISUALIZATION_PROMPT = '¿Cómo quieres sentirte al terminar el día de hoy?'
