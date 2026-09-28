// Fases del ritual de Virtualización (#97). Puro: sin THREE ni React, para poder testear la máquina
// de estados y compartirla entre el store de sesión y los 3 temas visuales.
export const PHASES = ['cabina', 'transmision', 'escaneo', 'presencia', 'virtualizacion'] as const

export type PhaseId = (typeof PHASES)[number]

export const PHASE_LABELS: Record<PhaseId, string> = {
  cabina: 'Cabina',
  transmision: 'Transmisión',
  escaneo: 'Escaneo',
  presencia: 'Presencia',
  virtualizacion: 'Virtualización',
}

export function nextPhase(phase: PhaseId): PhaseId | null {
  const i = PHASES.indexOf(phase)
  return i < 0 || i === PHASES.length - 1 ? null : PHASES[i + 1]
}
