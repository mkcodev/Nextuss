// Textos de las misiones diarias para la interfaz. Los datos (`MissionParams`) no llevan etiquetas:
// la fuente y el progreso se redactan aquí.
import type { MissionParams, MissionSource } from './missionCatalog'

export const MISSION_SOURCE_LABEL: Record<MissionSource, string> = {
  tasks: 'Tareas',
  focus: 'Foco',
  checkin: 'Check-in',
  habits: 'Hábitos',
}

/** «3 de 5» (o «20 de 45 min» en las de foco). El progreso no pasa del objetivo: si haces 60 min de
 * una misión de 45, se lee «45 de 45 min». */
export function missionProgressText(params: Pick<MissionParams, 'template' | 'target' | 'progress'>): string {
  const done = Math.min(Math.max(0, Math.round(params.progress)), params.target)
  const unit = params.template === 'focus.minutes' ? ' min' : ''
  return `${done} de ${params.target}${unit}`
}

/** Fracción 0..1 para la barra. */
export function missionFraction(params: Pick<MissionParams, 'target' | 'progress'>): number {
  if (params.target <= 0) return 0
  return Math.min(1, Math.max(0, params.progress / params.target))
}
