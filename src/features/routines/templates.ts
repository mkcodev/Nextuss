// Plantilla de rutina «Mañana consciente» (#97 PR5b): la rutina sugerida para seguir a la
// Virtualización, con los 4 tipos de paso "de ritual" (agradecimientos, visualización, intención,
// tarea del día) más un primer paso simple libre (té, lectura...).
import type { RoutineStep } from '../../db/types'
import { createRoutine, type RoutineInput } from '../../db/repositories/routines'
import { DEFAULT_ROUTINE_ICON_KEY } from '../../design/icons'
import { ENTITY_COLORS } from '../../lib/colors'
import { DEFAULT_VISUALIZATION_PROMPT } from './routineStepKinds'

function step(title: string, durationMin: number, kind: RoutineStep['kind'], prompt?: string): RoutineStep {
  return { id: crypto.randomUUID(), title, durationMin, kind, prompt }
}

export const MORNING_TEMPLATE_NAME = 'Mañana consciente'

/** Ids de paso nuevos en cada llamada, para poder crear la plantilla más de una vez sin compartir
 * referencias entre rutinas distintas. */
export function morningTemplateSteps(): RoutineStep[] {
  return [
    step('Té, café o agua + un rato de lectura', 15, 'simple'),
    step('Agradecimientos', 3, 'gratitude'),
    step('Visualización', 3, 'visualization', DEFAULT_VISUALIZATION_PROMPT),
    step('Intención del día', 2, 'intention'),
    step('Tarea del día', 2, 'focusTask'),
  ]
}

/** Crea la rutina «Mañana consciente» ya lista para asignarse a `Settings.virtualizationRoutineId`. */
export function createMorningRoutine(): Promise<number> {
  const input: RoutineInput = {
    name: MORNING_TEMPLATE_NAME,
    icon: DEFAULT_ROUTINE_ICON_KEY,
    color: ENTITY_COLORS[4],
    steps: morningTemplateSteps(),
    startTime: undefined,
    weekdays: [],
  }
  return createRoutine(input)
}
