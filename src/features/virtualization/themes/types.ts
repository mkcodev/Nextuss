import type { BreathPattern } from '../engine/breathCycle'
import type { PhaseId } from '../engine/phases'

/** Contrato común de los 3 temas: solo difieren en geometría/paleta/postprocesado — la física
 * (respiración, escaneo, tiempo de fase) vive en `engine/` y aquí solo se consume. */
export interface ThemeProps {
  phase: PhaseId
  breathPattern: BreathPattern
  reducedMotion: boolean
}
