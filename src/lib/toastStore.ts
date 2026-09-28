import { create } from 'zustand'
import type { IconKey } from '../design/icons'

export interface Toast {
  id: number
  title: string
  description?: string
  icon?: IconKey
  variant?: 'default' | 'celebrate' | 'success' | 'warning' | 'error'
  /** Botón de acción del toast (p. ej. «Deshacer»); al pulsarlo se ejecuta y el toast se descarta. */
  action?: { label: string; onClick: () => void }
  /** No se auto-descarta — para toasts cuya acción el usuario debe poder ver hasta que actúe. */
  sticky?: boolean
}

interface ToastState {
  toasts: Toast[]
  push: (toast: Omit<Toast, 'id'>) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId++
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))
    if (!toast.sticky) {
      // Con acción dura más: da tiempo a leer y a pulsar «Deshacer».
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
      }, toast.action ? 7000 : 4000)
    }
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))
