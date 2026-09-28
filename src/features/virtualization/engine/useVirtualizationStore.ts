// Estado de la sesión de Virtualización en curso: persistido en localStorage (patrón
// `routinePlayerStore.ts`) para poder retomar tras recargar o tras Esc. El resultado final del día
// (racha, XP) se guarda en Dexie (`virtualizationDays`, #97 PR2) — esto es solo "en qué fase estoy y
// desde cuándo", nunca el histórico.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PHASES, type PhaseId } from './phases'

interface VirtualizationSessionState {
  /** false = la Cabina no ha pedido turno; no hay sesión en curso. */
  active: boolean
  phase: PhaseId
  phaseStartedAt: number
  /** 0-100, solo tiene sentido durante 'presencia'. */
  syncPercent: number
  open: () => void
  setPhase: (next: PhaseId, now?: number) => void
  setSyncPercent: (pct: number) => void
  close: () => void
}

const EMPTY = {
  active: false,
  phase: PHASES[0],
  phaseStartedAt: 0,
  syncPercent: 0,
} satisfies Partial<VirtualizationSessionState>

export const useVirtualizationStore = create<VirtualizationSessionState>()(
  persist(
    (set) => ({
      ...EMPTY,
      open: () => set({ active: true, phase: 'cabina', phaseStartedAt: Date.now(), syncPercent: 0 }),
      setPhase: (next, now = Date.now()) => set({ phase: next, phaseStartedAt: now, ...(next === 'presencia' ? { syncPercent: 0 } : {}) }),
      setSyncPercent: (pct) => set({ syncPercent: Math.max(0, Math.min(100, pct)) }),
      close: () => set(EMPTY),
    }),
    { name: 'nextuss-virtualization-session' },
  ),
)

/** Segundos transcurridos en la fase actual — base de tiempo de `useBreathCycle`/`useScanPulse`. */
export function usePhaseElapsedSec(nowMs: number): number {
  const startedAt = useVirtualizationStore((s) => s.phaseStartedAt)
  return Math.max(0, (nowMs - startedAt) / 1000)
}

// Ayuda de desarrollo para abrir la Cabina desde la consola sin esperar al lanzador integrado
// (patrón `window.__nextussEvents` de `lib/events/bus.ts`).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __nextussVirtualization: () => void }).__nextussVirtualization = () => useVirtualizationStore.getState().open()
}
