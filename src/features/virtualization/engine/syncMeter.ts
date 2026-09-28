// Medidor de Sincronización de la fase Presencia. Puro: sube en escalones, uno por cada ciclo de
// respiración COMPLETO (no de forma continua con el tiempo) — así el usuario nota literalmente el
// progreso al final de cada "Inspira-Sostén-Suelta-Sostén", no un contador que sube solo.
export function getSyncPercent(elapsedSec: number, cycleDurationSec: number, targetDurationSec: number): number {
  if (cycleDurationSec <= 0 || targetDurationSec <= 0) return 0
  // Al menos 1 ciclo hace falta para llegar al 100%, aunque la duración objetivo sea más corta que
  // un ciclo entero (patrones largos como 4-7-8 con una meta de sesión muy breve).
  const totalCycles = Math.max(1, Math.round(targetDurationSec / cycleDurationSec))
  const completedCycles = Math.max(0, Math.floor(elapsedSec / cycleDurationSec))
  return Math.min(100, Math.round((completedCycles / totalCycles) * 100))
}
