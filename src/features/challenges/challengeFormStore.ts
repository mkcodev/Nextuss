import { create } from 'zustand'

/** Lo que rellena el formulario al abrirlo (una plantilla). Sin definir = vacío. */
export interface ChallengeFormPrefill {
  text: string
  days?: number
  shields?: number
}

interface ChallengeFormState {
  open: boolean
  prefill?: ChallengeFormPrefill
  /** Sube en cada apertura: el formulario se vuelve a montar con estado limpio aunque se abra dos veces seguidas. */
  nonce: number
  /** Se pone a `true` la primera vez que se abre: `AppShell` solo carga el formulario (import diferido)
   *  entonces, y lo mantiene montado para que el diálogo pueda animar su salida. */
  everOpened: boolean
  openCreate: (prefill?: ChallengeFormPrefill) => void
  close: () => void
}

/** Única instancia global del diálogo «Nuevo reto», abrible desde cualquier sitio: la página de retos,
 *  la tecla `c` y la paleta de comandos (mismo patrón que `habitFormStore`). */
export const useChallengeFormStore = create<ChallengeFormState>((set) => ({
  open: false,
  prefill: undefined,
  nonce: 0,
  everOpened: false,
  openCreate: (prefill) => set((s) => ({ open: true, prefill, nonce: s.nonce + 1, everOpened: true })),
  close: () => set({ open: false }),
}))
